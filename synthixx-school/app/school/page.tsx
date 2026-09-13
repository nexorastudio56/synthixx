"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, GraduationCap, Wallet, AlertCircle, Plus, CalendarCheck } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { getAIInsight } from "@/lib/school/ai";
import { PageHeader, StatCard, AIInsightCard, Pill, Spinner } from "@/components/school/ui";
import { BarChart, LineChart, type Point } from "@/components/school/charts";

export default function DashboardPage() {
  return (
    <ModuleGuard module="dashboard">
      <Dashboard />
    </ModuleGuard>
  );
}

interface Stats {
  students: number;
  teachers: number;
  collected: number;
  pending: number;
  todayPresent: number;
  todayAbsent: number;
}

interface Charts {
  collection: Point[];
  attendance: Point[];
  classStrength: Point[];
}

function Dashboard() {
  const { schoolId, schoolName } = useSchool();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const today = new Date().toISOString().slice(0, 10);
      const [s, t, f, a, sList, aList] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
        supabase.from("fees").select("amount,status,paid_date").eq("school_id", schoolId),
        supabase.from("attendance").select("status").eq("school_id", schoolId).eq("date", today),
        supabase.from("students").select("class").eq("school_id", schoolId),
        supabase.from("attendance").select("status,date").eq("school_id", schoolId).gte("date", daysAgo(13)),
      ]);
      const fees = (f.data ?? []) as { amount: number; status: string; paid_date: string | null }[];
      const att = (a.data ?? []) as { status: string }[];
      const studentRows = (sList.data ?? []) as { class: string | null }[];
      const attRows = (aList.data ?? []) as { status: string; date: string }[];

      setStats({
        students: s.count ?? 0,
        teachers: t.count ?? 0,
        collected: fees.filter((x) => x.status === "paid").reduce((sum, x) => sum + (Number(x.amount) || 0), 0),
        pending: fees.filter((x) => x.status !== "paid").reduce((sum, x) => sum + (Number(x.amount) || 0), 0),
        todayPresent: att.filter((x) => x.status === "present").length,
        todayAbsent: att.filter((x) => x.status === "absent").length,
      });

      setCharts({
        collection: monthlyCollection(fees),
        attendance: attendanceTrend(attRows),
        classStrength: classStrength(studentRows),
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title={`Welcome${schoolName ? `, ${schoolName}` : ""}`} description="Your school at a glance." />

      {loading || !stats ? (
        <div className="flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Students" value={stats.students} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Total Teachers" value={stats.teachers} icon={<GraduationCap className="h-4 w-4" />} />
            <StatCard label="Fees Collected" value={`Rs. ${stats.collected.toLocaleString()}`} icon={<Wallet className="h-4 w-4" />} />
            <StatCard label="Pending Fees" value={`Rs. ${stats.pending.toLocaleString()}`} icon={<AlertCircle className="h-4 w-4" />} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-1">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold"><CalendarCheck className="h-4 w-4 text-accent" /> Today&apos;s Attendance</h3>
              <div className="mt-3 flex items-center gap-2">
                <Pill tone="green">{stats.todayPresent} present</Pill>
                <Pill tone="red">{stats.todayAbsent} absent</Pill>
              </div>
              {stats.todayPresent + stats.todayAbsent === 0 && (
                <p className="mt-2 text-xs text-muted">No attendance marked today.</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold">Quick actions</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <QuickAction href="/school/students" icon={<Users className="h-4 w-4" />} label="Add students" />
                <QuickAction href="/school/fees" icon={<Wallet className="h-4 w-4" />} label="Collect fees" />
                <QuickAction href="/school/attendance" icon={<CalendarCheck className="h-4 w-4" />} label="Mark attendance" />
                <QuickAction href="/school/ai-assistant" icon={<Plus className="h-4 w-4" />} label="Ask AI" />
              </div>
            </div>
          </div>

          {charts && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ChartCard title="Fee collection (last 6 months)">
                <BarChart data={charts.collection} prefix="Rs." />
              </ChartCard>
              <ChartCard title="Attendance trend (present %)">
                <LineChart data={charts.attendance} />
              </ChartCard>
              <ChartCard title="Class strength" className="lg:col-span-2">
                <BarChart data={charts.classStrength} />
              </ChartCard>
            </div>
          )}

          <div className="mt-4">
            <AIInsightCard
              title="AI Insight"
              description="A quick, data-driven read on your school right now."
              buttonLabel="Generate insight"
              onRun={() =>
                getAIInsight(
                  "Give the principal a short, practical insight (4-6 lines) based on these numbers. Mention the most important thing to act on. Respond in the principal's likely language (English/Urdu mix is fine).",
                  `School: ${schoolName}. Students: ${stats.students}, Teachers: ${stats.teachers}, Fees collected: Rs.${stats.collected}, Pending fees: Rs.${stats.pending}, Today present: ${stats.todayPresent}, Today absent: ${stats.todayAbsent}.`,
                )
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent-soft">
      {icon} {label}
    </Link>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function monthlyCollection(fees: { amount: number; status: string; paid_date: string | null }[]): Point[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en", { month: "short" }) });
  }
  return months.map((m) => ({
    label: m.label,
    value: fees
      .filter((f) => f.status === "paid" && (f.paid_date ?? "").slice(0, 7) === m.key)
      .reduce((s, f) => s + (Number(f.amount) || 0), 0),
  }));
}

function attendanceTrend(rows: { status: string; date: string }[]): Point[] {
  const byDate = new Map<string, { present: number; total: number }>();
  for (const r of rows) {
    const e = byDate.get(r.date) ?? { present: 0, total: 0 };
    e.total += 1;
    if (r.status === "present") e.present += 1;
    byDate.set(r.date, e);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ label: date.slice(5), value: v.total ? Math.round((v.present / v.total) * 100) : 0 }));
}

function classStrength(rows: { class: string | null }[]): Point[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = (r.class || "—").trim() || "—";
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }));
}
