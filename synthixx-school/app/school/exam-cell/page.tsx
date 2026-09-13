"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, FileCheck2 } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, deleteRow } from "@/lib/school/queries";
import type { Semester, Course } from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  StatCard,
  Modal,
  Field,
  Input,
  Select,
  Pill,
  useToast,
} from "@/components/school/ui";

interface ExamSession {
  id: string;
  title: string;
  course_id: string | null;
  semester_id: string | null;
  exam_date: string | null;
  start_time: string | null;
  duration_min: number;
  room_id: string | null;
  status: string;
}
interface Room {
  id: string;
  name: string;
}

export default function ExamCellPage() {
  return (
    <ModuleGuard module="exam-cell">
      <ExamCellInner />
    </ModuleGuard>
  );
}

function ExamCellInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [e, c, s, r] = await Promise.all([
      sb().from("exam_sessions").select("*").eq("school_id", schoolId).order("exam_date"),
      sb().from("courses").select("*").eq("school_id", schoolId).order("code"),
      sb().from("semesters").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb().from("rooms").select("id,name").eq("school_id", schoolId).order("name"),
    ]);
    setSessions((e.data ?? []) as ExamSession[]);
    setCourses((c.data ?? []) as Course[]);
    setSemesters((s.data ?? []) as Semester[]);
    setRooms((r.data ?? []) as Room[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const courseLabel = (id: string | null) => {
    const c = courses.find((x) => x.id === id);
    return c ? `${c.code} — ${c.title}` : "—";
  };
  const roomName = (id: string | null) => rooms.find((r) => r.id === id)?.name ?? "—";

  async function remove(id: string) {
    if (!confirm("Delete this exam session?")) return;
    await deleteRow("exam_sessions", id);
    show("Deleted");
    load();
  }
  async function complete(id: string) {
    await updateRow("exam_sessions", id, { status: "completed" });
    show("Marked completed");
    load();
  }

  const upcoming = sessions.filter((s) => s.status === "scheduled").length;

  return (
    <div>
      <PageHeader
        title="Examination Cell"
        description="Schedule exam sessions, assign rooms and invigilation."
        actions={
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <Plus className="h-4 w-4" /> Schedule exam
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Exam sessions" value={sessions.length} icon={<FileCheck2 className="h-4 w-4" />} />
        <StatCard label="Upcoming" value={upcoming} />
        <StatCard label="Rooms" value={rooms.length} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : sessions.length === 0 ? (
        <EmptyState title="No exam sessions" description="Schedule your first exam to build the datesheet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Exam</th>
                <th className="px-4 py-2.5 font-medium">Course</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Room</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                  <td className="px-4 py-2.5 font-medium">{s.title}</td>
                  <td className="px-4 py-2.5">{courseLabel(s.course_id)}</td>
                  <td className="px-4 py-2.5">{s.exam_date || "—"}</td>
                  <td className="px-4 py-2.5">{s.start_time?.slice(0, 5) || "—"} · {s.duration_min}m</td>
                  <td className="px-4 py-2.5">{roomName(s.room_id)}</td>
                  <td className="px-4 py-2.5"><Pill tone={s.status === "completed" ? "blue" : s.status === "cancelled" ? "red" : "green"}>{s.status}</Pill></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {s.status === "scheduled" && (
                        <button onClick={() => complete(s.id)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent-soft">Done</button>
                      )}
                      <button onClick={() => remove(s.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ScheduleExam
          schoolId={schoolId!}
          courses={courses}
          semesters={semesters}
          rooms={rooms}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); show("Exam scheduled"); }}
        />
      )}
    </div>
  );
}

function ScheduleExam({
  schoolId,
  courses,
  semesters,
  rooms,
  onClose,
  onSaved,
}: {
  schoolId: string;
  courses: Course[];
  semesters: Semester[];
  rooms: Room[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ duration_min: "180" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("exam_sessions", schoolId, {
        title: form.title,
        course_id: form.course_id || null,
        semester_id: form.semester_id || null,
        exam_date: form.exam_date || null,
        start_time: form.start_time || null,
        duration_min: Number(form.duration_min) || 180,
        room_id: form.room_id || null,
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Schedule exam">
      <div className="space-y-3">
        <Field label="Title"><Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Midterm — CS101" /></Field>
        <Field label="Course">
          <Select value={form.course_id || ""} onChange={(e) => set("course_id", e.target.value)}>
            <option value="">— Select —</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </Select>
        </Field>
        <Field label="Semester">
          <Select value={form.semester_id || ""} onChange={(e) => set("semester_id", e.target.value)}>
            <option value="">— Select —</option>
            {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date"><Input type="date" value={form.exam_date || ""} onChange={(e) => set("exam_date", e.target.value)} /></Field>
          <Field label="Time"><Input type="time" value={form.start_time || ""} onChange={(e) => set("start_time", e.target.value)} /></Field>
          <Field label="Minutes"><Input type="number" value={form.duration_min} onChange={(e) => set("duration_min", e.target.value)} /></Field>
        </div>
        <Field label="Room">
          <Select value={form.room_id || ""} onChange={(e) => set("room_id", e.target.value)}>
            <option value="">— Select —</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <button onClick={save} disabled={busy || !form.title} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy && <Spinner className="h-4 w-4" />} Schedule
        </button>
      </div>
    </Modal>
  );
}
