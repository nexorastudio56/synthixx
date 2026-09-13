"use client";

import { useEffect, useState, useCallback } from "react";
import { GraduationCap, BookOpen, Wallet, Award } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { computeGPA, type Course, type CourseOffering, type Enrollment, type Semester } from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  StatCard,
  Pill,
} from "@/components/school/ui";

interface StudentRow {
  id: string;
  name: string;
  registration_number: string | null;
  cgpa: number | null;
  program_id: string | null;
  status: string;
}

interface Fee {
  id: string;
  amount: number;
  status: string;
  month: string | null;
}

export default function PortalPage() {
  return (
    <ModuleGuard module="portal">
      <PortalInner />
    </ModuleGuard>
  );
}

function PortalInner() {
  const { schoolId, studentId, email } = useSchool();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);

    // Resolve the student record: prefer the linked student_id, else match email.
    let stu: StudentRow | null = null;
    if (studentId) {
      const { data } = await sb().from("students").select("id,name,registration_number,cgpa,program_id,status").eq("id", studentId).maybeSingle();
      stu = (data as StudentRow) ?? null;
    }
    if (!stu && email) {
      const { data } = await sb().from("students").select("id,name,registration_number,cgpa,program_id,status").eq("school_id", schoolId).ilike("name", email).maybeSingle();
      stu = (data as StudentRow) ?? null;
    }
    setStudent(stu);

    if (stu) {
      const { data: enr } = await sb().from("enrollments").select("*").eq("student_id", stu.id);
      const enrollments = (enr ?? []) as Enrollment[];
      setEnrollments(enrollments);
      const offIds = [...new Set(enrollments.map((e) => e.offering_id))];
      if (offIds.length) {
        const { data: offs } = await sb().from("course_offerings").select("*").in("id", offIds);
        setOfferings((offs ?? []) as CourseOffering[]);
      }
      const [c, s, f] = await Promise.all([
        sb().from("courses").select("*").eq("school_id", schoolId),
        sb().from("semesters").select("*").eq("school_id", schoolId),
        sb().from("fees").select("id,amount,status,month").eq("student_id", stu.id),
      ]);
      setCourses((c.data ?? []) as Course[]);
      setSemesters((s.data ?? []) as Semester[]);
      setFees((f.data ?? []) as Fee[]);
    }
    setLoading(false);
  }, [schoolId, studentId, email]);

  useEffect(() => {
    load();
  }, [load]);

  const courseOf = (offeringId: string) => {
    const off = offerings.find((o) => o.id === offeringId);
    return off ? courses.find((c) => c.id === off.course_id) : undefined;
  };
  const semOf = (offeringId: string) => {
    const off = offerings.find((o) => o.id === offeringId);
    return off ? semesters.find((s) => s.id === off.semester_id) : undefined;
  };

  const active = enrollments.filter((e) => e.status !== "dropped");
  const graded = active
    .filter((e) => e.grade && courseOf(e.offering_id))
    .map((e) => ({ credits: courseOf(e.offering_id)!.credits, points: e.grade_points ?? 0 }));
  const cgpa = student?.cgpa ?? computeGPA(graded);
  const earnedCredits = graded.reduce((s, i) => s + i.credits, 0);
  const feeDue = fees.filter((f) => f.status !== "paid").reduce((s, f) => s + Number(f.amount || 0), 0);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>;
  }

  if (!student) {
    return (
      <div>
        <PageHeader title="Student Portal" />
        <EmptyState
          title="No linked student record"
          description="Your account isn't linked to a student profile yet. Ask your registrar to link your enrollment."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${student.name}`}
        description={student.registration_number ? `Registration #: ${student.registration_number}` : "Your academic portal"}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="CGPA" value={Number(cgpa).toFixed(2)} icon={<Award className="h-4 w-4" />} />
        <StatCard label="Credits earned" value={earnedCredits} icon={<GraduationCap className="h-4 w-4" />} />
        <StatCard label="Active courses" value={active.length} icon={<BookOpen className="h-4 w-4" />} />
        <StatCard label="Fee due" value={feeDue > 0 ? feeDue.toLocaleString() : "0"} icon={<Wallet className="h-4 w-4" />} hint={feeDue > 0 ? "Outstanding" : "All clear"} />
      </div>

      <h3 className="mb-2 text-sm font-semibold">My courses</h3>
      {active.length === 0 ? (
        <EmptyState description="You are not enrolled in any courses yet." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                <th className="px-4 py-2.5 font-medium">Code</th>
                <th className="px-4 py-2.5 font-medium">Course</th>
                <th className="px-4 py-2.5 font-medium">Semester</th>
                <th className="px-4 py-2.5 font-medium">Credits</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {active.map((e) => {
                const c = courseOf(e.offering_id);
                const sem = semOf(e.offering_id);
                return (
                  <tr key={e.id} className="border-b border-border bg-surface last:border-0">
                    <td className="px-4 py-2.5 font-medium">{c?.code || "—"}</td>
                    <td className="px-4 py-2.5">{c?.title || "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{sem?.name || "—"}</td>
                    <td className="px-4 py-2.5">{c?.credits ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Pill tone={e.status === "waitlisted" ? "amber" : e.status === "completed" ? "blue" : "green"}>{e.status}</Pill>
                    </td>
                    <td className="px-4 py-2.5">{e.grade || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
