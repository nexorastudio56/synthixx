"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import { AIGeneratorModal } from "@/components/school/ai-generator";
import type { Exam, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select,
  Pill, useToast,
} from "@/components/school/ui";

export default function ExamsPage() {
  return (
    <ModuleGuard module="exams">
      <ExamsView />
    </ModuleGuard>
  );
}

function ExamsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [qpOpen, setQpOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [e, s] = await Promise.all([
        supabase.from("exams").select("*").eq("school_id", schoolId).order("exam_date", { ascending: false }),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setExams((e.data ?? []) as Exam[]);
      setStudents((s.data ?? []) as Student[]);
    } catch {
      show("Could not load exams", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const nameOf = useMemo(() => {
    const m = new Map(students.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [students]);

  const avg = exams.length
    ? Math.round(exams.reduce((s, e) => s + ((Number(e.marks) || 0) / (Number(e.total_marks) || 100)) * 100, 0) / exams.length)
    : 0;

  async function remove(id: string) {
    if (!confirm("Delete this result?")) return;
    try {
      await deleteRow("exams", id);
      setExams((c) => c.filter((e) => e.id !== id));
      show("Result deleted");
    } catch {
      show("Delete failed", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Exams & Results"
        description="Record and review student results."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setQpOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <FileText className="h-4 w-4" /> Question Paper (AI)
            </button>
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Result
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Total Results" value={exams.length} />
        <StatCard label="Average Score" value={`${avg}%`} />
      </div>

      {loading ? (
        <TableSkeleton cols={5} />
      ) : exams.length === 0 ? (
        <EmptyState title="No results" description="Add exam results for students." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Marks</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => {
                const pct = Math.round(((Number(e.marks) || 0) / (Number(e.total_marks) || 100)) * 100);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{nameOf(e.student_id)}</td>
                    <td className="px-4 py-3">{e.subject || "—"}</td>
                    <td className="px-4 py-3">{e.marks}/{e.total_marks}</td>
                    <td className="px-4 py-3">
                      <Pill tone={pct >= 80 ? "green" : pct >= 50 ? "amber" : "red"}>{pct}%</Pill>
                    </td>
                    <td className="px-4 py-3">{e.exam_date || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(e.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddResultModal open={open} onClose={() => setOpen(false)} students={students} onAdded={(e) => { setExams((c) => [e, ...c]); show("Result added"); }} />

      <AIGeneratorModal
        open={qpOpen}
        onClose={() => setQpOpen(false)}
        title="Generate Question Paper"
        cta="Generate paper"
        printTitle="Question Paper"
        fields={[
          { key: "subject", label: "Subject", placeholder: "e.g. Mathematics" },
          { key: "klass", label: "Class / Grade", placeholder: "e.g. 8" },
          { key: "total", label: "Total marks", type: "number", defaultValue: "50" },
          { key: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard", "Mixed"], defaultValue: "Mixed" },
          { key: "topics", label: "Topics to cover", type: "textarea", placeholder: "Comma-separated topics / chapters" },
        ]}
        build={(v) => ({
          system: "You are an experienced exam setter. Produce a clean, ready-to-print question paper with a header (subject, class, total marks, time), clearly numbered sections (e.g. MCQs, Short answers, Long answers) with marks shown per question, and a sensible marks distribution that adds up to the total. Plain text only.",
          user: `Subject: ${v.subject || "—"}. Class: ${v.klass || "—"}. Total marks: ${v.total || "50"}. Difficulty: ${v.difficulty || "Mixed"}. Topics: ${v.topics || "general syllabus"}.`,
        })}
      />
    </div>
  );
}

function AddResultModal({
  open, onClose, students, onAdded,
}: { open: boolean; onClose: () => void; students: Student[]; onAdded: (e: Exam) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ student_id: "", subject: "", marks: "", total_marks: "100", exam_date: "" });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!schoolId || !form.student_id) return;
    setBusy(true);
    try {
      const row = (await insertRow("exams", schoolId, {
        student_id: form.student_id,
        subject: form.subject.trim() || null,
        marks: Number(form.marks) || 0,
        total_marks: Number(form.total_marks) || 100,
        exam_date: form.exam_date || null,
      })) as Exam;
      onAdded(row);
      setForm({ student_id: "", subject: "", marks: "", total_marks: "100", exam_date: "" });
      onClose();
    } catch {
      show("Could not add result", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Result">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={form.student_id} onChange={(e) => set("student_id", e.target.value)} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Subject"><Input value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Marks"><Input type="number" value={form.marks} onChange={(e) => set("marks", e.target.value)} /></Field>
          <Field label="Total"><Input type="number" value={form.total_marks} onChange={(e) => set("total_marks", e.target.value)} /></Field>
          <Field label="Date"><Input type="date" value={form.exam_date} onChange={(e) => set("exam_date", e.target.value)} /></Field>
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : "Add Result"}
        </button>
      </form>
    </Modal>
  );
}
