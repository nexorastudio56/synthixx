"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, CalendarClock, CheckCircle2 } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, deleteRow } from "@/lib/school/queries";
import type { Semester, Course, CourseOffering } from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  Modal,
  Field,
  Input,
  Select,
  Pill,
  useToast,
} from "@/components/school/ui";

interface Teacher {
  id: string;
  name: string;
}

export default function SemestersPage() {
  return (
    <ModuleGuard module="semesters">
      <SemestersInner />
    </ModuleGuard>
  );
}

function SemestersInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [semModal, setSemModal] = useState(false);
  const [offModal, setOffModal] = useState(false);
  const [activeSem, setActiveSem] = useState<string>("");

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [s, c, t] = await Promise.all([
      sb().from("semesters").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb().from("courses").select("*").eq("school_id", schoolId).order("code"),
      sb().from("teachers").select("id,name").eq("school_id", schoolId).order("name"),
    ]);
    const sems = (s.data ?? []) as Semester[];
    setSemesters(sems);
    setCourses((c.data ?? []) as Course[]);
    setTeachers((t.data ?? []) as Teacher[]);
    const current = sems.find((x) => x.is_current)?.id ?? sems[0]?.id ?? "";
    setActiveSem((prev) => prev || current);
    setLoading(false);
  }, [schoolId]);

  const loadOfferings = useCallback(async (semId: string) => {
    if (!semId) {
      setOfferings([]);
      return;
    }
    const { data } = await sb().from("course_offerings").select("*").eq("semester_id", semId).order("created_at");
    setOfferings((data ?? []) as CourseOffering[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadOfferings(activeSem);
  }, [activeSem, loadOfferings]);

  const courseLabel = (id: string) => {
    const c = courses.find((x) => x.id === id);
    return c ? `${c.code} — ${c.title} (${c.credits} cr)` : "—";
  };
  const teacherName = (id: string | null) => teachers.find((t) => t.id === id)?.name ?? "—";

  async function setCurrent(id: string) {
    try {
      await Promise.all(
        semesters.map((s) => updateRow("semesters", s.id, { is_current: s.id === id })),
      );
      show("Current semester updated");
      load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed");
    }
  }

  async function removeOffering(id: string) {
    if (!confirm("Remove this offering?")) return;
    await deleteRow("course_offerings", id);
    show("Removed");
    loadOfferings(activeSem);
  }

  return (
    <div>
      <PageHeader
        title="Semesters & Offerings"
        description="Manage academic terms and the courses offered each semester."
        actions={
          <button
            onClick={() => setSemModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add semester
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      ) : semesters.length === 0 ? (
        <EmptyState title="No semesters" description="Create a semester (e.g. Fall 2024) to schedule course offerings." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {semesters.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSem(s.id)}
                className={
                  activeSem === s.id
                    ? "flex w-full items-center justify-between rounded-xl border border-accent bg-accent-soft px-3 py-2.5 text-left"
                    : "flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-accent-soft/40"
                }
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted">{s.term ? `${s.term} ${s.year ?? ""}` : ""}</p>
                </div>
                {s.is_current && <Pill tone="green">Current</Pill>}
              </button>
            ))}
          </div>

          <div>
            {activeSem && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <CalendarClock className="h-4 w-4" />
                  {offerings.length} offering{offerings.length !== 1 ? "s" : ""}
                </div>
                <div className="flex gap-2">
                  {!semesters.find((s) => s.id === activeSem)?.is_current && (
                    <button
                      onClick={() => setCurrent(activeSem)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:bg-accent-soft"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Set as current
                    </button>
                  )}
                  <button
                    onClick={() => setOffModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Offer course
                  </button>
                </div>
              </div>
            )}

            {offerings.length === 0 ? (
              <EmptyState description="No course offerings for this semester yet." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                      <th className="px-4 py-2.5 font-medium">Course</th>
                      <th className="px-4 py-2.5 font-medium">Section</th>
                      <th className="px-4 py-2.5 font-medium">Instructor</th>
                      <th className="px-4 py-2.5 font-medium">Room</th>
                      <th className="px-4 py-2.5 font-medium">Capacity</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {offerings.map((o) => (
                      <tr key={o.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                        <td className="px-4 py-2.5">{courseLabel(o.course_id)}</td>
                        <td className="px-4 py-2.5">{o.section}</td>
                        <td className="px-4 py-2.5">{teacherName(o.teacher_id)}</td>
                        <td className="px-4 py-2.5">{o.room || "—"}</td>
                        <td className="px-4 py-2.5">{o.capacity}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => removeOffering(o.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Remove">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {semModal && (
        <AddSemester
          schoolId={schoolId!}
          onClose={() => setSemModal(false)}
          onSaved={() => {
            setSemModal(false);
            load();
            show("Semester added");
          }}
        />
      )}
      {offModal && activeSem && (
        <AddOffering
          schoolId={schoolId!}
          semesterId={activeSem}
          courses={courses}
          teachers={teachers}
          onClose={() => setOffModal(false)}
          onSaved={() => {
            setOffModal(false);
            loadOfferings(activeSem);
            show("Offering added");
          }}
        />
      )}
    </div>
  );
}

function AddSemester({ schoolId, onClose, onSaved }: { schoolId: string; onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ term: "fall" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("semesters", schoolId, {
        name: form.name,
        term: form.term || null,
        year: form.year ? Number(form.year) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        reg_start: form.reg_start || null,
        reg_end: form.reg_end || null,
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add semester">
      <div className="space-y-3">
        <Field label="Name">
          <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Fall 2024" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Term">
            <Select value={form.term} onChange={(e) => set("term", e.target.value)}>
              <option value="fall">Fall</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="winter">Winter</option>
            </Select>
          </Field>
          <Field label="Year">
            <Input type="number" value={form.year || ""} onChange={(e) => set("year", e.target.value)} placeholder="2024" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration opens">
            <Input type="date" value={form.reg_start || ""} onChange={(e) => set("reg_start", e.target.value)} />
          </Field>
          <Field label="Registration closes">
            <Input type="date" value={form.reg_end || ""} onChange={(e) => set("reg_end", e.target.value)} />
          </Field>
        </div>
        <button
          onClick={save}
          disabled={busy || !form.name}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Spinner className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
}

function AddOffering({
  schoolId,
  semesterId,
  courses,
  teachers,
  onClose,
  onSaved,
}: {
  schoolId: string;
  semesterId: string;
  courses: Course[];
  teachers: Teacher[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ section: "A", capacity: "40" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("course_offerings", schoolId, {
        course_id: form.course_id,
        semester_id: semesterId,
        section: form.section || "A",
        teacher_id: form.teacher_id || null,
        room: form.room || null,
        capacity: Number(form.capacity) || 40,
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Offer a course">
      <div className="space-y-3">
        <Field label="Course">
          <Select value={form.course_id || ""} onChange={(e) => set("course_id", e.target.value)}>
            <option value="">— Select course —</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section">
            <Input value={form.section} onChange={(e) => set("section", e.target.value)} />
          </Field>
          <Field label="Capacity">
            <Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
        </div>
        <Field label="Instructor">
          <Select value={form.teacher_id || ""} onChange={(e) => set("teacher_id", e.target.value)}>
            <option value="">— Unassigned —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Room (optional)">
          <Input value={form.room || ""} onChange={(e) => set("room", e.target.value)} placeholder="Lab 2, Block A" />
        </Field>
        <button
          onClick={save}
          disabled={busy || !form.course_id}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Spinner className="h-4 w-4" />} Add offering
        </button>
      </div>
    </Modal>
  );
}
