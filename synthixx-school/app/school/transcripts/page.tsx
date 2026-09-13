"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText, Save, Printer } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { updateRow } from "@/lib/school/queries";
import { printHTML, escapeHTML } from "@/components/school/print";
import {
  GRADE_SCALE,
  pointsForGrade,
  computeGPA,
  type Semester,
  type Course,
  type CourseOffering,
  type Enrollment,
} from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  StatCard,
  Field,
  Select,
  useToast,
} from "@/components/school/ui";

interface Student {
  id: string;
  name: string;
  registration_number: string | null;
}

interface Row {
  enrollment: Enrollment;
  offering: CourseOffering | undefined;
  semesterId: string | null;
}

export default function TranscriptsPage() {
  return (
    <ModuleGuard module="transcripts">
      <TranscriptsInner />
    </ModuleGuard>
  );
}

function TranscriptsInner() {
  const { schoolId, schoolName } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowLoading, setRowLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [st, s, c] = await Promise.all([
      sb().from("students").select("id,name,registration_number").eq("school_id", schoolId).order("name"),
      sb().from("semesters").select("*").eq("school_id", schoolId).order("created_at"),
      sb().from("courses").select("*").eq("school_id", schoolId),
    ]);
    setStudents((st.data ?? []) as Student[]);
    setSemesters((s.data ?? []) as Semester[]);
    setCourses((c.data ?? []) as Course[]);
    setLoading(false);
  }, [schoolId]);

  const loadStudent = useCallback(async (stId: string) => {
    if (!stId) return setRows([]);
    setRowLoading(true);
    const { data: enr } = await sb().from("enrollments").select("*").eq("student_id", stId);
    const enrollments = (enr ?? []) as Enrollment[];
    const offIds = [...new Set(enrollments.map((e) => e.offering_id))];
    let offerings: CourseOffering[] = [];
    if (offIds.length) {
      const { data } = await sb().from("course_offerings").select("*").in("id", offIds);
      offerings = (data ?? []) as CourseOffering[];
    }
    const built: Row[] = enrollments
      .filter((e) => e.status !== "dropped")
      .map((e) => {
        const offering = offerings.find((o) => o.id === e.offering_id);
        return { enrollment: e, offering, semesterId: offering?.semester_id ?? null };
      });
    setRows(built);
    setRowLoading(false);
  }, []);

  const courseOf = useCallback(
    (r: Row) => (r.offering ? courses.find((c) => c.id === r.offering!.course_id) : undefined),
    [courses],
  );

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadStudent(studentId);
  }, [studentId, loadStudent]);

  function setGrade(enrollmentId: string, grade: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.enrollment.id === enrollmentId
          ? { ...r, enrollment: { ...r.enrollment, grade, grade_points: grade ? pointsForGrade(grade) : null } }
          : r,
      ),
    );
  }

  // Group rows by semester
  const bySemester = semesters
    .map((sem) => ({
      sem,
      items: rows.filter((r) => r.semesterId === sem.id),
    }))
    .filter((g) => g.items.length > 0);

  const gradedItems = rows
    .filter((r) => r.enrollment.grade && courseOf(r))
    .map((r) => ({ credits: courseOf(r)!.credits, points: r.enrollment.grade_points ?? 0 }));
  const cgpa = computeGPA(gradedItems);
  const totalCredits = gradedItems.reduce((s, i) => s + i.credits, 0);

  function semGPA(items: Row[]): { gpa: number; credits: number } {
    const graded = items
      .filter((r) => r.enrollment.grade && courseOf(r))
      .map((r) => ({ credits: courseOf(r)!.credits, points: r.enrollment.grade_points ?? 0 }));
    return { gpa: computeGPA(graded), credits: graded.reduce((s, i) => s + i.credits, 0) };
  }

  async function saveGrades() {
    setSaving(true);
    try {
      // Persist grades on enrollments.
      await Promise.all(
        rows
          .filter((r) => r.enrollment.grade)
          .map((r) =>
            updateRow("enrollments", r.enrollment.id, {
              grade: r.enrollment.grade,
              grade_points: r.enrollment.grade_points,
              status: "completed",
            }),
          ),
      );
      // Upsert per-semester GPA records + student CGPA.
      for (const g of bySemester) {
        const { gpa, credits } = semGPA(g.items);
        if (!credits) continue;
        await sb()
          .from("gpa_records")
          .upsert(
            {
              school_id: schoolId,
              student_id: studentId,
              semester_id: g.sem.id,
              credits,
              gpa,
              cgpa,
            },
            { onConflict: "student_id,semester_id" },
          );
      }
      await updateRow("students", studentId, { cgpa });
      show("Grades and GPA saved");
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function printTranscript() {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    const body = `
      <p><strong>Student:</strong> ${escapeHTML(student.name)}${student.registration_number ? ` &nbsp; <strong>Reg#:</strong> ${escapeHTML(student.registration_number)}` : ""}</p>
      ${bySemester
        .map((g) => {
          const { gpa, credits } = semGPA(g.items);
          const rowsHtml = g.items
            .map((r) => {
              const c = courseOf(r);
              return `<tr>
                <td>${escapeHTML(c?.code || "")}</td>
                <td>${escapeHTML(c?.title || "")}</td>
                <td style="text-align:center">${c?.credits ?? ""}</td>
                <td style="text-align:center">${escapeHTML(r.enrollment.grade || "—")}</td>
                <td style="text-align:center">${r.enrollment.grade_points ?? "—"}</td>
              </tr>`;
            })
            .join("");
          return `<h3 style="margin:16px 0 6px">${escapeHTML(g.sem.name)}</h3>
            <table style="width:100%;border-collapse:collapse" border="1" cellpadding="6">
              <thead><tr><th>Code</th><th>Course</th><th>Cr</th><th>Grade</th><th>Points</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <p style="margin:6px 0"><strong>Semester GPA:</strong> ${gpa.toFixed(2)} &nbsp; (${credits} credits)</p>`;
        })
        .join("")}
      <hr/>
      <p style="font-size:16px"><strong>CGPA:</strong> ${cgpa.toFixed(2)} &nbsp; <strong>Total credits:</strong> ${totalCredits}</p>`;
    printHTML({ schoolName, title: "Transcript", html: body });
  }

  return (
    <div>
      <PageHeader
        title="GPA & Transcripts"
        description="Enter grades, compute credit-weighted GPA/CGPA, and print transcripts."
        actions={
          studentId && rows.length > 0 ? (
            <div className="flex gap-2">
              <button onClick={printTranscript} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-accent-soft">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button onClick={saveGrades} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
                {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save grades
              </button>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <Field label="Student">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— Select student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.registration_number ? `${s.registration_number} · ` : ""}{s.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          {!studentId ? (
            <EmptyState title="Select a student" description="Choose a student to view enrolled courses and grades." />
          ) : rowLoading ? (
            <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
          ) : rows.length === 0 ? (
            <EmptyState title="No enrollments" description="This student has no course enrollments yet." />
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="CGPA" value={cgpa.toFixed(2)} icon={<ScrollText className="h-4 w-4" />} />
                <StatCard label="Total credits" value={totalCredits} />
                <StatCard label="Courses" value={rows.length} />
              </div>

              {bySemester.map((g) => {
                const { gpa, credits } = semGPA(g.items);
                return (
                  <div key={g.sem.id} className="mb-5">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{g.sem.name}</h3>
                      <span className="text-sm text-muted">GPA <strong className="text-foreground">{gpa.toFixed(2)}</strong> · {credits} cr</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                            <th className="px-4 py-2.5 font-medium">Code</th>
                            <th className="px-4 py-2.5 font-medium">Course</th>
                            <th className="px-4 py-2.5 font-medium">Credits</th>
                            <th className="px-4 py-2.5 font-medium">Grade</th>
                            <th className="px-4 py-2.5 font-medium">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((r) => (
                            <tr key={r.enrollment.id} className="border-b border-border bg-surface last:border-0">
                              <td className="px-4 py-2.5 font-medium">{courseOf(r)?.code || "—"}</td>
                              <td className="px-4 py-2.5">{courseOf(r)?.title || "—"}</td>
                              <td className="px-4 py-2.5">{courseOf(r)?.credits ?? "—"}</td>
                              <td className="px-4 py-2">
                                <Select
                                  value={r.enrollment.grade || ""}
                                  onChange={(e) => setGrade(r.enrollment.id, e.target.value)}
                                  className="w-24 py-1.5"
                                >
                                  <option value="">—</option>
                                  {GRADE_SCALE.map((gr) => (
                                    <option key={gr.grade} value={gr.grade}>{gr.grade}</option>
                                  ))}
                                </Select>
                              </td>
                              <td className="px-4 py-2.5">{r.enrollment.grade ? (r.enrollment.grade_points ?? 0).toFixed(2) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
