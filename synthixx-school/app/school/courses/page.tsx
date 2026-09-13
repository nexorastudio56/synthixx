"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, BookMarked, Search } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import type { Course, Department } from "@/lib/school/university";
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
  useToast,
} from "@/components/school/ui";

export default function CoursesPage() {
  return (
    <ModuleGuard module="courses">
      <CoursesInner />
    </ModuleGuard>
  );
}

function CoursesInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [c, d] = await Promise.all([
      sb().from("courses").select("*").eq("school_id", schoolId).order("code"),
      sb().from("departments").select("*").eq("school_id", schoolId).order("name"),
    ]);
    setCourses((c.data ?? []) as Course[]);
    setDepartments((d.data ?? []) as Department[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "—";

  const filtered = courses.filter(
    (c) =>
      !query ||
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.title.toLowerCase().includes(query.toLowerCase()),
  );
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);

  async function remove(id: string) {
    if (!confirm("Delete this course?")) return;
    try {
      await deleteRow("courses", id);
      show("Deleted");
      load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Course Catalog"
        description="All courses with credit hours and prerequisites."
        actions={
          <button
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add course
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Courses" value={courses.length} icon={<BookMarked className="h-4 w-4" />} />
        <StatCard label="Total credit hours" value={totalCredits} />
        <StatCard label="Departments" value={departments.length} />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by code or title…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No courses" description="Add your first course to build the catalog." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Credits</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Prerequisites</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                  <td className="px-4 py-2.5 font-medium">{c.code}</td>
                  <td className="px-4 py-2.5">{c.title}</td>
                  <td className="px-4 py-2.5">{c.credits}</td>
                  <td className="px-4 py-2.5">{deptName(c.department_id)}</td>
                  <td className="px-4 py-2.5 text-muted">{c.prerequisites?.length ? c.prerequisites.join(", ") : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => remove(c.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <AddCourse
          schoolId={schoolId!}
          departments={departments}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            load();
            show("Course added");
          }}
        />
      )}
    </div>
  );
}

function AddCourse({
  schoolId,
  departments,
  onClose,
  onSaved,
}: {
  schoolId: string;
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [credits, setCredits] = useState("3");
  const [deptId, setDeptId] = useState("");
  const [prereq, setPrereq] = useState("");
  const [desc, setDesc] = useState("");

  async function save() {
    setBusy(true);
    try {
      await insertRow("courses", schoolId, {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        credits: Number(credits) || 3,
        department_id: deptId || null,
        prerequisites: prereq
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        description: desc.trim() || null,
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add course">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CS101" />
          </Field>
          <Field label="Credit hours">
            <Input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} />
          </Field>
        </div>
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Introduction to Programming" />
        </Field>
        <Field label="Department">
          <Select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">— Select department —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Prerequisites (comma-separated codes)">
          <Input value={prereq} onChange={(e) => setPrereq(e.target.value)} placeholder="CS100, MATH101" />
        </Field>
        <Field label="Description (optional)">
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        </Field>
        <button
          onClick={save}
          disabled={busy || !code.trim() || !title.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Spinner className="h-4 w-4" />} Save course
        </button>
      </div>
    </Modal>
  );
}
