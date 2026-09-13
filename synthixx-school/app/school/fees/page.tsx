"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, CheckCircle2, CalendarPlus, Printer, Sparkles } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, bulkInsert } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import { printHTML, escapeHTML } from "@/components/school/print";
import type { Fee, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select,
  Pill, useToast,
} from "@/components/school/ui";

export default function FeesPage() {
  return (
    <ModuleGuard module="fees">
      <FeesView />
    </ModuleGuard>
  );
}

function FeesView() {
  const { schoolId, schoolName, logoUrl, letterhead } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [reminder, setReminder] = useState<{ fee: Fee; text: string } | null>(null);
  const [reminderBusy, setReminderBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [f, s] = await Promise.all([
        supabase.from("fees").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setFees((f.data ?? []) as Fee[]);
      setStudents((s.data ?? []) as Student[]);
    } catch {
      show("Could not load fees", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("generate") === "1") {
      setGenOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const nameOf = useMemo(() => {
    const m = new Map(students.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [students]);

  const collected = fees.filter((f) => f.status === "paid").reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const pending = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + (Number(f.amount) || 0), 0);

  const filtered = filter ? fees.filter((f) => f.status === filter) : fees;

  async function markPaid(id: string) {
    try {
      await updateRow("fees", id, { status: "paid", paid_date: new Date().toISOString().slice(0, 10) });
      setFees((c) => c.map((f) => (f.id === id ? { ...f, status: "paid", paid_date: new Date().toISOString().slice(0, 10) } : f)));
      show("Marked as paid");
    } catch {
      show("Update failed", "error");
    }
  }

  async function aiReminder(f: Fee) {
    const student = students.find((s) => s.id === f.student_id);
    setReminderBusy(f.id);
    try {
      const text = await getAIInsight(
        "You write short, polite, warm fee-reminder messages for parents (WhatsApp/SMS style, max 3 sentences). Address the parent respectfully. If the user's data is Urdu/Roman Urdu friendly, you may use polite Roman Urdu. Include student name, month and amount. End with thanks. Output only the message.",
        `School: ${schoolName ?? "our school"}\nStudent: ${student?.name ?? "the student"}\nParent: ${student?.parent_name ?? "Parent"}\nClass: ${student?.class ?? "—"}\nMonth: ${f.month ?? "this month"}\nAmount due: Rs. ${Number(f.amount) || 0}`,
      );
      setReminder({ fee: f, text });
    } catch {
      show("Could not generate reminder", "error");
    } finally {
      setReminderBusy(null);
    }
  }

  function printReceipt(f: Fee) {
    const student = students.find((s) => s.id === f.student_id);
    const isPaid = f.status === "paid";
    const html = `
      <table class="kv">
        <tr><th>Receipt No</th><td>${escapeHTML(f.id.slice(0, 8).toUpperCase())}</td></tr>
        <tr><th>Student</th><td>${escapeHTML(student?.name ?? "—")}</td></tr>
        <tr><th>Class</th><td>${escapeHTML(student?.class ?? "—")} ${student?.roll_no ? `· Roll ${escapeHTML(student.roll_no)}` : ""}</td></tr>
        <tr><th>Month</th><td>${escapeHTML(f.month ?? "—")}</td></tr>
        <tr><th>Amount</th><td>Rs. ${(Number(f.amount) || 0).toLocaleString()}</td></tr>
        <tr><th>Status</th><td>${escapeHTML(f.status.toUpperCase())}${f.paid_date ? ` on ${escapeHTML(f.paid_date)}` : ""}</td></tr>
      </table>
      <p class="muted">${isPaid ? "Payment received with thanks." : "This is a fee challan. Please pay before the due date."}</p>
      <div class="sign"><div>Accountant</div><div>Received / Bank stamp</div></div>`;
    printHTML({
      schoolName, logoUrl, letterhead,
      title: isPaid ? "Fee Receipt" : "Fee Challan",
      meta: new Date().toLocaleDateString(),
      html,
    });
  }

  return (
    <div>
      <PageHeader
        title="Fee Management"
        description="Track collected and pending fees."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setGenOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <CalendarPlus className="h-4 w-4" /> Generate Monthly
            </button>
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Fee
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Collected" value={`Rs. ${collected.toLocaleString()}`} />
        <StatCard label="Pending" value={`Rs. ${pending.toLocaleString()}`} hint="Unpaid + partial" />
        <StatCard label="Records" value={fees.length} />
      </div>

      <div className="mb-3 flex gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-[180px]">
          <option value="">All</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No fee records" description="Add a fee record for a student." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{nameOf(f.student_id)}</td>
                  <td className="px-4 py-3">{f.month || "—"}</td>
                  <td className="px-4 py-3">Rs. {(Number(f.amount) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {f.status === "paid" && <Pill tone="green">Paid</Pill>}
                    {f.status === "unpaid" && <Pill tone="red">Unpaid</Pill>}
                    {f.status === "partial" && <Pill tone="amber">Partial</Pill>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {f.status !== "paid" && (
                        <button onClick={() => markPaid(f.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                        </button>
                      )}
                      {f.status !== "paid" && (
                        <button onClick={() => aiReminder(f)} disabled={reminderBusy === f.id} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft disabled:opacity-50" title="AI reminder message">
                          <Sparkles className="h-3.5 w-3.5" /> {reminderBusy === f.id ? "…" : "Reminder"}
                        </button>
                      )}
                      <button onClick={() => printReceipt(f)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="Print receipt">
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!reminder} onClose={() => setReminder(null)} title="AI Fee Reminder">
        {reminder && (
          <div className="space-y-3">
            <p className="text-xs text-muted">For {nameOf(reminder.fee.student_id)} · {reminder.fee.month ?? "—"}</p>
            <textarea
              value={reminder.text}
              onChange={(e) => setReminder({ ...reminder, text: e.target.value })}
              rows={5}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={() => { navigator.clipboard?.writeText(reminder.text).then(() => show("Copied")).catch(() => {}); }}
              className="sk-press w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              Copy message
            </button>
          </div>
        )}
      </Modal>

      <AddFeeModal open={open} onClose={() => setOpen(false)} students={students} onAdded={(f) => { setFees((c) => [f, ...c]); show("Fee added"); }} />
      <GenerateMonthlyModal open={genOpen} onClose={() => setGenOpen(false)} students={students} existing={fees}
        onGenerated={(rows) => { setFees((c) => [...rows, ...c]); show(`Generated ${rows.length} fee records`); }} />
    </div>
  );
}

function GenerateMonthlyModal({
  open, onClose, students, existing, onGenerated,
}: { open: boolean; onClose: () => void; students: Student[]; existing: Fee[]; onGenerated: (rows: Fee[]) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [structure, setStructure] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !schoolId) return;
    sb().from("fee_structure").select("class,amount").eq("school_id", schoolId).then(({ data }) => {
      const map: Record<string, number> = {};
      for (const r of (data ?? []) as { class: string; amount: number }[]) map[r.class] = Number(r.amount) || 0;
      setStructure(map);
    });
  }, [open, schoolId]);

  const hasStructure = Object.keys(structure).length > 0;
  const active = students.filter((s) => s.status === "active");
  const alreadyHave = month
    ? new Set(existing.filter((f) => (f.month ?? "").toLowerCase() === month.trim().toLowerCase()).map((f) => f.student_id))
    : new Set();
  const todo = active.filter((s) => !alreadyHave.has(s.id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !month.trim() || todo.length === 0) return;
    setBusy(true);
    try {
      const rows = todo.map((s) => {
        const perClass = s.class ? structure[s.class] : undefined;
        const amt = perClass != null ? perClass : Number(amount) || 0;
        return { student_id: s.id, month: month.trim(), amount: amt, status: "unpaid", paid_date: null };
      });
      const inserted = (await bulkInsert("fees", schoolId, rows)) as Fee[];
      onGenerated(inserted);
      setMonth(""); setAmount("");
      onClose();
    } catch {
      show("Could not generate fees", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generate Monthly Fees">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted">Creates an unpaid fee for every active student who doesn&apos;t already have one for this month.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Month"><Input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="e.g. July 2026" required /></Field>
          <Field label={hasStructure ? "Default amount (if no class fee)" : "Amount (Rs.)"}><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required={!hasStructure} /></Field>
        </div>
        {hasStructure && <p className="text-xs text-muted">Per-class amounts from Settings will be used where set.</p>}
        {month.trim() && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
            Will create <span className="font-semibold">{todo.length}</span> fee records
            {active.length - todo.length > 0 && ` (${active.length - todo.length} already exist)`}.
          </p>
        )}
        <button type="submit" disabled={busy || todo.length === 0} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Generating…" : "Generate Fees"}
        </button>
      </form>
    </Modal>
  );
}

function AddFeeModal({
  open, onClose, students, onAdded,
}: { open: boolean; onClose: () => void; students: Student[]; onAdded: (f: Fee) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ student_id: "", month: "", amount: "", status: "unpaid" });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.student_id) return;
    setBusy(true);
    try {
      const row = (await insertRow("fees", schoolId, {
        student_id: form.student_id,
        month: form.month.trim() || null,
        amount: Number(form.amount) || 0,
        status: form.status,
        paid_date: form.status === "paid" ? new Date().toISOString().slice(0, 10) : null,
      })) as Fee;
      onAdded(row);
      setForm({ student_id: "", month: "", amount: "", status: "unpaid" });
      onClose();
    } catch {
      show("Could not add fee", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Fee Record">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={form.student_id} onChange={(e) => set("student_id", e.target.value)} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Month"><Input value={form.month} onChange={(e) => set("month", e.target.value)} placeholder="e.g. June 2026" /></Field>
          <Field label="Amount (Rs.)"><Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </Select>
        </Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : "Add Fee"}
        </button>
      </form>
    </Modal>
  );
}
