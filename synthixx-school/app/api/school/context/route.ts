import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Resolve the caller's school context (schoolId, role, ...). Runs server-side
 * with the service role so it's reliable regardless of browser session quirks,
 * and redeems any pending invite for the user's email into a membership.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const svc = createServiceClient();

  const empty = {
    userId: user.id,
    email: user.email ?? null,
    schoolId: null as string | null,
    schoolName: null as string | null,
    logoUrl: null as string | null,
    letterhead: null as string | null,
    role: null as string | null,
    studentId: null as string | null,
    institutionType: "school" as string,
    terminology: {} as Record<string, string>,
  };

  async function membership() {
    const { data } = await svc
      .from("school_users")
      .select(
        "school_id, role, student_id, schools(name, logo_url, letterhead, institution_type, terminology)",
      )
      .eq("user_id", user!.id)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    type S = {
      name?: string;
      logo_url?: string | null;
      letterhead?: string | null;
      institution_type?: string | null;
      terminology?: Record<string, string> | null;
    };
    const raw = data.schools as S | S[] | null;
    const school = Array.isArray(raw) ? raw[0] ?? null : raw;
    return {
      userId: user!.id,
      email: user!.email ?? null,
      schoolId: data.school_id as string,
      schoolName: school?.name ?? null,
      logoUrl: school?.logo_url ?? null,
      letterhead: school?.letterhead ?? null,
      role: data.role as string,
      studentId: (data.student_id as string) ?? null,
      institutionType: school?.institution_type ?? "school",
      terminology: school?.terminology ?? {},
    };
  }

  let ctx = await membership();
  if (ctx) return Response.json(ctx);

  // No membership yet — try to redeem a pending invite for this email.
  if (user.email) {
    const { data: invite } = await svc
      .from("school_invites")
      .select("*")
      .ilike("email", user.email)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();
    if (invite) {
      await svc.from("school_users").insert({
        school_id: invite.school_id,
        user_id: user.id,
        email: user.email,
        role: invite.role,
        student_id: invite.student_id,
      });
      await svc.from("school_invites").update({ status: "accepted" }).eq("id", invite.id);
      ctx = await membership();
      if (ctx) return Response.json(ctx);
    }
  }

  return Response.json(empty);
}
