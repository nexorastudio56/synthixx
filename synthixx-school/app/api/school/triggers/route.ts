import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { configuredChannels, sendMany, sendWhatsApp, sendSMS } from "@/lib/school/notify-send";

export const runtime = "nodejs";
export const maxDuration = 60;

type Svc = ReturnType<typeof createServiceClient>;

/**
 * Runs auto-trigger reminders (fee due, absent streak). Two modes:
 *  - Cron: send header `x-cron-secret: <CRON_SECRET>` to process ALL schools.
 *  - App: a logged-in member runs it for their own school.
 */
export async function POST(request: NextRequest) {
  const svc = createServiceClient();
  const cronSecret = process.env.CRON_SECRET || "";
  const isCron = cronSecret && request.headers.get("x-cron-secret") === cronSecret;

  let schoolIds: string[] = [];
  if (isCron) {
    const { data } = await svc.from("schools").select("id");
    schoolIds = (data ?? []).map((s) => s.id as string);
  } else {
    const user = await getUser();
    if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
    const { data: member } = await svc.from("school_users").select("school_id, role").eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return Response.json({ error: "No school" }, { status: 403 });
    schoolIds = [member.school_id as string];
  }

  const body = await request.json().catch(() => ({}));
  const which = {
    feeDue: body?.feeDue !== false,
    absent: body?.absent !== false,
  };

  const cfg = configuredChannels();
  const sendOne = async (to: string, text: string) => {
    if (cfg.whatsapp) return sendWhatsApp(to, text);
    if (cfg.sms) return sendSMS(to, text);
    return false; // nothing configured → counts as "would send"
  };

  const summary: Record<string, { feeReminders: number; absentAlerts: number; delivered: number }> = {};

  for (const schoolId of schoolIds) {
    const result = { feeReminders: 0, absentAlerts: 0, delivered: 0 };

    if (which.feeDue) {
      const reminders = await feeReminders(svc, schoolId);
      result.feeReminders = reminders.length;
      const r = await sendMany(reminders.map((x) => x.phone), async (phone) => {
        const msg = reminders.find((x) => x.phone === phone)!.message;
        return sendOne(phone, msg);
      });
      result.delivered += r.sent;
    }

    if (which.absent) {
      const alerts = await absentAlerts(svc, schoolId);
      result.absentAlerts = alerts.length;
      const r = await sendMany(alerts.map((x) => x.phone), async (phone) => {
        const msg = alerts.find((x) => x.phone === phone)!.message;
        return sendOne(phone, msg);
      });
      result.delivered += r.sent;
    }

    const total = result.feeReminders + result.absentAlerts;
    if (total > 0) {
      await svc.from("notifications").insert({
        school_id: schoolId,
        type: "Auto reminder",
        message: `Auto-triggers run: ${result.feeReminders} fee reminders, ${result.absentAlerts} absent alerts.`,
        recipient_type: "all_parents",
        channel: cfg.whatsapp ? "whatsapp" : cfg.sms ? "sms" : "in_app",
        status: result.delivered > 0 || !(cfg.whatsapp || cfg.sms) ? "sent" : "failed",
      });
    }
    summary[schoolId] = result;
  }

  return Response.json({ ok: true, configured: cfg, summary });
}

async function feeReminders(svc: Svc, schoolId: string) {
  const [{ data: fees }, { data: students }] = await Promise.all([
    svc.from("fees").select("student_id, amount, status").eq("school_id", schoolId).neq("status", "paid"),
    svc.from("students").select("id, name, parent_phone, status").eq("school_id", schoolId),
  ]);
  const sMap = new Map((students ?? []).map((s) => [s.id as string, s as { name: string; parent_phone: string | null; status: string }]));
  const due = new Map<string, number>();
  for (const f of (fees ?? []) as { student_id: string | null; amount: number }[]) {
    if (!f.student_id) continue;
    due.set(f.student_id, (due.get(f.student_id) ?? 0) + (Number(f.amount) || 0));
  }
  const out: { phone: string; message: string }[] = [];
  for (const [id, amount] of due) {
    const s = sMap.get(id);
    if (!s || s.status !== "active" || !s.parent_phone) continue;
    out.push({ phone: s.parent_phone, message: `Dear Parent, the fee of Rs. ${amount.toLocaleString()} for ${s.name} is pending. Please clear it at your earliest. Thank you.` });
  }
  return out;
}

async function absentAlerts(svc: Svc, schoolId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 4);
  const [{ data: att }, { data: students }] = await Promise.all([
    svc.from("attendance").select("student_id, status, date").eq("school_id", schoolId).gte("date", since.toISOString().slice(0, 10)),
    svc.from("students").select("id, name, parent_phone, status").eq("school_id", schoolId),
  ]);
  const sMap = new Map((students ?? []).map((s) => [s.id as string, s as { name: string; parent_phone: string | null; status: string }]));
  const byStudent = new Map<string, { date: string; status: string }[]>();
  for (const a of (att ?? []) as { student_id: string | null; status: string; date: string }[]) {
    if (!a.student_id) continue;
    const arr = byStudent.get(a.student_id) ?? [];
    arr.push({ date: a.date, status: a.status });
    byStudent.set(a.student_id, arr);
  }
  const out: { phone: string; message: string }[] = [];
  for (const [id, rows] of byStudent) {
    const recent = rows.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 3);
    if (recent.length >= 3 && recent.every((r) => r.status === "absent")) {
      const s = sMap.get(id);
      if (!s || s.status !== "active" || !s.parent_phone) continue;
      out.push({ phone: s.parent_phone, message: `Dear Parent, ${s.name} has been absent for 3 consecutive days. Please ensure regular attendance or contact the school.` });
    }
  }
  return out;
}
