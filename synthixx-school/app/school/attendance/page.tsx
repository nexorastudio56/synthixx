"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Save, ScanLine } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import type { Student, Attendance } from "@/lib/school/types";
import {
  PageHeader, TableSkeleton, EmptyState, Select, Pill, useToast, Spinner,
} from "@/components/school/ui";

type Mark = "present" | "absent";

export default function AttendancePage() {
  return (
    <ModuleGuard module="attendance">
      <AttendanceView />
    </ModuleGuard>
  );
}

function AttendanceView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [klass, setKlass] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [s, a] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", schoolId).eq("status", "active"),
        supabase.from("attendance").select("*").eq("school_id", schoolId).order("date", { ascending: false }).limit(200),
      ]);
      setStudents((s.data ?? []) as Student[]);
      setHistory((a.data ?? []) as Attendance[]);
    } catch {
      show("Could not load", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const classes = useMemo(
    () => [...new Set(students.map((s) => s.class).filter(Boolean))] as string[],
    [students],
  );

  const classStudents = students.filter((s) => !klass || s.class === klass);

  function setMark(id: string, m: Mark) {
    setMarks((cur) => ({ ...cur, [id]: m }));
  }

  async function save() {
    if (!schoolId || classStudents.length === 0) return;
    setSaving(true);
    try {
      const rows = classStudents.map((s) => ({
        school_id: schoolId,
        student_id: s.id,
        date,
        status: marks[s.id] ?? "present",
        class: s.class,
      }));
      const { error } = await sb()
        .from("attendance")
        .upsert(rows, { onConflict: "school_id,student_id,date" });
      if (error) throw error;
      show(`Attendance saved for ${rows.length} students`);
      setMarks({});
      load();
    } catch {
      show("Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  // Group history by date for the "past" view.
  const byDate = useMemo(() => {
    const m = new Map<string, { present: number; absent: number; total: number }>();
    for (const a of history) {
      const g = m.get(a.date) ?? { present: 0, absent: 0, total: 0 };
      g.total += 1;
      if (a.status === "present") g.present += 1;
      else if (a.status === "absent") g.absent += 1;
      m.set(a.date, g);
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);
  }, [history]);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Mark and review daily attendance."
        actions={
          <Link href="/school/attendance/scan" className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
            <ScanLine className="h-4 w-4 text-accent" /> Scan QR
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Class</span>
          <Select value={klass} onChange={(e) => setKlass(e.target.value)} className="w-40">
            <option value="">All classes</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
        </label>
        <button onClick={save} disabled={saving || classStudents.length === 0} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save Attendance
        </button>
      </div>

      {loading ? (
        <TableSkeleton cols={3} />
      ) : classStudents.length === 0 ? (
        <EmptyState title="No students" description="Add students first to mark attendance." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Mark</th></tr>
            </thead>
            <tbody>
              {classStudents.map((s) => {
                const m = marks[s.id] ?? "present";
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.class || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex overflow-hidden rounded-lg border border-border">
                        <button onClick={() => setMark(s.id, "present")} className={`px-3 py-1 text-xs ${m === "present" ? "bg-green-500/20 text-green-600 dark:text-green-400" : "text-muted"}`}>Present</button>
                        <button onClick={() => setMark(s.id, "absent")} className={`px-3 py-1 text-xs ${m === "absent" ? "bg-danger/20 text-danger" : "text-muted"}`}>Absent</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold">Past attendance</h2>
      {byDate.length === 0 ? (
        <p className="text-sm text-muted">No history yet.</p>
      ) : (
        <div className="space-y-1.5">
          {byDate.map(([d, g]) => (
            <div key={d} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
              <span className="font-medium">{d}</span>
              <span className="flex items-center gap-2">
                <Pill tone="green">{g.present} present</Pill>
                <Pill tone="red">{g.absent} absent</Pill>
                <span className="text-muted">{Math.round((g.present / g.total) * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
