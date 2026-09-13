"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardCheck, Plus, X } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow } from "@/lib/school/queries";
import type { Semester, Course, CourseOffering, Enrollment } from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  Field,
  Select,
  Pill,
  useToast,
} from "@/components/school/ui";

interface Student {
  id: string;
  name: string;
  registration_number: string | null;
}

export default function RegistrationPage() {
  return (
    <ModuleGuard module="registration">
      <RegistrationInner />
    </ModuleGuard>
  );
}

function RegistrationInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [semId, setSemId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [s, st, c] = await Promise.all([
      sb().from("semesters").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb().from("students").select("id,name,registration_number").eq("school_id", schoolId).order("name"),
      sb().from("courses").select("*").eq("school_id", schoolId),
    ]);
    const sems = (s.data ?? []) as Semester[];
    setSemesters(sems);
    setStudents((st.data ?? []) as Student[]);
    setCourses((c.data ?? []) as Course[]);
    setSemId((prev) => prev || sems.find((x) => x.is_current)?.id || sems[0]?.id || "");
    setLoading(false);
  }, [schoolId]);

  const loadOfferings = useCallback(async (sid: string) => {
    if (!sid) return setOfferings([]);
    const { data } = await sb().from("course_offerings").select("*").eq("semester_id", sid);
    const offs = (data ?? []) as CourseOffering[];
    setOfferings(offs);
    // enrolled counts per offering
    const ids = offs.map((o) => o.id);
    if (ids.length) {
      const { data: enr } = await sb().from("enrollments").select("offering_id,status").in("offering_id", ids);
      const map: Record<string, number> = {};
      for (const e of (enr ?? []) as { offering_id: string; status: string }[]) {
        if (e.status === "enrolled") map[e.offering_id] = (map[e.offering_id] || 0) + 1;
      }
      setCounts(map);
    } else setCounts({});
  }, []);

  const loadEnrollments = useCallback(async (sid: string, stId: string) => {
    if (!sid || !stId) return setEnrollments([]);
    const { data: offs } = await sb().from("course_offerings").select("id").eq("semester_id", sid);
    const ids = ((offs ?? []) as { id: string }[]).map((o) => o.id);
    if (!ids.length) return setEnrollments([]);
    const { data } = await sb().from("enrollments").select("*").eq("student_id", stId).in("offering_id", ids);
    setEnrollments((data ?? []) as Enrollment[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadOfferings(semId);
  }, [semId, loadOfferings]);
  useEffect(() => {
    loadEnrollments(semId, studentId);
  }, [semId, studentId, loadEnrollments]);

  const courseFor = (offeringId: string) => {
    const off = offerings.find((o) => o.id === offeringId);
    return off ? courses.find((c) => c.id === off.course_id) : undefined;
  };
  const enrollmentFor = (offeringId: string) => enrollments.find((e) => e.offering_id === offeringId && e.status !== "dropped");

  const totalCredits = enrollments
    .filter((e) => e.status === "enrolled" || e.status === "waitlisted")
    .reduce((sum, e) => sum + (courseFor(e.offering_id)?.credits ?? 0), 0);

  async function enroll(offering: CourseOffering) {
    if (!studentId) {
      show("Select a student first");
      return;
    }
    setBusyId(offering.id);
    try {
      const enrolled = counts[offering.id] ?? 0;
      const status = enrolled >= offering.capacity ? "waitlisted" : "enrolled";
      const existing = enrollments.find((e) => e.offering_id === offering.id);
      if (existing) {
        await updateRow("enrollments", existing.id, { status });
      } else {
        await insertRow("enrollments", schoolId!, {
          offering_id: offering.id,
          student_id: studentId,
          status,
        });
      }
      show(status === "waitlisted" ? "Added to waitlist (section full)" : "Enrolled");
      await Promise.all([loadOfferings(semId), loadEnrollments(semId, studentId)]);
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  async function drop(enrollment: Enrollment) {
    setBusyId(enrollment.offering_id);
    try {
      await updateRow("enrollments", enrollment.id, { status: "dropped" });
      show("Dropped");
      await Promise.all([loadOfferings(semId), loadEnrollments(semId, studentId)]);
    } catch (e) {
      show(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const regWindow = semesters.find((s) => s.id === semId);

  return (
    <div>
      <PageHeader
        title="Semester Registration"
        description="Enroll students into course offerings. Full sections auto-waitlist."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      ) : semesters.length === 0 ? (
        <EmptyState title="No semesters" description="Create a semester and offerings first." />
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field label="Semester">
              <Select value={semId} onChange={(e) => setSemId(e.target.value)}>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.is_current ? " (current)" : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Student">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— Select student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.registration_number ? `${s.registration_number} · ` : ""}{s.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          {regWindow?.reg_start && (
            <p className="mb-4 text-xs text-muted">
              Registration window: {regWindow.reg_start} → {regWindow.reg_end || "open"}
            </p>
          )}

          {studentId && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
              <ClipboardCheck className="h-4 w-4 text-accent" />
              Registered load: <strong>{totalCredits} credit hours</strong> across{" "}
              {enrollments.filter((e) => e.status !== "dropped").length} course(s)
            </div>
          )}

          {offerings.length === 0 ? (
            <EmptyState description="No course offerings in this semester." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                    <th className="px-4 py-2.5 font-medium">Course</th>
                    <th className="px-4 py-2.5 font-medium">Section</th>
                    <th className="px-4 py-2.5 font-medium">Credits</th>
                    <th className="px-4 py-2.5 font-medium">Seats</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((o) => {
                    const c = courses.find((x) => x.id === o.course_id);
                    const enrolled = counts[o.id] ?? 0;
                    const mine = enrollmentFor(o.id);
                    const full = enrolled >= o.capacity;
                    return (
                      <tr key={o.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                        <td className="px-4 py-2.5">{c ? `${c.code} — ${c.title}` : "—"}</td>
                        <td className="px-4 py-2.5">{o.section}</td>
                        <td className="px-4 py-2.5">{c?.credits ?? "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={full ? "text-danger" : ""}>{enrolled}/{o.capacity}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {mine ? (
                            <Pill tone={mine.status === "waitlisted" ? "amber" : "green"}>{mine.status}</Pill>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {mine ? (
                            <button
                              onClick={() => drop(mine)}
                              disabled={busyId === o.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" /> Drop
                            </button>
                          ) : (
                            <button
                              onClick={() => enroll(o)}
                              disabled={!studentId || busyId === o.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" /> {full ? "Waitlist" : "Enroll"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
