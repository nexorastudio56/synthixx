// Shared helpers for the university/college layer: grade points, GPA/CGPA
// computation, institution-type checks, and terminology defaults.

import type { InstitutionType } from "@/components/school/school-provider";

export interface Faculty {
  id: string;
  school_id: string;
  campus_id: string | null;
  name: string;
  code: string | null;
  dean_id: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  school_id: string;
  faculty_id: string | null;
  name: string;
  code: string | null;
  hod_id: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  school_id: string;
  department_id: string | null;
  name: string;
  code: string | null;
  level: "diploma" | "undergraduate" | "graduate" | "postgraduate" | "phd";
  duration_years: number;
  total_credits: number;
  created_at: string;
}

export interface Batch {
  id: string;
  school_id: string;
  program_id: string | null;
  name: string;
  intake_year: number | null;
  status: "active" | "graduated" | "archived";
  created_at: string;
}

export interface Semester {
  id: string;
  school_id: string;
  name: string;
  term: "fall" | "spring" | "summer" | "winter" | null;
  year: number | null;
  start_date: string | null;
  end_date: string | null;
  reg_start: string | null;
  reg_end: string | null;
  is_current: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  school_id: string;
  department_id: string | null;
  code: string;
  title: string;
  credits: number;
  description: string | null;
  prerequisites: string[];
  created_at: string;
}

export interface CourseOffering {
  id: string;
  school_id: string;
  course_id: string;
  semester_id: string | null;
  section: string;
  teacher_id: string | null;
  room: string | null;
  schedule: { day: string; start: string; end: string }[];
  capacity: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  school_id: string;
  offering_id: string;
  student_id: string;
  status: "enrolled" | "waitlisted" | "dropped" | "completed";
  grade: string | null;
  grade_points: number | null;
  marks: number | null;
  created_at: string;
}

/** Standard 4.0 letter-grade scale. */
export const GRADE_SCALE: { grade: string; min: number; points: number }[] = [
  { grade: "A", min: 85, points: 4.0 },
  { grade: "A-", min: 80, points: 3.7 },
  { grade: "B+", min: 75, points: 3.3 },
  { grade: "B", min: 71, points: 3.0 },
  { grade: "B-", min: 68, points: 2.7 },
  { grade: "C+", min: 64, points: 2.3 },
  { grade: "C", min: 61, points: 2.0 },
  { grade: "C-", min: 58, points: 1.7 },
  { grade: "D+", min: 54, points: 1.3 },
  { grade: "D", min: 50, points: 1.0 },
  { grade: "F", min: 0, points: 0.0 },
];

/** Map a percentage (0-100) to a letter grade + grade points. */
export function gradeForMarks(marks: number): { grade: string; points: number } {
  const row = GRADE_SCALE.find((g) => marks >= g.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: row.grade, points: row.points };
}

/** Grade points for a letter grade (for manual entry). */
export function pointsForGrade(grade: string): number {
  const row = GRADE_SCALE.find((g) => g.grade === grade.toUpperCase());
  return row?.points ?? 0;
}

/**
 * Credit-weighted GPA from a list of graded courses.
 * GPA = Σ(gradePoints × credits) / Σ(credits).
 */
export function computeGPA(
  items: { credits: number; points: number }[],
): number {
  const totalCredits = items.reduce((s, i) => s + i.credits, 0);
  if (!totalCredits) return 0;
  const weighted = items.reduce((s, i) => s + i.points * i.credits, 0);
  return Math.round((weighted / totalCredits) * 100) / 100;
}

export function isHigherEd(type: InstitutionType): boolean {
  return type === "college" || type === "university";
}

/** Institution-aware labels with per-tenant overrides. */
export interface InstitutionLabels {
  student: string;
  head: string;
  classLevel: string;
  brand: string;
}

export function defaultLabels(
  type: InstitutionType,
  overrides: Record<string, string> = {},
): InstitutionLabels {
  const higherEd = isHigherEd(type);
  return {
    student: overrides.studentLabel || "Student",
    head: overrides.headLabel || (higherEd ? "Dean" : "Principal"),
    classLevel: overrides.classLabel || (higherEd ? "Semester" : "Class"),
    brand: overrides.brand || "Synthixx Campus",
  };
}
