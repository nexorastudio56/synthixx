"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Award } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, deleteRow } from "@/lib/school/queries";
import {
  PageHeader,
  Spinner,
  EmptyState,
  StatCard,
  Modal,
  Field,
  Input,
  Select,
  Textarea,
  Pill,
  useToast,
} from "@/components/school/ui";

interface Scholarship {
  id: string;
  name: string;
  kind: string;
  amount: number;
  is_percentage: boolean;
  criteria: string | null;
}
interface Aid {
  id: string;
  student_id: string;
  scholarship_id: string | null;
  amount: number;
  status: string;
}
interface Student {
  id: string;
  name: string;
}

export default function ScholarshipsPage() {
  return (
    <ModuleGuard module="scholarships">
      <ScholarshipsInner />
    </ModuleGuard>
  );
}

function ScholarshipsInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [aid, setAid] = useState<Aid[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schModal, setSchModal] = useState(false);
  const [awardModal, setAwardModal] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [s, a, st] = await Promise.all([
      sb().from("scholarships").select("*").eq("school_id", schoolId).order("created_at"),
      sb().from("financial_aid").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb().from("students").select("id,name").eq("school_id", schoolId).order("name"),
    ]);
    setScholarships((s.data ?? []) as Scholarship[]);
    setAid((a.data ?? []) as Aid[]);
    setStudents((st.data ?? []) as Student[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const schName = (id: string | null) => scholarships.find((s) => s.id === id)?.name ?? "—";
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "—";
  const awardedTotal = aid.filter((a) => a.status === "awarded" || a.status === "approved").reduce((s, a) => s + Number(a.amount || 0), 0);

  async function setStatus(id: string, status: string) {
    await updateRow("financial_aid", id, { status });
    show("Updated");
    load();
  }
  async function removeSch(id: string) {
    if (!confirm("Delete this scholarship?")) return;
    await deleteRow("scholarships", id);
    show("Deleted");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Scholarships & Financial Aid"
        description="Define scholarships and award aid to students."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setSchModal(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-accent-soft">
              <Plus className="h-4 w-4" /> Scholarship
            </button>
            <button onClick={() => setAwardModal(true)} disabled={scholarships.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Award aid
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Scholarships" value={scholarships.length} icon={<Award className="h-4 w-4" />} />
        <StatCard label="Awards" value={aid.length} />
        <StatCard label="Total awarded" value={awardedTotal.toLocaleString()} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold">Scholarships</h3>
          {scholarships.length === 0 ? (
            <EmptyState description="Add a scholarship to begin." />
          ) : (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scholarships.map((s) => (
                <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs capitalize text-muted">{s.kind}</p>
                    </div>
                    <button onClick={() => removeSch(s.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-2 text-lg font-semibold">{s.is_percentage ? `${s.amount}%` : Number(s.amount).toLocaleString()}</p>
                  {s.criteria && <p className="mt-1 text-xs text-muted">{s.criteria}</p>}
                </div>
              ))}
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold">Awarded aid</h3>
          {aid.length === 0 ? (
            <EmptyState description="No aid awarded yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Scholarship</th>
                    <th className="px-4 py-2.5 font-medium">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {aid.map((a) => (
                    <tr key={a.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                      <td className="px-4 py-2.5">{studentName(a.student_id)}</td>
                      <td className="px-4 py-2.5">{schName(a.scholarship_id)}</td>
                      <td className="px-4 py-2.5">{Number(a.amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5"><Pill tone={a.status === "awarded" || a.status === "approved" ? "green" : a.status === "rejected" ? "red" : "amber"}>{a.status}</Pill></td>
                      <td className="px-4 py-2.5 text-right">
                        <Select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)} className="w-32 py-1.5">
                          <option value="applied">Applied</option>
                          <option value="approved">Approved</option>
                          <option value="awarded">Awarded</option>
                          <option value="rejected">Rejected</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {schModal && (
        <AddScholarship schoolId={schoolId!} onClose={() => setSchModal(false)} onSaved={() => { setSchModal(false); load(); show("Scholarship added"); }} />
      )}
      {awardModal && (
        <AwardAid schoolId={schoolId!} scholarships={scholarships} students={students} onClose={() => setAwardModal(false)} onSaved={() => { setAwardModal(false); load(); show("Aid awarded"); }} />
      )}
    </div>
  );
}

function AddScholarship({ schoolId, onClose, onSaved }: { schoolId: string; onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ kind: "merit", amount: "0", is_percentage: "false" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("scholarships", schoolId, {
        name: form.name,
        kind: form.kind,
        amount: Number(form.amount) || 0,
        is_percentage: form.is_percentage === "true",
        criteria: form.criteria || null,
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add scholarship">
      <div className="space-y-3">
        <Field label="Name"><Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Merit Scholarship" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => set("kind", e.target.value)}>
              <option value="merit">Merit</option>
              <option value="need">Need-based</option>
              <option value="sports">Sports</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Amount is">
            <Select value={form.is_percentage} onChange={(e) => set("is_percentage", e.target.value)}>
              <option value="false">Fixed amount</option>
              <option value="true">Percentage</option>
            </Select>
          </Field>
        </div>
        <Field label={form.is_percentage === "true" ? "Percentage" : "Amount"}>
          <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
        </Field>
        <Field label="Criteria (optional)"><Textarea value={form.criteria || ""} onChange={(e) => set("criteria", e.target.value)} rows={2} /></Field>
        <button onClick={save} disabled={busy || !form.name} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy && <Spinner className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
}

function AwardAid({ schoolId, scholarships, students, onClose, onSaved }: { schoolId: string; scholarships: Scholarship[]; students: Student[]; onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ amount: "0" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("financial_aid", schoolId, {
        student_id: form.student_id,
        scholarship_id: form.scholarship_id || null,
        amount: Number(form.amount) || 0,
        status: "awarded",
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Award financial aid">
      <div className="space-y-3">
        <Field label="Student">
          <Select value={form.student_id || ""} onChange={(e) => set("student_id", e.target.value)}>
            <option value="">— Select —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Scholarship">
          <Select value={form.scholarship_id || ""} onChange={(e) => set("scholarship_id", e.target.value)}>
            <option value="">— Select —</option>
            {scholarships.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Awarded amount"><Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
        <button onClick={save} disabled={busy || !form.student_id} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy && <Spinner className="h-4 w-4" />} Award
        </button>
      </div>
    </Modal>
  );
}
