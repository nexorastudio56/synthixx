"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, CheckCircle } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { getPaymentTransactions } from "@/lib/school/queries";
import type { PaymentTransaction } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Input, Select,
  Pill, useToast, Modal, Field,
} from "@/components/school/ui";

export default function PaymentsPage() {
  return (
    <ModuleGuard module="payments">
      <PaymentsView />
    </ModuleGuard>
  );
}

function PaymentsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [verifyTxn, setVerifyTxn] = useState<PaymentTransaction | null>(null);
  const [verifyReason, setVerifyReason] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const data = await getPaymentTransactions(schoolId, {
        status: statusFilter || undefined,
        gateway: gatewayFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setTransactions(data as PaymentTransaction[]);
    } catch (e) {
      show("Could not load payments", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, statusFilter, gatewayFilter, dateFrom, dateTo, show]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const paid = transactions.filter((t) => t.status === "paid");
    const today = new Date().toISOString().slice(0, 10);
    const todayPaid = paid.filter((t) => t.created_at.slice(0, 10) === today);
    const pending = transactions.filter((t) => t.status === "pending" || t.status === "processing");
    const failed = transactions.filter((t) => t.status === "failed");
    return {
      totalCollected: paid.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      todayPayments: todayPaid.length,
      todayCollected: todayPaid.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      pendingAmount: pending.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      failedCount: failed.length,
    };
  }, [transactions]);

  function exportCSV() {
    if (transactions.length === 0) { show("No transactions to export", "info"); return; }
    const headers = ["Date", "Student", "Amount", "Status", "Gateway", "Method", "Transaction ID"];
    const rows = transactions.map((t) => [
      new Date(t.created_at).toLocaleDateString(),
      (t as any).student?.name || "—",
      `Rs. ${Number(t.amount || 0).toLocaleString()}`,
      t.status.toUpperCase(),
      t.gateway.toUpperCase(),
      t.payment_method || "—",
      t.gateway_transaction_id || t.txn_ref || "—",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("CSV exported");
  }

  async function verifyBankTransfer() {
    if (!verifyTxn) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/school/pay/bank-transfer/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnRef: verifyTxn.txn_ref, reason: verifyReason || "Bank transfer verified by admin" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Verification failed");
      show("Bank transfer marked as paid", "success");
      setVerifyTxn(null);
      setVerifyReason("");
      load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Verification failed", "error");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Payment Transactions"
        description="Monitor all payment attempts and confirmations."
        actions={<button onClick={exportCSV} disabled={transactions.length === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Collected" value={`Rs. ${stats.totalCollected.toLocaleString()}`} />
        <StatCard label="Today's Payments" value={stats.todayPayments} hint={`Rs. ${stats.todayCollected.toLocaleString()}`} />
        <StatCard label="Pending Amount" value={`Rs. ${stats.pendingAmount.toLocaleString()}`} />
        <StatCard label="Failed" value={stats.failedCount} />
        <StatCard label="Total Transactions" value={transactions.length} />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4" /> Filters</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="text-xs font-medium">Status</label><Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1"><option value="">All</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="failed">Failed</option></Select></div>
          <div><label className="text-xs font-medium">Gateway</label><Select value={gatewayFilter} onChange={(e) => setGatewayFilter(e.target.value)} className="mt-1"><option value="">All</option><option value="jazzcash">JazzCash</option><option value="easypaisa">EasyPaisa</option><option value="cashmaal">CashMaal</option><option value="bank_transfer">Bank Transfer</option></Select></div>
          <div><label className="text-xs font-medium">From Date</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" /></div>
          <div><label className="text-xs font-medium">To Date</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" /></div>
        </div>
      </div>

      {loading ? (<div className="mt-4"><TableSkeleton cols={7} /></div>) : transactions.length === 0 ? (<div className="mt-4"><EmptyState title="No transactions" description="No payment transactions match your filters." /></div>) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Transaction ID</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const student = (t as any).student;
                const fee = (t as any).fee;
                const date = new Date(t.created_at);
                const isBankPending = t.gateway === "bank_transfer" && t.status === "processing";
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-surface">
                    <td className="px-4 py-3 text-xs text-muted">
                      {date.toLocaleDateString()}<br />
                      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{student?.name || "—"}</span>
                      <div className="text-xs text-muted">{student?.class ? `Class ${student.class}` : "—"}</div>
                      {fee?.month && <div className="text-xs text-muted">{fee.month}</div>}
                    </td>
                    <td className="px-4 py-3 font-medium">Rs. {Number(t.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {t.status === "paid" && <Pill tone="green">Paid</Pill>}
                      {t.status === "pending" && <Pill tone="amber">Pending</Pill>}
                      {t.status === "processing" && <Pill tone="blue">Processing</Pill>}
                      {t.status === "failed" && <Pill tone="red">Failed</Pill>}
                      {t.marked_by && <div className="mt-1 text-xs text-muted">by {t.marked_by}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase text-muted">{t.gateway.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-xs">{t.payment_method || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{t.gateway_transaction_id || t.txn_ref}</td>
                    <td className="px-4 py-3 text-right">
                      {isBankPending && (
                        <button
                          onClick={() => { setVerifyTxn(t); setVerifyReason(""); }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Verify & Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!verifyTxn} onClose={() => !verifying && setVerifyTxn(null)} title="Verify Bank Transfer">
        {verifyTxn && (
          <div className="space-y-4">
            <div className="rounded-lg bg-surface p-3 text-sm">
              <p><span className="text-muted">Reference:</span> <span className="font-mono font-medium">{verifyTxn.txn_ref}</span></p>
              <p><span className="text-muted">Amount:</span> <span className="font-medium">Rs. {Number(verifyTxn.amount || 0).toLocaleString()}</span></p>
              <p><span className="text-muted">Initiated:</span> {new Date(verifyTxn.created_at).toLocaleString()}</p>
            </div>
            <Field label="Verification reason (optional)">
              <Input
                value={verifyReason}
                onChange={(e) => setVerifyReason(e.target.value)}
                placeholder="e.g. Receipt checked, Bank statement confirmed"
              />
            </Field>
            <p className="text-xs text-muted">This action marks the fee as paid and logs your email as the verifier. It cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={verifyBankTransfer}
                disabled={verifying}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {verifying ? "Marking paid…" : "Confirm & Mark Paid"}
              </button>
              <button
                onClick={() => setVerifyTxn(null)}
                disabled={verifying}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent-soft disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

