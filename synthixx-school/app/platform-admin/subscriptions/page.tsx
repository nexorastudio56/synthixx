import { createServiceClient } from "@/lib/supabase/server";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const svc = await createServiceClient();

  const [{ data: pending }, { data: active }] = await Promise.all([
    svc.from("fee_payments")
       .select("txn_ref, amount, gateway, initiated_at, school_id, raw")
       .eq("status", "processing")
       .like("raw->>type", "subscription")
       .order("initiated_at", { ascending: false }),
    svc.from("school_subscriptions")
       .select("school_id, plan_id, status, amount, activated_at, expires_at")
       .order("activated_at", { ascending: false }),
  ]);

  const GATEWAY: Record<string, string> = {
    jazzcash: "JazzCash", easypaisa: "EasyPaisa", nayapay: "NayaPay", bank: "Allied Bank",
  };

  type PendingRow = {
    txn_ref: string; amount: number; gateway: string;
    initiated_at: string; school_id: string;
    raw: { planId?: string; planName?: string; transactionId?: string };
  };

  type ActiveRow = {
    school_id: string; plan_id: string; status: string;
    amount: number; activated_at: string; expires_at: string;
  };

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-white">Subscriptions</h1>

      {/* Pending */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <h2 className="font-semibold text-white">Pending Verification ({(pending ?? []).length})</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
          {(pending ?? []).length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-white/30">No pending payments</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs text-white/30">
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">T-ID</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {(pending as PendingRow[]).map((p) => (
                  <tr key={p.txn_ref}>
                    <td className="px-5 py-3.5 font-semibold text-amber-400">
                      {p.raw?.planName ?? p.raw?.planId ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-white">
                      Rs. {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-white/60">{GATEWAY[p.gateway] ?? p.gateway}</td>
                    <td className="px-5 py-3.5 font-mono text-white/80">{p.raw?.transactionId ?? "—"}</td>
                    <td className="px-5 py-3.5 text-white/40 text-xs">
                      {new Date(p.initiated_at).toLocaleString("en-PK")}
                    </td>
                    <td className="px-5 py-3.5">
                      <form action={`/api/platform-admin/activate?txnRef=${p.txn_ref}&schoolId=${p.school_id}`} method="POST">
                        <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition">
                          <CheckCircle2 className="h-3 w-3" /> Activate
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Active */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <h2 className="font-semibold text-white">Active Subscriptions ({(active ?? []).length})</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
          {(active ?? []).length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-white/30">No active subscriptions</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs text-white/30">
                  <th className="px-5 py-3">School ID</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Activated</th>
                  <th className="px-5 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {(active as ActiveRow[]).map((s) => (
                  <tr key={s.school_id}>
                    <td className="px-5 py-3.5 font-mono text-xs text-white/40">{s.school_id.slice(0, 12)}…</td>
                    <td className="px-5 py-3.5 font-semibold text-emerald-400 capitalize">{s.plan_id}</td>
                    <td className="px-5 py-3.5 font-mono text-white">Rs. {Number(s.amount).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {new Date(s.activated_at).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {new Date(s.expires_at).toLocaleDateString("en-PK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
