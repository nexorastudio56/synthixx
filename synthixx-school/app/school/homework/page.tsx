"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Sparkles, ClipboardCheck, BookOpen } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import { AIGeneratorModal } from "@/components/school/ai-generator";
import type { Assignment, Student } from "@/lib/school/types";
import {
  PageHeader, TableSkeleton, EmptyState, Modal, Field, Input, Textarea, Pill, AIButton, useToast,
} from "@/components/school/ui";

interface Submission {
  id: string;
  assignment_id: string | null;
  student_id: string | null;
  status: string;
  answer_text?: string | null;
  score?: number | null;
  feedback?: string | null;
}

export default function HomeworkPage() {
  return (
    <ModuleGuard module="homework">
      <HomeworkView />
    </ModuleGuard>
  );
}

function HomeworkView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [lpOpen, setLpOpen] = useState(false);
  const [subFor, setSubFor] = useState<Assignment | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [a, s] = await Promise.all([
        supabase.from("assignments").select("*").eq("school_id", schoolId).order("due_date", { ascending: false }),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setRows((a.data ?? []) as Assignment[]);
      setStudents((s.data ?? []) as Student[]);
    } catch { show("Could not load homework", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);

  async function remove(id: string) {
    if (!confirm("Delete this assignment?")) return;
    try { await deleteRow("assignments", id); setRows((c) => c.filter((r) => r.id !== id)); show("Deleted"); }
    catch { show("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader
        title="Homework & Assignments"
        description="Post assignments and track submissions."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setLpOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <BookOpen className="h-4 w-4" /> Lesson Plan (AI)
            </button>
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
              <Plus className="h-4 w-4" /> New Assignment
            </button>
          </div>
        }
      />

      {loading ? <TableSkeleton cols={4} /> : rows.length === 0 ? (
        <EmptyState title="No assignments" description="Post your first assignment." />
      ) : (
        <div className="space-y-2">
          {rows.map((a) => {
            const overdue = a.due_date && a.due_date < today;
            return (
              <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{a.title}</h3>
                      {a.class && <Pill tone="blue">Class {a.class}</Pill>}
                      {a.subject && <Pill tone="gray">{a.subject}</Pill>}
                      {overdue && <Pill tone="red">Overdue</Pill>}
                    </div>
                    {a.description && <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted">{a.description}</p>}
                    {a.due_date && <p className="mt-1 text-xs text-muted">Due {a.due_date}</p>}
                    {a.file_url && <a href={a.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-accent hover:underline">Attachment</a>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => setSubFor(a)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft"><ClipboardCheck className="h-3.5 w-3.5" /> Submissions</button>
                    <button onClick={() => remove(a.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewAssignmentModal open={open} onClose={() => setOpen(false)} onAdded={(a) => { setRows((c) => [a, ...c]); show("Assignment posted"); }} />
      {subFor && <SubmissionsModal assignment={subFor} students={students} onClose={() => setSubFor(null)} />}

      <AIGeneratorModal
        open={lpOpen}
        onClose={() => setLpOpen(false)}
        title="Generate Lesson Plan"
        cta="Generate plan"
        printTitle="Lesson Plan"
        fields={[
          { key: "subject", label: "Subject", placeholder: "e.g. Science" },
          { key: "klass", label: "Class / Grade", placeholder: "e.g. 6" },
          { key: "topic", label: "Topic", placeholder: "e.g. Photosynthesis" },
          { key: "duration", label: "Duration", placeholder: "e.g. 40 minutes", defaultValue: "40 minutes" },
        ]}
        build={(v) => ({
          system: "You are an expert teacher and curriculum designer. Produce a clear, ready-to-use lesson plan with these sections: Learning Objectives, Materials, Warm-up, Main Activity (step-by-step with timings), Assessment/Check for Understanding, Homework, and Differentiation tips. Plain text with headings.",
          user: `Subject: ${v.subject || "—"}. Class: ${v.klass || "—"}. Topic: ${v.topic || "—"}. Lesson duration: ${v.duration || "40 minutes"}.`,
        })}
      />
    </div>
  );
}

function NewAssignmentModal({
  open, onClose, onAdded,
}: { open: boolean; onClose: () => void; onAdded: (a: Assignment) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ class: "", subject: "", title: "", description: "", due_date: "", file_url: "" });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function generate() {
    if (!form.class && !form.subject) { show("Add a class and subject first", "info"); return; }
    setAiBusy(true);
    try {
      const text = await getAIInsight(
        "Generate 5 clear practice questions for the given class/subject/topic. Number them 1-5. Output only the questions.",
        `Class ${form.class || "?"}, Subject ${form.subject || "?"}, Topic: ${form.title || "general revision"}.`,
      );
      set("description", text);
    } catch { show("AI generation failed", "error"); }
    finally { setAiBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.title.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("assignments", schoolId, {
        class: form.class.trim() || null, subject: form.subject.trim() || null,
        title: form.title.trim(), description: form.description.trim() || null,
        due_date: form.due_date || null, file_url: form.file_url.trim() || null,
      })) as Assignment;
      onAdded(row);
      setForm({ class: "", subject: "", title: "", description: "", due_date: "", file_url: "" });
      onClose();
    } catch { show("Could not post", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Assignment">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Class"><Input value={form.class} onChange={(e) => set("class", e.target.value)} placeholder="e.g. 7" /></Field>
          <Field label="Subject"><Input value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
        </div>
        <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="e.g. Math Ch.3 practice" /></Field>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium">Description</span>
            <AIButton loading={aiBusy} onClick={generate}><Sparkles className="h-3 w-3" /> Generate questions</AIButton>
          </div>
          <Textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} /></Field>
          <Field label="Attachment URL"><Input value={form.file_url} onChange={(e) => set("file_url", e.target.value)} placeholder="https://…" /></Field>
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Posting…" : "Post Assignment"}</button>
      </form>
    </Modal>
  );
}

function SubmissionsModal({
  assignment, students, onClose,
}: { assignment: Assignment; students: Student[]; onClose: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const classStudents = useMemo(
    () => students.filter((s) => !assignment.class || s.class === assignment.class),
    [students, assignment.class],
  );

  useEffect(() => {
    (async () => {
      const { data } = await sb().from("submissions").select("*").eq("assignment_id", assignment.id);
      setSubs((data ?? []) as Submission[]);
      setLoading(false);
    })();
  }, [assignment.id]);

  async function toggle(studentId: string) {
    const existing = subs.find((s) => s.student_id === studentId);
    try {
      if (existing) {
        const next = existing.status === "submitted" ? "pending" : "submitted";
        await sb().from("submissions").update({ status: next, submitted_at: next === "submitted" ? new Date().toISOString() : null }).eq("id", existing.id);
        setSubs((c) => c.map((s) => (s.id === existing.id ? { ...s, status: next } : s)));
      } else if (schoolId) {
        const row = (await insertRow("submissions", schoolId, { assignment_id: assignment.id, student_id: studentId, status: "submitted", submitted_at: new Date().toISOString() })) as Submission;
        setSubs((c) => [...c, row]);
      }
    } catch { show("Update failed", "error"); }
  }

  return (
    <Modal open onClose={onClose} title={`Submissions · ${assignment.title}`}>
      {loading ? <p className="text-sm text-muted">Loading…</p> : classStudents.length === 0 ? (
        <p className="text-sm text-muted">No students in this class.</p>
      ) : (
        <ul className="space-y-1.5">
          {classStudents.map((s) => {
            const sub = subs.find((x) => x.student_id === s.id) ?? null;
            const done = sub?.status === "submitted";
            return (
              <li key={s.id} className="rounded-lg bg-background px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {s.name}
                    {typeof sub?.score === "number" && <Pill tone="green">{sub.score}/100</Pill>}
                  </span>
                  <button onClick={() => toggle(s.id)} className={`rounded-md px-2.5 py-1 text-xs font-medium ${done ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-accent-soft text-muted"}`}>
                    {done ? "Submitted" : "Mark submitted"}
                  </button>
                </div>
                <GradePanel
                  assignment={assignment}
                  submission={sub}
                  onSaved={(row) => setSubs((c) => {
                    const rest = c.filter((x) => x.id !== row.id);
                    return [...rest, row];
                  })}
                  ensureSubmission={() => ensureSubmission(s.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );

  async function ensureSubmission(studentId: string): Promise<Submission | null> {
    const existing = subs.find((s) => s.student_id === studentId);
    if (existing) return existing;
    if (!schoolId) return null;
    try {
      const row = (await insertRow("submissions", schoolId, { assignment_id: assignment.id, student_id: studentId, status: "pending" })) as Submission;
      setSubs((c) => [...c, row]);
      return row;
    } catch {
      show("Could not create submission", "error");
      return null;
    }
  }
}

function GradePanel({
  assignment, submission, onSaved, ensureSubmission,
}: {
  assignment: Assignment;
  submission: Submission | null;
  onSaved: (s: Submission) => void;
  ensureSubmission: () => Promise<Submission | null>;
}) {
  const { show } = useToast();
  const [openPanel, setOpenPanel] = useState(false);
  const [answer, setAnswer] = useState(submission?.answer_text ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(
    submission?.score != null ? { score: submission.score, feedback: submission.feedback ?? "" } : null,
  );

  async function grade() {
    if (!answer.trim()) { show("Paste the student's answer first", "info"); return; }
    setBusy(true);
    try {
      const text = await getAIInsight(
        "You are a fair teacher grading a homework submission out of 100. Reply ONLY as JSON: {\"score\": <0-100 integer>, \"feedback\": \"<2-3 sentences of constructive feedback>\"}. No other text.",
        `Assignment: ${assignment.title}\nQuestions / brief: ${assignment.description ?? "(none)"}\n\nStudent answer:\n${answer.trim()}`,
      );
      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as { score: number; feedback: string };
      const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
      setResult({ score, feedback: parsed.feedback });

      const sub = await ensureSubmission();
      if (sub) {
        await sb().from("submissions").update({ answer_text: answer.trim(), score, feedback: parsed.feedback }).eq("id", sub.id);
        onSaved({ ...sub, answer_text: answer.trim(), score, feedback: parsed.feedback, status: sub.status });
      }
      show("Graded with AI");
    } catch {
      show("AI grading failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5">
      <button onClick={() => setOpenPanel((o) => !o)} className="text-xs text-accent hover:underline">
        {openPanel ? "Hide AI grading" : "AI grade answer"}
      </button>
      {openPanel && (
        <div className="mt-2 space-y-2">
          <Textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Paste the student's answer text…" />
          <AIButton loading={busy} onClick={grade}>Grade with AI</AIButton>
          {result && (
            <div className="rounded-lg bg-accent-soft/40 p-2 text-xs">
              <p className="font-medium">Score: {result.score}/100</p>
              <p className="mt-0.5 text-muted">{result.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
