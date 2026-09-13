"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Search, Pencil, Upload, Download, IdCard, FileText } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, deleteRow, bulkInsert } from "@/lib/school/queries";
import { toCSV, downloadCSV, parseCSV } from "@/lib/school/csv";
import { printHTML, printIdCardHTML, escapeHTML } from "@/components/school/print";
import { Avatar, AvatarUpload } from "@/components/school/avatar-upload";
import { getAIInsight } from "@/lib/school/ai";
import { gradeFor } from "@/lib/school/grading";
import type { Student, Fee, Attendance, Exam, GradeBand } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select,
  Pill, useToast,
} from "@/components/school/ui";

export default function StudentsPage() {
  return (
    <ModuleGuard module="students">
      <StudentsView />
    </ModuleGuard>
  );
}

function StudentsView() {
  const { schoolId, schoolName, logoUrl, letterhead } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [bands, setBands] = useState<GradeBand[] | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [s, f, a, e, sch] = await Promise.all([
        supabase.from("students").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("fees").select("*").eq("school_id", schoolId),
        supabase.from("attendance").select("*").eq("school_id", schoolId),
        supabase.from("exams").select("*").eq("school_id", schoolId),
        supabase.from("schools").select("grading_scheme,academic_year").eq("id", schoolId).single(),
      ]);
      setStudents((s.data ?? []) as Student[]);
      setFees((f.data ?? []) as Fee[]);
      setAtt((a.data ?? []) as Attendance[]);
      setExams((e.data ?? []) as Exam[]);
      const schoolRow = sch.data as { grading_scheme: GradeBand[] | null; academic_year: string | null } | null;
      setBands(schoolRow?.grading_scheme ?? null);
      setAcademicYear(schoolRow?.academic_year ?? null);
    } catch {
      show("Could not load students", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  // Open the add-student modal when arrived via command-palette quick action.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setEditing(null);
      setOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const classes = useMemo(
    () => [...new Set(students.map((s) => s.class).filter(Boolean))] as string[],
    [students],
  );

  const feeStatus = useCallback((studentId: string) => {
    const rows = fees.filter((f) => f.student_id === studentId);
    if (rows.length === 0) return null;
    if (rows.some((r) => r.status === "unpaid")) return "unpaid";
    if (rows.some((r) => r.status === "partial")) return "partial";
    return "paid";
  }, [fees]);

  const attendancePct = useCallback((studentId: string) => {
    const rows = att.filter((a) => a.student_id === studentId);
    if (rows.length === 0) return null;
    const present = rows.filter((r) => r.status === "present").length;
    return Math.round((present / rows.length) * 100);
  }, [att]);

  const filtered = students.filter((s) => {
    if (classFilter && s.class !== classFilter) return false;
    if (query && !`${s.name} ${s.roll_no ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  async function remove(id: string) {
    if (!confirm("Delete this student?")) return;
    try {
      await deleteRow("students", id);
      setStudents((cur) => cur.filter((s) => s.id !== id));
      show("Student deleted");
    } catch {
      show("Delete failed", "error");
    }
  }

  async function printIdCard(s: Student) {
    try {
      await printIdCardHTML({ schoolName, logoUrl, letterhead, student: s });
    } catch {
      show("Could not print ID card", "error");
    }
  }

  async function printReportCard(s: Student) {
    const ex = exams.filter((e) => e.student_id === s.id);
    const aRows = att.filter((a) => a.student_id === s.id);
    const present = aRows.filter((a) => a.status === "present").length;
    const attPct = aRows.length ? Math.round((present / aRows.length) * 100) : null;
    const totalMarks = ex.reduce((acc, e) => acc + (Number(e.marks) || 0), 0);
    const totalMax = ex.reduce((acc, e) => acc + (Number(e.total_marks) || 0), 0);
    const overallPct = totalMax ? Math.round((totalMarks / totalMax) * 100) : 0;

    const rows = ex.map((e) => {
      const pct = (Number(e.total_marks) || 0) ? Math.round(((Number(e.marks) || 0) / Number(e.total_marks)) * 100) : 0;
      return `<tr><td>${escapeHTML(e.subject ?? "—")}</td><td>${Number(e.marks) || 0} / ${Number(e.total_marks) || 0}</td><td>${pct}%</td><td>${escapeHTML(gradeFor(pct, bands))}</td></tr>`;
    }).join("");

    // Optional AI teacher's remark (graceful fallback if AI isn't configured).
    let remark = "";
    show("Preparing report card…");
    try {
      remark = await getAIInsight(
        "You are a class teacher. Write a short, warm, specific report-card remark (2-3 sentences) for this student based on their results and attendance. No bullet points.",
        `Student: ${s.name}, Class ${s.class ?? "—"}. Overall ${overallPct}% (grade ${gradeFor(overallPct, bands)}). Attendance ${attPct == null ? "n/a" : attPct + "%"}. Subjects: ${ex.map((e) => `${e.subject ?? "?"} ${e.marks}/${e.total_marks}`).join(", ") || "none"}.`,
      );
    } catch {
      /* print without AI remark */
    }

    const html = `
      <table class="kv">
        <tr><th>Student</th><td>${escapeHTML(s.name)}</td><th>Class</th><td>${escapeHTML(s.class ?? "—")}${s.roll_no ? ` · Roll ${escapeHTML(s.roll_no)}` : ""}</td></tr>
        ${academicYear ? `<tr><th>Session</th><td colspan="3">${escapeHTML(academicYear)}</td></tr>` : ""}
      </table>
      <table class="kv">
        <thead><tr><th>Subject / Exam</th><th>Marks</th><th>%</th><th>Grade</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="4" class="muted">No exam records.</td></tr>`}</tbody>
      </table>
      <table class="kv">
        <tr><th>Overall</th><td>${overallPct}% (${escapeHTML(gradeFor(overallPct, bands))})</td><th>Attendance</th><td>${attPct == null ? "—" : `${attPct}%`}</td></tr>
      </table>
      ${remark ? `<p><strong>Teacher's remark:</strong> ${escapeHTML(remark)}</p>` : ""}
      <div class="sign"><div>Class Teacher</div><div>Principal</div></div>`;
    printHTML({ schoolName, logoUrl, letterhead, title: "Report Card", meta: new Date().toLocaleDateString(), html });
  }

  function exportCSV() {
    const csv = toCSV(students, ["name", "class", "roll_no", "parent_name", "parent_phone", "status"]);
    downloadCSV("students.csv", csv);
  }

  async function importCSV(file: File) {
    if (!schoolId) return;
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      const rows = parsed
        .filter((r) => (r.name || "").trim())
        .map((r) => ({
          name: r.name.trim(),
          class: (r.class || "").trim() || null,
          roll_no: (r.roll_no || r["roll no"] || "").trim() || null,
          parent_name: (r.parent_name || r["parent name"] || "").trim() || null,
          parent_phone: (r.parent_phone || r["parent phone"] || "").trim() || null,
          status: "active",
        }));
      if (rows.length === 0) { show("No valid rows found in CSV", "error"); return; }
      const inserted = (await bulkInsert("students", schoolId, rows)) as Student[];
      setStudents((cur) => [...inserted, ...cur]);
      show(`Imported ${inserted.length} students`);
    } catch {
      show("Import failed — check the CSV format", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage student records, fee status and attendance."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <Upload className="h-4 w-4" /> Import
            </button>
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
              <Plus className="h-4 w-4" /> Add Student
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCSV(f); e.target.value = ""; }} />
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Students" value={students.length} />
        <StatCard label="Classes" value={classes.length} />
        <StatCard label="Active" value={students.filter((s) => s.status === "active").length} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or roll no" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="max-w-[180px]">
          <option value="">All classes</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {loading ? (
        <TableSkeleton cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No students" description="Add your first student, or import a CSV." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Fee Status</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="sk-stagger">
              {filtered.map((s) => {
                const fs = feeStatus(s.id);
                const ap = attendancePct(s.id);
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/school/students/${s.id}`} className="flex items-center gap-2.5 hover:text-accent">
                        <Avatar name={s.name} url={s.photo_url} size={32} />
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.class || "—"}</td>
                    <td className="px-4 py-3">{s.roll_no || "—"}</td>
                    <td className="px-4 py-3">
                      {fs === "paid" && <Pill tone="green">Paid</Pill>}
                      {fs === "unpaid" && <Pill tone="red">Unpaid</Pill>}
                      {fs === "partial" && <Pill tone="amber">Partial</Pill>}
                      {fs === null && <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {ap === null ? <span className="text-muted">—</span> : (
                        <span className={ap < 60 ? "text-danger" : ""}>{ap}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => printReportCard(s)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="Report card" title="Report card">
                          <FileText className="h-4 w-4" />
                        </button>
                        <button onClick={() => printIdCard(s)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="ID card" title="ID card">
                          <IdCard className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setEditing(s); setOpen(true); }} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StudentModal
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
        onSaved={(st, isEdit) => {
          setStudents((cur) => isEdit ? cur.map((x) => (x.id === st.id ? st : x)) : [st, ...cur]);
          show(isEdit ? "Student updated" : "Student added");
        }}
      />
    </div>
  );
}

function StudentModal({
  open, editing, onClose, onSaved,
}: { open: boolean; editing: Student | null; onClose: () => void; onSaved: (s: Student, isEdit: boolean) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const blank = { name: "", class: "", roll_no: "", parent_name: "", parent_phone: "" };
  const [form, setForm] = useState(blank);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        name: editing.name ?? "",
        class: editing.class ?? "",
        roll_no: editing.roll_no ?? "",
        parent_name: editing.parent_name ?? "",
        parent_phone: editing.parent_phone ?? "",
      } : blank);
      setPhotoUrl(editing?.photo_url ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.name.trim()) return;
    setBusy(true);
    try {
      const values = {
        name: form.name.trim(),
        class: form.class.trim() || null,
        roll_no: form.roll_no.trim() || null,
        parent_name: form.parent_name.trim() || null,
        parent_phone: form.parent_phone.trim() || null,
        photo_url: photoUrl,
      };
      if (editing) {
        const row = (await updateRow("students", editing.id, values)) as Student;
        onSaved(row, true);
      } else {
        const row = (await insertRow("students", schoolId, values)) as Student;
        onSaved(row, false);
      }
      onClose();
    } catch {
      show("Could not save student", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Student" : "Add Student"}>
      <form onSubmit={submit} className="space-y-3">
        {schoolId && (
          <Field label="Photo">
            <AvatarUpload schoolId={schoolId} entity="students" entityId={editing?.id} name={form.name} value={photoUrl} onChange={setPhotoUrl} />
          </Field>
        )}
        <Field label="Full name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Class"><Input value={form.class} onChange={(e) => set("class", e.target.value)} placeholder="e.g. 5" /></Field>
          <Field label="Roll No"><Input value={form.roll_no} onChange={(e) => set("roll_no", e.target.value)} /></Field>
        </div>
        <Field label="Parent name"><Input value={form.parent_name} onChange={(e) => set("parent_name", e.target.value)} /></Field>
        <Field label="Parent phone"><Input value={form.parent_phone} onChange={(e) => set("parent_phone", e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : editing ? "Save Changes" : "Add Student"}
        </button>
      </form>
    </Modal>
  );
}
