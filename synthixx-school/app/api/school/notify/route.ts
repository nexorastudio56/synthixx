import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { configuredChannels, sendMany, sendEmail, sendWhatsApp, sendSMS } from "@/lib/school/notify-send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  return Response.json({ configured: configuredChannels() });
}

type Svc = ReturnType<typeof createServiceClient>;

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const svc = createServiceClient();
  const { data: member } = await svc
    .from("school_users")
    .select("school_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!member) return Response.json({ error: "No school" }, { status: 403 });
  const schoolId = member.school_id as string;

  const body = await request.json().catch(() => null);
  const type = String(body?.type ?? "Announcement");
  const recipientType = String(body?.recipientType ?? "all_parents");
  const klass = body?.class ? String(body.class) : null;
  const message = String(body?.message ?? "").slice(0, 4000);
  const channels: string[] = Array.isArray(body?.channels) ? body.channels : ["in_app"];
  if (!message.trim()) return Response.json({ error: "Message is required" }, { status: 400 });

  const { phones, emails } = await resolveRecipients(svc, schoolId, recipientType, klass);
  const cfg = configuredChannels();
  const results: Record<string, { sent: number; failed: number; skipped?: string }> = {};

  if (channels.includes("whatsapp")) {
    if (!cfg.whatsapp) results.whatsapp = { sent: 0, failed: 0, skipped: "WhatsApp not configured" };
    else results.whatsapp = await sendMany(phones, (to) => sendWhatsApp(to, message));
  }
  if (channels.includes("sms")) {
    if (!cfg.sms) results.sms = { sent: 0, failed: 0, skipped: "SMS not configured" };
    else results.sms = await sendMany(phones, (to) => sendSMS(to, message));
  }
  if (channels.includes("email")) {
    if (!cfg.email) results.email = { sent: 0, failed: 0, skipped: "Email not configured" };
    else results.email = await sendMany(emails, (to) => sendEmail(to, type, message));
  }

  const totalSent = Object.values(results).reduce((s, r) => s + r.sent, 0);
  const liveChannels = channels.filter((c) => c !== "in_app");
  const status = liveChannels.length === 0 ? "sent" : totalSent > 0 ? "sent" : "failed";
  const channelLabel = channels.join(",");

  const { data: logRow } = await svc
    .from("notifications")
    .insert({ school_id: schoolId, type, message, recipient_type: recipientType, channel: channelLabel, status })
    .select()
    .single();

  return Response.json({
    ok: true,
    log: logRow,
    audience: { phones: phones.length, emails: emails.length },
    results,
  });
}

async function resolveRecipients(svc: Svc, schoolId: string, recipientType: string, klass: string | null) {
  const phones = new Set<string>();
  const emails = new Set<string>();

  if (recipientType === "all_staff") {
    const [{ data: teachers }, { data: members }] = await Promise.all([
      svc.from("teachers").select("phone").eq("school_id", schoolId),
      svc.from("school_users").select("email, role").eq("school_id", schoolId),
    ]);
    for (const t of (teachers ?? []) as { phone: string | null }[]) if (t.phone) phones.add(t.phone);
    for (const m of (members ?? []) as { email: string | null; role: string }[])
      if (m.email && m.role !== "PARENT") emails.add(m.email);
  } else {
    // Parents (all or by class).
    let q = svc.from("students").select("parent_phone, class, status").eq("school_id", schoolId);
    if (recipientType === "specific_class" && klass) q = q.eq("class", klass);
    const { data: students } = await q;
    for (const s of (students ?? []) as { parent_phone: string | null; status: string }[])
      if (s.parent_phone && s.status === "active") phones.add(s.parent_phone);
    // Parent emails come from linked parent accounts.
    const { data: members } = await svc.from("school_users").select("email, role").eq("school_id", schoolId).eq("role", "PARENT");
    for (const m of (members ?? []) as { email: string | null }[]) if (m.email) emails.add(m.email);
  }

  return { phones: [...phones], emails: [...emails] };
}
