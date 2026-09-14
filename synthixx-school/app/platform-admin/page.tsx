import { createServiceClient } from "@/lib/supabase/server";
import { School, CreditCard, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const svc = await createServiceClient();

  const [schools, subs, pending, revenue] = await Promise.all([
    svc.from("schools").select("id", { count: "exact", head: true }),
    svc.from("school_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    svc.from("fee_payments").select("id", { count: "exact", head: true })
       .eq("status", "processing")
       .like("raw->>type", "subscription"),
    svc.from("school_subscriptions").select("amount").eq("status", "active"),
  ]);

  const totalRevenue = ((revenue.data ?? []) as { amount: number }[])
    .reduce((s, r) => s + Number(r.amount), 0);

  return {
    schools:  schools.count  ?? 0,
    active:   subs.count     ?? 0,
    pending:  pending.count  ?? 0,
    revenue:  totalRevenue,
  };
}

async function getRecentPending() {
  const svc = await createServiceClient();
  const { data } = await svc
    .from("fee_payments")
    .select("txn_ref, amount, gateway, initiated_at, raw, school_id")
    .eq("status", "processing")
    .like("raw->>type", "subscription")
    .order("initiated_at", { ascending: false })
    .limit(10);

  return (data ?? []) as {
    txn_ref: string; amount: number; gateway: string;
    initiated_at: string; school_id: string;
    raw: { planId?: string; planName?: string; transactionId?: string };
  }[];
}

export default async function PlatformAdminDashboard() {
  const [stats, pending] = await Promise.all([getStats(), getRecentPending()]);

  const GATEWAY: Record<string, string> = {
    jazzcash: "JazzCash", easypaisa: "EasyPaisa", nayapay: "NayaPay", bank: "Allied Bank",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/40">Platform overview — Synthixx Campus</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: School,        label: "Total Schools",        value: stats.schools,                  color: "text-blue-400",   bg: "bg-blue-500/10"   },
          { icon: CheckCircle2,  label: "Active Subscriptions", value: stats.active,                   color: "text-emerald-400",bg: "bg-emerald-500/10"},
          { icon: Clock,         label: "Pending Verification", value: stats.pending,                  color: "text-amber-400",  bg: "bg-amber-500/10"  },
          { icon: TrendingUp,    label: "Monthly Revenue",      value: `Rs. ${stats.revenue.toLocaleString()}`, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <div className={`mb-3 inline-flex rounded-xl p-2 ${s.bg}`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending subscriptions */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <div>
            <h2 className="font-semibold text-white">Pending Subscriptions</h2>
            <p className="text-xs text-white/40">Verify payment in your app → click Activate</p>
          </div>
          <Link
            href="/platform-admin/subscriptions"
            className="text-xs text-white/40 underline underline-offset-2 hover:text-white transition"
          >
            View all →
          </Link>
        </div>

        {pending.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-white/30">
            No pending subscription payments
          </div>
        ) : (
          <div className="divide-y divide-white/6">
            {pending.map((p) => (
              <div key={p.txn_ref} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                      {p.raw?.planName ?? p.raw?.planId ?? "Unknown"} Plan
                    </span>
                    <span className="text-sm font-bold text-white">
                      Rs. {Number(p.amount).toLocaleString()}
                    </span>
                    <span className="text-xs text-white/40">{GATEWAY[p.gateway] ?? p.gateway}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    T-ID: <span className="font-mono text-white/70">{p.raw?.transactionId ?? "—"}</span>
                    &nbsp;·&nbsp;{new Date(p.initiated_at).toLocaleString("en-PK")}
                  </p>
                </div>
                <ActivateButton txnRef={p.txn_ref} schoolId={p.school_id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* Client activate button */
function ActivateButton({ txnRef, schoolId }: { txnRef: string; schoolId: string }) {
  return (
    <form action={`/api/platform-admin/activate?txnRef=${txnRef}&schoolId=${schoolId}`} method="POST">
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Activate
      </button>
    </form>
  );
}
