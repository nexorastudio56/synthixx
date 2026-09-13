"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, IdCard, Sparkles, Send } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { getAIInsight } from "@/lib/school/ai";
import { gradeFor } from "@/lib/school/grading";
import { printIdCardHTML } from "@/components/school/print";
import { Avatar } from "@/components/school/avatar-upload";
import type {
  Student, Fee, Attendance, Exam, SchoolDocument, GradeBand,
} from "@/lib/school/types";
import {
  StatCard, Pill, useToast, Spinner, EmptyState,
} from "@/components/school/ui";

interface Assignment {
  id: string;
  title: string;
  subject: string | null;
  class: string | null;
  due_date: string | null;
}

export default function Student360Page() {
  return (
    <ModuleGuard module="students">
      <Student360View />
    </ModuleGuard>
  );
}

function Student360View() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { schoolId, schoolName, logoUrl, letterhead } = useSchool();
  const { show } = useToast();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [docs, setDocs] = useState<SchoolDocument[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [bands, setBands] = useState<GradeBand[] | null>(null);
  const [classRank, setClassRank] = useState<{ rank: number; total: number } | null>(null);

  const [summary, setSummary] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [ask, setAsk] = useState("");
  const [askAns, setAskAns] = useState("");
  const [askBusy, setAskBusy] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId || !id) return;
    setLoading(true);
    try {
      const supabase = sb();
      const { data: st } = await supabase.from("students").select("*").eq("id", id).eq("school_id", schoolId).maybeSingle();
      const s = st as Student | null;
      setStudent(s);
      if (!s) { setLoading(false); return; }

      const [f, a, e, d, sch, allExams, classStudents] = await Promise.all([
        supabase.from("fees").select("*").eq("school_id", schoolId).eq("student_id", id),
        supabase.from("attendance").select("*").eq("school_id", schoolId).eq("student_id", id),
        supabase.from("exams").select("*").eq("school_id", schoolId).eq("student_id", id),
        supabase.from("documents").select("*").eq("school_id", schoolId).eq("student_id", id),
        supabase.from("schools").select("grading_scheme").eq("id", schoolId).single(),
        supabase.from("exams").select("student_id,marks,total_marks").eq("school_id", schoolId),
        supabase.from("students").select("id").eq("school_id", schoolId).eq("class", s.class ?? ""),
      ]);
      setFees((f.data ?? []) as Fee[]);
      setAtt((a.data ?? []) as Attendance[]);
      setExams((e.data ?? []) as Exam[]);
      setDocs((d.data ?? []) as SchoolDocument[]);
      setBands(((sch.data as { grading_scheme: GradeBand[] | null } | null)?.grading_scheme) ?? null);

      // Class rank by average percentage.
      const examsAll = (allExams.data ?? []) as { student_id: string | null; marks: number | null; total_marks: number | null }[];
      const classIds = new Set(((classStudents.data ?? []) as { id: string }[]).map((r) => r.id));
      const avg = new Map<string, { sum: number; n: number }>();
      examsAll.forEach((r) => {
        if (!r.student_id || !classIds.has(r.student_id)) return;
        const pct = r.total_marks ? (Number(r.marks) / Number(r.total_marks)) * 100 : 0;
        const cur = avg.get(r.student_id) ?? { sum: 0, n: 0 };
        cur.sum += pct; cur.n += 1; avg.set(r.student_id, cur);
      });
      const ranking = [...avg.entries()]
        .map(([sid, v]) => ({ sid, pct: v.n ? v.sum / v.n : 0 }))
        .sort((x, y) => y.pct - x.pct);
      const idx = ranking.findIndex((r) => r.sid === id);
      if (idx >= 0) setClassRank({ rank: idx + 1, total: ranking.length });

      if (s.class) {
        const { data: asg } = await supabase.from("assignments").select("id,title,subject,class,due_date").eq("school_id", schoolId).eq("class", s.class).order("due_date", { ascending: false }).limit(10);
        setAssignments((asg ?? []) as Assignment[]);
      }
    } catch {
      show("Could not load student", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, id, show]);

  useEffect(() => { load(); }, [load]);

  const attPct = useMemo(() => {
    if (att.length === 0) return null;
    const present = att.filter((a) => a.status === "present").length;
    return Math.round((present / att.length) * 100);
  }, [att]);

  const examAvg = useMemo(() => {
    const withTotal = exams.filter((e) => e.total_marks);
    if (withTotal.length === 0) return null;
    const pct = withTotal.reduce((acc, e) => acc + (Number(e.marks) / Number(e.total_marks)) * 100, 0) / withTotal.length;
    return Math.round(pct);
  }, [exams]);

  const unpaid = useMemo(() => fees.filter((f) => f.status !== "paid").reduce((s, f) => s + (Number(f.amount) || 0), 0), [fees]);

  function dataContext(): string {
    return [
      `Student: ${student?.name}, Class: ${student?.class ?? "—"}`,
      `Attendance: ${attPct ?? "n/a"}% over ${att.length} days`,
      `Exam average: ${examAvg ?? "n/a"}%`,
      classRank ? `Class rank: ${classRank.rank} of ${classRank.total}` : "",
      `Outstanding fees: Rs. ${unpaid}`,
      `Recent results: ${exams.slice(0, 8).map((e) => `${e.subject}: ${e.marks}/${e.total_marks}`).join("; ") || "none"}`,
    ].filter(Boolean).join("\n");
  }

  async function genSummary() {
    if (!student) return;
    setAiBusy(true);
    try {
      const text = await getAIInsight(
        "You are SchoolAI. Write a short, supportive 3-4 sentence performance summary for this student for a teacher/parent. Be specific using the data. Suggest one area to improve.",
        dataContext(),
      );
      setSummary(text);
    } catch {
      show("AI summary failed", "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function askAI() {
    if (!ask.trim() || !student) return;
    setAskBusy(true);
    setAskAns("");
    try {
      const text = await getAIInsight(
        "You are SchoolAI. Answer the question about this specific student using ONLY the provided data. Be concise.",
        `${dataContext()}\n\nQuestion: ${ask.trim()}`,
      );
      setAskAns(text);
    } catch {
      show("AI request failed", "error");
    } finally {
      setAskBusy(false);
    }
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Spinner className="h-6 w-6 text-accent" /></div>;
  }
  if (!student) {
    return <EmptyState title="Student not found" description="This student may have been removed." />;
  }

  return (
    <div className="space-y-5">
      <Link href="/school/students" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Students
      </Link>

      <div className="sk-animate-fade-up flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <Avatar name={student.name} url={student.photo_url} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">{student.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Class {student.class ?? "—"}</span>
            {student.roll_no && <span>· Roll {student.roll_no}</span>}
            {classRank && <Pill tone="blue">Rank {classRank.rank}/{classRank.total}</Pill>}
            <Pill tone={student.status === "active" ? "green" : "gray"}>{student.status}</Pill>
          </div>
          {student.parent_name && (
            <p className="mt-1 text-sm text-muted">Guardian: {student.parent_name}{student.parent_phone ? ` · ${student.parent_phone}` : ""}</p>
          )}
        </div>
        <button
          onClick={async () => {
            try { await printIdCardHTML({ schoolName, logoUrl, letterhead, student }); }
            catch { show("Could not print", "error"); }
          }}
          className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"
        >
          <IdCard className="h-4 w-4" /> ID Card
        </button>
      </div>

      <div className="sk-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attendance" value={attPct === null ? "—" : `${attPct}%`} />
        <StatCard label="Exam average" value={examAvg === null ? "—" : `${examAvg}%`} hint={examAvg !== null && bands ? gradeFor(examAvg, bands) : undefined} />
        <StatCard label="Outstanding fees" value={`Rs. ${unpaid.toLocaleString()}`} />
        <StatCard label="Documents" value={docs.length} />
      </div>

      {/* AI summary */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-accent" /> AI Insights</h2>
          <button onClick={genSummary} disabled={aiBusy} className="sk-press rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent-soft disabled:opacity-50">
            {aiBusy ? "Generating…" : "Generate summary"}
          </button>
        </div>
        {summary ? (
          <p className="whitespace-pre-wrap text-sm text-muted">{summary}</p>
        ) : (
          <p className="text-sm text-muted">Generate an AI performance summary based on this student&apos;s data.</p>
        )}
        <div className="mt-4 flex gap-2">
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAI()}
            placeholder="Ask about this student…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button onClick={askAI} disabled={askBusy || !ask.trim()} className="sk-press inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
            {askBusy ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        {askAns && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-accent-soft/40 p-3 text-sm">{askAns}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Recent results">
          {exams.length === 0 ? <Muted>No results recorded.</Muted> : (
            <ul className="divide-y divide-border text-sm">
              {exams.slice(0, 8).map((e) => {
                const pct = e.total_marks ? Math.round((Number(e.marks) / Number(e.total_marks)) * 100) : null;
                return (
                  <li key={e.id} className="flex items-center justify-between py-2">
                    <span>{e.subject ?? "—"}</span>
                    <span className="text-muted">{e.marks}/{e.total_marks ?? "—"}{pct !== null ? ` · ${pct}%` : ""}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Fee history">
          {fees.length === 0 ? <Muted>No fee records.</Muted> : (
            <ul className="divide-y divide-border text-sm">
              {fees.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2">
                  <span>{f.month ?? "—"}</span>
                  <span className="flex items-center gap-2 text-muted">
                    Rs. {Number(f.amount ?? 0).toLocaleString()}
                    <Pill tone={f.status === "paid" ? "green" : f.status === "partial" ? "amber" : "red"}>{f.status}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Homework / assignments">
          {assignments.length === 0 ? <Muted>No assignments for this class.</Muted> : (
            <ul className="divide-y divide-border text-sm">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <span>{a.title}{a.subject ? ` · ${a.subject}` : ""}</span>
                  <span className="text-muted">{a.due_date ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Documents">
          {docs.length === 0 ? <Muted>No documents.</Muted> : (
            <ul className="divide-y divide-border text-sm">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <span>{d.title ?? d.type}</span>
                  <span className="text-muted">{new Date(d.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
