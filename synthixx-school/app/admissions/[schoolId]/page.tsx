import { createServiceClient } from "@/lib/supabase/server";
import { AdmissionForm } from "./admission-form";

export const runtime = "nodejs";

export default async function AdmissionsPublicPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const svc = createServiceClient();
  const { data: school } = await svc
    .from("schools")
    .select("id, name, logo_url, letterhead")
    .eq("id", schoolId)
    .maybeSingle();

  if (!school) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">School not found</h1>
          <p className="mt-1 text-sm text-muted">Please check the admissions link and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="sk-animate-fade-up mb-6 text-center">
          {school.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_url} alt="" className="mx-auto mb-3 h-16 w-16 rounded-xl object-cover" />
          )}
          <h1 className="text-2xl font-semibold">{school.name}</h1>
          <p className="mt-1 text-sm text-muted">Online Admission Enquiry</p>
          {school.letterhead && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted">{school.letterhead}</p>
          )}
        </div>
        <div className="sk-animate-scale-in rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <AdmissionForm schoolId={school.id} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Powered by SchoolAI · Synthixx</p>
      </div>
    </div>
  );
}
