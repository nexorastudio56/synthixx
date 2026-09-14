import { createServiceClient } from "@/lib/supabase/server";
import { School } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  const svc = await createServiceClient();
  const { data: schools } = await svc
    .from("schools")
    .select("id, name, created_at, email")
    .order("created_at", { ascending: false });

  type SchoolRow = { id: string; name: string; created_at: string; email?: string };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-white">Schools ({(schools ?? []).length})</h1>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
        {(schools ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-white/30">
            <School className="h-10 w-10" />
            <p className="text-sm">No schools registered yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs text-white/30">
                <th className="px-5 py-3">School Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Registered</th>
                <th className="px-5 py-3">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {(schools as SchoolRow[]).map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3.5 font-semibold text-white">{s.name}</td>
                  <td className="px-5 py-3.5 text-white/60">{s.email ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-white/40">
                    {new Date(s.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-white/30">{s.id.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
