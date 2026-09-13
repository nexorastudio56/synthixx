"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, FlaskConical } from "lucide-react";
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

interface Thesis {
  id: string;
  student_id: string;
  supervisor_id: string | null;
  title: string;
  status: string;
  defense_date: string | null;
  grade: string | null;
}
interface Student {
  id: string;
  name: string;
}
interface Teacher {
  id: string;
  name: string;
}

const STATUSES = ["proposal", "in_progress", "submitted", "defended", "completed"];

export default function ResearchPage() {
  return (
    <ModuleGuard module="research">
      <ResearchInner />
    </ModuleGuard>
  );
}

function ResearchInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Thesis[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [p, s, t] = await Promise.all([
      sb().from("thesis_projects").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb().from("students").select("id,name").eq("school_id", schoolId).order("name"),
      sb().from("teachers").select("id,name").eq("school_id", schoolId).order("name"),
    ]);
    setProjects((p.data ?? []) as Thesis[]);
    setStudents((s.data ?? []) as Student[]);
    setTeachers((t.data ?? []) as Teacher[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "—";
  const teacherName = (id: string | null) => teachers.find((t) => t.id === id)?.name ?? "—";

  async function setStatus(id: string, status: string) {
    await updateRow("thesis_projects", id, { status });
    show("Updated");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    await deleteRow("thesis_projects", id);
    show("Deleted");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Research & Thesis"
        description="Track thesis projects, supervisors and defense progress."
        actions={
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <Plus className="h-4 w-4" /> New project
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Projects" value={projects.length} icon={<FlaskConical className="h-4 w-4" />} />
        <StatCard label="In progress" value={projects.filter((p) => p.status === "in_progress").length} />
        <StatCard label="Completed" value={projects.filter((p) => p.status === "completed").length} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : projects.length === 0 ? (
        <EmptyState title="No research projects" description="Add a thesis project to start tracking." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Student</th>
                <th className="px-4 py-2.5 font-medium">Supervisor</th>
                <th className="px-4 py-2.5 font-medium">Defense</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                  <td className="px-4 py-2.5 font-medium">{p.title}</td>
                  <td className="px-4 py-2.5">{studentName(p.student_id)}</td>
                  <td className="px-4 py-2.5">{teacherName(p.supervisor_id)}</td>
                  <td className="px-4 py-2.5">{p.defense_date || "—"}</td>
                  <td className="px-4 py-2">
                    <Select value={p.status} onChange={(e) => setStatus(p.id, e.target.value)} className="w-36 py-1.5">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AddThesis schoolId={schoolId!} students={students} teachers={teachers} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); show("Project added"); }} />
      )}
    </div>
  );
}

function AddThesis({ schoolId, students, teachers, onClose, onSaved }: { schoolId: string; students: Student[]; teachers: Teacher[]; onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("thesis_projects", schoolId, {
        title: form.title,
        student_id: form.student_id,
        supervisor_id: form.supervisor_id || null,
        abstract: form.abstract || null,
        defense_date: form.defense_date || null,
        status: "proposal",
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New research project">
      <div className="space-y-3">
        <Field label="Title"><Input value={form.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Thesis title" /></Field>
        <Field label="Student">
          <Select value={form.student_id || ""} onChange={(e) => set("student_id", e.target.value)}>
            <option value="">— Select —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Supervisor">
          <Select value={form.supervisor_id || ""} onChange={(e) => set("supervisor_id", e.target.value)}>
            <option value="">— Select —</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Abstract (optional)"><Textarea value={form.abstract || ""} onChange={(e) => set("abstract", e.target.value)} rows={3} /></Field>
        <Field label="Defense date (optional)"><Input type="date" value={form.defense_date || ""} onChange={(e) => set("defense_date", e.target.value)} /></Field>
        <button onClick={save} disabled={busy || !form.title || !form.student_id} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy && <Spinner className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
}
