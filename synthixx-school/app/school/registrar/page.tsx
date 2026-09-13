"use client";

import { useEffect, useState, useCallback } from "react";
import { Landmark, GraduationCap, Users, BookOpen } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import type { Program, Course, CourseOffering, Enrollment } from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  StatCard,
  Pill,
} from "@/components/school/ui";

interface Student {
  id: string;
  name: string;
  program_id: string | null;
  cgpa: number | null;
  registration_number: string | null;
}

export default function RegistrarPage() {
  return (
    <ModuleGuard module="registrar">
      <RegistrarInner />
    </ModuleGuard>
  );
}

function RegistrarInner() {
  const { schoolId } = useSchool();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [st, p, c, o, e] = await Promise.all([
      sb().from("students").select("id,name,program_id,cgpa,registration_number").eq("school_id", schoolId),
      sb().from("programs").select("*").eq("school_id", schoolId),
      sb().from("courses").select("*").eq("school_id", schoolId),
      sb().from("course_offerings").select("*").eq("school_id", schoolId),
      sb().from("enrollments").select("*").eq("school_id", schoolId),
    ]);
    setStudents((st.data ?? []) as Student[]);
    setPrograms((p.data ?? []) as Program[]);
    setCourses((c.data ?? []) as Course[]);
    setOfferings((o.data ?? []) as CourseOffering[]);
    setEnrollments((e.data ?? []) as Enrollment[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const creditsFor = (studentId: string) => {
    const done = enrollments.filter((e) => e.student_id === studentId && e.status === "completed" && e.grade && e.grade !== "F");
    return done.reduce((sum, e) => {
      const off = offerings.find((o) => o.id === e.offering_id);
      const course = off ? courses.find((c) => c.id === off.course_id) : undefined;
      return sum + (course?.credits ?? 0);
    }, 0);
  };

  const programName = (id: string | null) => programs.find((p) => p.id === id)?.name ?? "Unassigned";

  // Program-wise student counts
  const byProgram = programs.map((p) => ({
    program: p,
    count: students.filter((s) => s.program_id === p.id).length,
  }));

  // Graduation eligibility: earned credits >= program total_credits
  const eligibility = students.map((s) => {
    const prog = programs.find((p) => p.id === s.program_id);
    const earned = creditsFor(s.id);
    const required = prog?.total_credits ?? 0;
    return { student: s, earned, required, eligible: required > 0 && earned >= required };
  });
  const eligibleCount = eligibility.filter((e) => e.eligible).length;
  const activeEnroll = enrollments.filter((e) => e.status === "enrolled" || e.status === "completed").length;

  return (
    <div>
      <PageHeader title="Registrar Dashboard" description="Enrollment overview and graduation eligibility." />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Students" value={students.length} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Programs" value={programs.length} icon={<GraduationCap className="h-4 w-4" />} />
            <StatCard label="Active enrollments" value={activeEnroll} icon={<BookOpen className="h-4 w-4" />} />
            <StatCard label="Graduation-eligible" value={eligibleCount} icon={<Landmark className="h-4 w-4" />} />
          </div>

          <h3 className="mb-2 text-sm font-semibold">Enrollment by program</h3>
          {byProgram.length === 0 ? (
            <EmptyState description="No programs defined yet." />
          ) : (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byProgram.map((b) => (
                <div key={b.program.id} className="rounded-xl border border-border bg-surface p-4">
                  <p className="font-medium">{b.program.name}</p>
                  <p className="text-xs text-muted">{b.program.code || b.program.level}</p>
                  <p className="mt-2 text-2xl font-semibold">{b.count}</p>
                  <p className="text-xs text-muted">students · {b.program.total_credits} cr to graduate</p>
                </div>
              ))}
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold">Graduation eligibility</h3>
          {students.length === 0 ? (
            <EmptyState description="No students yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Program</th>
                    <th className="px-4 py-2.5 font-medium">CGPA</th>
                    <th className="px-4 py-2.5 font-medium">Credits</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibility.map((e) => (
                    <tr key={e.student.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                      <td className="px-4 py-2.5">{e.student.registration_number ? `${e.student.registration_number} · ` : ""}{e.student.name}</td>
                      <td className="px-4 py-2.5">{programName(e.student.program_id)}</td>
                      <td className="px-4 py-2.5">{e.student.cgpa != null ? Number(e.student.cgpa).toFixed(2) : "—"}</td>
                      <td className="px-4 py-2.5">{e.earned}{e.required ? ` / ${e.required}` : ""}</td>
                      <td className="px-4 py-2.5">
                        {e.eligible ? <Pill tone="green">Eligible</Pill> : <Pill tone="gray">In progress</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
