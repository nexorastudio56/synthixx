"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Printer, CheckCircle2, CalendarCheck, Save } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import { printDocument } from "@/components/school/print";
import type { Teacher, Salary, Leave } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select, Pill, useToast, Spinner,
} from "@/components/school/ui";

type Tab = "payroll" | "leaves" | "attendance";

export default function HRPage() {
  return (
    <ModuleGuard module="hr-payroll">
      <HRView />
    </ModuleGuard>
  );
}

function HRView() {
  const [tab, setTab] = useState<Tab>("payroll");
  return (
    <div>
      <PageHeader title="HR & Payroll" description="Salaries, leaves and staff attendance." />
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-surface p-1">
        {(["payroll", "leaves", "attendance"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-accent text-accent-fg" : "text-muted hover:bg-accent-soft"}`}>
            {t === "attendance" ? "Staff Attendance" : t}
          </button>
        ))}
      </div>
      {tab === "payroll" && <Payroll />}
      {tab === "leaves" && <Leaves />}
      {tab === "attendance" && <StaffAttendance />}
    </div>
  );
}

/* ------------------------------- Payroll ------------------------------- */
function Payroll() {
  const { schoolId, schoolName } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [open, setOpen] = useState(false);
  const [slipBusy, setSlipBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [t, s] = await Promise.all([
        supabase.from("teachers").select("*").eq("school_id", schoolId),
        supabase.from("salaries").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      ]);
      setTeachers((t.data ?? []) as Teacher[]);
      setSalaries((s.data ?? []) as Salary[]);
    } catch { show("Could not load payroll", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const teacherName = useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);
  const paid = salaries.filter((s) => s.status === "paid").reduce((a, s) => a + (Number(s.net_salary) || 0), 0);
  const pending = salaries.filter((s) => s.status !== "paid").reduce((a, s) => a + (Number(s.net_salary) || 0), 0);

  async function markPaid(id: string) {
    try {
      await updateRow("salaries", id, { status: "paid", paid_date: new Date().toISOString().slice(0, 10) });
      setSalaries((c) => c.map((s) => (s.id === id ? { ...s, status: "paid" } : s)));
      show("Marked as paid");
    } catch { show("Update failed", "error"); }
  }

  async function slip(s: Salary) {
    setSlipBusy(s.id);
    try {
      const body = await getAIInsight(
        "Format a clean, professional salary slip body from this data. Include lines for Base Salary, Bonus, Deduction and Net Salary, plus a one-line note. Output only the slip body, no markdown.",
        `Employee: ${teacherName.get(s.teacher_id ?? "") ?? "Staff"}. Month: ${s.month ?? "-"}. Base: Rs.${s.base_salary}. Bonus: Rs.${s.bonus}. Deduction: Rs.${s.deduction}. Net: Rs.${s.net_salary}.`,
      );
      printDocument({ schoolName, title: `Salary Slip — ${s.month ?? ""}`, body, meta: teacherName.get(s.teacher_id ?? "") ?? "" });
    } catch { show("Could not generate slip", "error"); }
    finally { setSlipBusy(null); }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Staff" value={teachers.length} />
          <StatCard label="Paid" value={`Rs. ${paid.toLocaleString()}`} />
          <StatCard label="Pending" value={`Rs. ${pending.toLocaleString()}`} />
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Process Salary</button>
      </div>

      {loading ? <TableSkeleton cols={5} /> : salaries.length === 0 ? (
        <EmptyState title="No salaries processed" description="Process a salary for staff." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Month</th><th className="px-4 py-3">Net</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {salaries.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{teacherName.get(s.teacher_id ?? "") ?? "—"}</td>
                  <td className="px-4 py-3">{s.month || "—"}</td>
                  <td className="px-4 py-3">Rs. {(Number(s.net_salary) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3"><Pill tone={s.status === "paid" ? "green" : "red"}>{s.status}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {s.status !== "paid" && <button onClick={() => markPaid(s.id)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft"><CheckCircle2 className="h-3.5 w-3.5" /> Pay</button>}
                      <button onClick={() => slip(s)} disabled={slipBusy === s.id} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-accent-soft disabled:opacity-50">{slipBusy === s.id ? <Spinner className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />} Slip</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProcessSalaryModal open={open} onClose={() => setOpen(false)} teachers={teachers} onAdded={(s) => { setSalaries((c) => [s, ...c]); show("Salary processed"); }} />
    </div>
  );
}

function ProcessSalaryModal({
  open, onClose, teachers, onAdded,
}: { open: boolean; onClose: () => void; teachers: Teacher[]; onAdded: (s: Salary) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ teacher_id: "", month: "", base: "", bonus: "0", deduction: "0" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  function onTeacher(id: string) {
    const t = teachers.find((x) => x.id === id);
    setForm((f) => ({ ...f, teacher_id: id, base: t ? String(t.salary ?? 0) : f.base }));
  }

  const net = (Number(form.base) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.teacher_id) return;
    setBusy(true);
    try {
      const row = (await insertRow("salaries", schoolId, {
        teacher_id: form.teacher_id, month: form.month.trim() || null,
        base_salary: Number(form.base) || 0, bonus: Number(form.bonus) || 0, deduction: Number(form.deduction) || 0,
        net_salary: net, status: "unpaid",
      })) as Salary;
      onAdded(row);
      setForm({ teacher_id: "", month: "", base: "", bonus: "0", deduction: "0" });
      onClose();
    } catch { show("Could not process salary", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Process Salary">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Staff">
          <Select value={form.teacher_id} onChange={(e) => onTeacher(e.target.value)} required>
            <option value="">Select staff</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Month"><Input value={form.month} onChange={(e) => set("month", e.target.value)} placeholder="e.g. June 2026" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Base"><Input type="number" value={form.base} onChange={(e) => set("base", e.target.value)} /></Field>
          <Field label="Bonus"><Input type="number" value={form.bonus} onChange={(e) => set("bonus", e.target.value)} /></Field>
          <Field label="Deduction"><Input type="number" value={form.deduction} onChange={(e) => set("deduction", e.target.value)} /></Field>
        </div>
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">Net salary: <span className="font-semibold">Rs. {net.toLocaleString()}</span></p>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Process Salary"}</button>
      </form>
    </Modal>
  );
}

/* -------------------------------- Leaves ------------------------------- */
function Leaves() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [l, t] = await Promise.all([
        supabase.from("leaves").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("teachers").select("*").eq("school_id", schoolId),
      ]);
      setLeaves((l.data ?? []) as Leave[]);
      setTeachers((t.data ?? []) as Teacher[]);
    } catch { show("Could not load leaves", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const teacherName = useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);

  async function setStatus(id: string, status: Leave["status"]) {
    try { await updateRow("leaves", id, { status }); setLeaves((c) => c.map((l) => (l.id === id ? { ...l, status } : l))); }
    catch { show("Update failed", "error"); }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Apply Leave</button>
      </div>
      {loading ? <TableSkeleton cols={4} /> : leaves.length === 0 ? (
        <EmptyState title="No leaves" description="No leave applications yet." />
      ) : (
        <div className="space-y-2">
          {leaves.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
              <div>
                <p className="font-medium">{teacherName.get(l.teacher_id ?? "") ?? "—"} <Pill tone="gray">{l.leave_type}</Pill></p>
                <p className="mt-0.5 text-xs text-muted">{l.from_date} → {l.to_date} {l.reason ? `· ${l.reason}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={l.status === "approved" ? "green" : l.status === "rejected" ? "red" : "amber"}>{l.status}</Pill>
                {l.status === "pending" && (
                  <>
                    <button onClick={() => setStatus(l.id, "approved")} className="rounded-md px-2 py-1 text-xs text-green-600 hover:bg-accent-soft dark:text-green-400">Approve</button>
                    <button onClick={() => setStatus(l.id, "rejected")} className="rounded-md px-2 py-1 text-xs text-danger hover:bg-accent-soft">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ApplyLeaveModal open={open} onClose={() => setOpen(false)} teachers={teachers} onAdded={(l) => { setLeaves((c) => [l, ...c]); show("Leave applied"); }} />
    </div>
  );
}

function ApplyLeaveModal({
  open, onClose, teachers, onAdded,
}: { open: boolean; onClose: () => void; teachers: Teacher[]; onAdded: (l: Leave) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ teacher_id: "", leave_type: "casual", from_date: "", to_date: "", reason: "" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.teacher_id) return;
    setBusy(true);
    try {
      const row = (await insertRow("leaves", schoolId, {
        teacher_id: form.teacher_id, leave_type: form.leave_type, from_date: form.from_date || null,
        to_date: form.to_date || null, reason: form.reason.trim() || null, status: "pending",
      })) as Leave;
      onAdded(row);
      setForm({ teacher_id: "", leave_type: "casual", from_date: "", to_date: "", reason: "" });
      onClose();
    } catch { show("Could not apply leave", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply Leave">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Staff">
          <Select value={form.teacher_id} onChange={(e) => set("teacher_id", e.target.value)} required>
            <option value="">Select staff</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={form.leave_type} onChange={(e) => set("leave_type", e.target.value)}>
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="annual">Annual</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={form.from_date} onChange={(e) => set("from_date", e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={form.to_date} onChange={(e) => set("to_date", e.target.value)} /></Field>
        </div>
        <Field label="Reason"><Input value={form.reason} onChange={(e) => set("reason", e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Apply Leave"}</button>
      </form>
    </Modal>
  );
}

/* --------------------------- Staff attendance -------------------------- */
function StaffAttendance() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [marks, setMarks] = useState<Record<string, "present" | "absent">>({});
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data } = await sb().from("teachers").select("*").eq("school_id", schoolId);
      setTeachers((data ?? []) as Teacher[]);
    } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!schoolId || teachers.length === 0) return;
    setSaving(true);
    try {
      const rows = teachers.map((t) => ({ school_id: schoolId, teacher_id: t.id, date, status: marks[t.id] ?? "present" }));
      const { error } = await sb().from("staff_attendance").insert(rows);
      if (error) throw error;
      show(`Saved for ${rows.length} staff`);
      setMarks({});
    } catch { show("Save failed", "error"); }
    finally { setSaving(false); }
  }

  if (loading) return <TableSkeleton cols={2} />;
  if (teachers.length === 0) return <EmptyState title="No staff" description="Add teachers first." />;

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
        </label>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Staff</th><th className="px-4 py-3">Mark</th></tr></thead>
          <tbody>
            {teachers.map((t) => {
              const m = marks[t.id] ?? "present";
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <div className="inline-flex overflow-hidden rounded-lg border border-border">
                      <button onClick={() => setMarks((c) => ({ ...c, [t.id]: "present" }))} className={`px-3 py-1 text-xs ${m === "present" ? "bg-green-500/20 text-green-600 dark:text-green-400" : "text-muted"}`}>Present</button>
                      <button onClick={() => setMarks((c) => ({ ...c, [t.id]: "absent" }))} className={`px-3 py-1 text-xs ${m === "absent" ? "bg-danger/20 text-danger" : "text-muted"}`}>Absent</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarCheck className="h-3.5 w-3.5" /> Defaults to present; change as needed, then save.</p>
    </div>
  );
}
