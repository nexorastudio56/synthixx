import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_ROLES = ["SCHOOL_ADMIN", "SUPER_ADMIN"];
const VALID_ROLES = ["SCHOOL_ADMIN", "SUPER_ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"];

type Svc = ReturnType<typeof createServiceClient>;

/** Returns { svc, schoolId, userId } if the caller is an admin, else a Response. */
async function requireAdmin(): Promise<
  | { svc: Svc; schoolId: string; userId: string }
  | Response
> {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });
  const svc = createServiceClient();
  const { data } = await svc
    .from("school_users")
    .select("school_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!data) return Response.json({ error: "No school" }, { status: 403 });
  if (!ADMIN_ROLES.includes(data.role as string))
    return Response.json({ error: "Admins only" }, { status: 403 });
  return { svc, schoolId: data.school_id as string, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const { svc, schoolId } = auth;

  const [members, invites] = await Promise.all([
    svc.from("school_users").select("id, user_id, email, role, student_id, created_at").eq("school_id", schoolId).order("created_at"),
    svc.from("school_invites").select("id, email, role, student_id, status, created_at").eq("school_id", schoolId).eq("status", "pending").order("created_at"),
  ]);

  return Response.json({ members: members.data ?? [], invites: invites.data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const { svc, schoolId } = auth;

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const role = String(body?.role ?? "TEACHER");
  const studentId = body?.studentId ? String(body.studentId) : null;
  if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
  if (!VALID_ROLES.includes(role)) return Response.json({ error: "Invalid role" }, { status: 400 });

  // Already a member?
  const { data: existing } = await svc
    .from("school_users")
    .select("id")
    .eq("school_id", schoolId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (existing) return Response.json({ error: "This person is already a member." }, { status: 409 });

  // Upsert a pending invite for this email.
  const { data: pending } = await svc
    .from("school_invites")
    .select("id")
    .eq("school_id", schoolId)
    .ilike("email", email)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pending) {
    await svc.from("school_invites").update({ role, student_id: studentId }).eq("id", pending.id);
  } else {
    const { error } = await svc.from("school_invites").insert({ school_id: schoolId, email, role, student_id: studentId });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const { svc, schoolId, userId } = auth;

  const body = await request.json().catch(() => null);
  const memberId = String(body?.memberId ?? "");
  const role = String(body?.role ?? "");
  if (!memberId || !VALID_ROLES.includes(role))
    return Response.json({ error: "memberId and a valid role are required" }, { status: 400 });

  // Don't let an admin demote themselves (avoid locking out).
  const { data: target } = await svc.from("school_users").select("user_id, role").eq("id", memberId).eq("school_id", schoolId).maybeSingle();
  if (!target) return Response.json({ error: "Member not found" }, { status: 404 });
  if (target.user_id === userId && !ADMIN_ROLES.includes(role))
    return Response.json({ error: "You can't remove your own admin access." }, { status: 400 });

  const { error } = await svc.from("school_users").update({ role }).eq("id", memberId).eq("school_id", schoolId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const { svc, schoolId, userId } = auth;

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const inviteId = searchParams.get("inviteId");

  if (inviteId) {
    await svc.from("school_invites").delete().eq("id", inviteId).eq("school_id", schoolId);
    return Response.json({ ok: true });
  }
  if (memberId) {
    const { data: target } = await svc.from("school_users").select("user_id").eq("id", memberId).eq("school_id", schoolId).maybeSingle();
    if (target?.user_id === userId) return Response.json({ error: "You can't remove yourself." }, { status: 400 });
    await svc.from("school_users").delete().eq("id", memberId).eq("school_id", schoolId);
    return Response.json({ ok: true });
  }
  return Response.json({ error: "memberId or inviteId required" }, { status: 400 });
}
