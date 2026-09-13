import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Public enquiry submission for online admissions. No auth required — anyone
 * with a school's public link can submit a lead. We use the service client and
 * verify the school exists before inserting.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const schoolId = String(body.schoolId ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!schoolId || !name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: school } = await svc
    .from("schools")
    .select("id, name")
    .eq("id", schoolId)
    .maybeSingle();
  if (!school) return Response.json({ error: "School not found" }, { status: 404 });

  const { error } = await svc.from("admission_leads").insert({
    school_id: schoolId,
    name,
    parent_name: str(body.parent_name),
    phone: str(body.phone),
    email: str(body.email),
    class_applied: str(body.class_applied),
    notes: str(body.notes),
    status: "new",
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, schoolName: school.name });
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}
