"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, TrendingDown, Wallet, GraduationCap, Sparkles } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { getAIInsight } from "@/lib/school/ai";
import { printDocument } from "@/components/school/print";
import type { Student, Fee, Attendance, Exam } from "@/lib/school/types";
import { PageHeader, StatCard, AIInsightCard, Spinner, useToast, Pill } from "@/components/school/ui";
import { BarChart, DonutChart } from "@/components/school/charts";

export default function AnalyticsPage() {
  return (
    <ModuleGuard module="analytics">
      <AnalyticsView />
    </ModuleGuard>
  );
}

function AnalyticsView() {
  const { schoolId, schoolName } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [reportBusy, setReportBusy] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [s, f, a, e] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", schoolId),
        supabase.from("fees").select("*").eq("school_id", schoolId),
        supabase.from("attendance").select("*").eq("school_id", schoolId).limit(2000),
        supabase.from("exams").select("*").eq("school_id", schoolId).limit(2000),
      ]);
      setStudents((s.data ?? []) as Student[]);
      setFees((f.data ?? []) as Fee[]);
      setAtt((a.data ?? []) as Attendance[]);
      setExams((e.data ?? []) as Exam[]);
    } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const nameOf = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  // Dropout risk = attendance < 60%
  const atRisk = useMemo(() => {
    const m = new Map<string, { p: number; t: number }>();
    for (const a of att) {
      if (!a.student_id) continue;
      const g = m.get(a.student_id) ?? { p: 0, t: 0 };
      g.t += 1;
      if (a.status === "present") g.p += 1;
      m.set(a.student_id, g);
    }
    return [...m.entries()]
      .map(([id, g]) => ({ id, pct: Math.round((g.p / g.t) * 100) }))
      .filter((x) => x.pct < 60)
      .sort((a, b) => a.pct - b.pct);
  }, [att]);

  const feeDefaulters = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fees.filter((x) => x.status !== "paid")) {
      if (!f.student_id) continue;
      m.set(f.student_id, (m.get(f.student_id) ?? 0) + (Number(f.amount) || 0));
    }
    return [...m.entries()].map(([id, due]) => ({ id, due })).sort((a, b) => b.due - a.due);
  }, [fees]);

  const classPerf = useMemo(() => {
    const byClass = new Map<string, { sum: number; n: number }>();
    const sClass = new Map(students.map((s) => [s.id, s.class ?? "—"]));
    for (const e of exams) {
      const c = sClass.get(e.student_id ?? "") ?? "—";
      const pct = ((Number(e.marks) || 0) / (Number(e.total_marks) || 100)) * 100;
      const g = byClass.get(c) ?? { sum: 0, n: 0 };
      g.sum += pct; g.n += 1;
      byClass.set(c, g);
    }
    return [...byClass.entries()].map(([c, g]) => ({ c, avg: Math.round(g.sum / g.n) })).sort((a, b) => b.avg - a.avg);
  }, [exams, students]);

  const feeStatusDist = useMemo(() => {
    const c = { paid: 0, partial: 0, unpaid: 0 };
    for (const f of fees) {
      if (f.status === "paid") c.paid++;
      else if (f.status === "partial") c.partial++;
      else c.unpaid++;
    }
    return [
      { label: "Paid", value: c.paid },
      { label: "Partial", value: c.partial },
      { label: "Unpaid", value: c.unpaid },
    ];
  }, [fees]);

  const classPerfChart = useMemo(() => classPerf.map((c) => ({ label: c.c, value: c.avg })), [classPerf]);

  function dataSummary() {
    return `School: ${schoolName}. Students: ${students.length}. At-risk (attendance<60%): ${atRisk.length}. Fee defaulters: ${feeDefaulters.length}, total due Rs.${feeDefaulters.reduce((s, x) => s + x.due, 0)}. Class averages: ${classPerf.map((c) => `${c.c}:${c.avg}%`).join(", ") || "n/a"}. Exam records: ${exams.length}.`;
  }

  async function monthlyReport() {
    setReportBusy(true);
    try {
      const body = await getAIInsight(
        "Write a concise monthly school performance report (sections: Overview, Attendance, Fees, Academics, Recommendations). Use plain text with section headings. Keep it under 400 words.",
        dataSummary(),
      );
      printDocument({ schoolName, title: "Monthly Performance Report", body, meta: new Date().toLocaleDateString() });
    } catch { show("Could not generate report", "error"); }
    finally { setReportBusy(false); }
  }

  if (loading) return <div className="flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div>
      <PageHeader
        title="AI Analytics"
        description="Predictive insights across attendance, fees and academics."
        actions={
          <button onClick={monthlyReport} disabled={reportBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
            {reportBusy ? <Spinner className="h-4 w-4" /> : <Printer className="h-4 w-4" />} Monthly Report
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Students" value={students.length} />
        <StatCard label="Dropout risk" value={atRisk.length} icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Fee defaulters" value={feeDefaulters.length} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Classes tracked" value={classPerf.length} icon={<GraduationCap className="h-4 w-4" />} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Class performance (avg %)</h3>
          <BarChart data={classPerfChart} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Fee status distribution</h3>
          <DonutChart data={feeStatusDist} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><TrendingDown className="h-4 w-4 text-danger" /> Dropout risk (low attendance)</h3>
          {atRisk.length === 0 ? <p className="text-sm text-muted">No at-risk students. 🎉</p> : (
            <ul className="space-y-1.5 text-sm">
              {atRisk.slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-center justify-between"><span>{nameOf.get(x.id) ?? "—"}</span><Pill tone="red">{x.pct}%</Pill></li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Wallet className="h-4 w-4 text-accent" /> Fee default prediction</h3>
          {feeDefaulters.length === 0 ? <p className="text-sm text-muted">No outstanding fees.</p> : (
            <ul className="space-y-1.5 text-sm">
              {feeDefaulters.slice(0, 8).map((x) => (
                <li key={x.id} className="flex items-center justify-between"><span>{nameOf.get(x.id) ?? "—"}</span><Pill tone="amber">Rs. {x.due.toLocaleString()}</Pill></li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-accent" /> Class performance</h3>
          {classPerf.length === 0 ? <p className="text-sm text-muted">No exam data yet.</p> : (
            <ul className="space-y-2 text-sm">
              {classPerf.map((c) => (
                <li key={c.c}>
                  <div className="mb-1 flex justify-between"><span>Class {c.c}</span><span className="text-muted">{c.avg}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-accent-soft"><div className="h-full bg-accent" style={{ width: `${c.avg}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <AIInsightCard
          title="AI recommendations"
          description="Let AI analyze the data and recommend actions."
          buttonLabel="Analyze"
          onRun={() => getAIInsight("As a school analytics advisor, give 4-6 specific, prioritized recommendations based on this data. Be concrete.", dataSummary())}
        />
      </div>

      <div className="mt-4">
        <AIInsightCard
          title="Teacher performance summary"
          description="Qualitative summary based on class results and engagement."
          buttonLabel={"Summarize"}
          onRun={() => getAIInsight("Summarize likely teacher/class performance strengths and gaps from this data, and suggest support. Note that direct teacher metrics are limited.", dataSummary())}
        />
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Sparkles className="h-3.5 w-3.5 text-accent" /> Predictions are AI-assisted estimates based on your current data.</p>
    </div>
  );
}
