import { type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Bootstrap a new school. Runs server-side with the service role so the very
 * first insert (before any membership exists) isn't blocked by RLS. The caller
 * is still authenticated via cookies, and becomes the school's SCHOOL_ADMIN.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return Response.json({ error: "School name is required" }, { status: 400 });
  const phone = body?.phone ? String(body.phone).trim() : null;
  const address = body?.address ? String(body.address).trim() : null;
  const allowedTypes = ["primary", "secondary", "school", "college", "university"];
  const institutionType = allowedTypes.includes(String(body?.institutionType))
    ? String(body.institutionType)
    : "school";

  let svc;
  try {
    svc = createServiceClient();
  } catch {
    return Response.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  // If this user already belongs to a school, don't create a duplicate.
  const { data: existing } = await svc
    .from("school_users")
    .select("school_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing?.school_id)
    return Response.json({ ok: true, schoolId: existing.school_id });

  const { data: school, error: e1 } = await svc
    .from("schools")
    .insert({ name, phone, address, institution_type: institutionType, created_by: user.id })
    .select()
    .single();
  if (e1)
    return Response.json(
      { error: e1.message, hint: "Did you run supabase/school-management.sql?" },
      { status: 500 },
    );

  const { error: e2 } = await svc.from("school_users").insert({
    school_id: school.id,
    user_id: user.id,
    email: user.email,
    role: "SCHOOL_ADMIN",
  });
  if (e2) {
    // Roll back the orphaned school so the user can retry cleanly.
    await svc.from("schools").delete().eq("id", school.id);
    return Response.json({ error: e2.message }, { status: 500 });
  }

  return Response.json({ ok: true, schoolId: school.id });
}
