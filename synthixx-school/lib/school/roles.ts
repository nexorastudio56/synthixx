// Role-based access control for the Synthixx Campus agent (school + university).

export type Role =
  | "SUPER_ADMIN"
  | "SCHOOL_ADMIN"
  | "TEACHER"
  | "ACCOUNTANT"
  | "PARENT"
  | "STUDENT"
  | "DEAN"
  | "HOD"
  | "REGISTRAR"
  | "LIBRARIAN";

export type ModuleKey =
  | "dashboard"
  | "students"
  | "teachers"
  | "fees"
  | "payments"
  | "attendance"
  | "exams"
  | "ai-assistant"
  | "parents"
  | "notifications"
  | "homework"
  | "events"
  | "library"
  | "transport"
  | "canteen"
  | "health"
  | "activities"
  | "hr-payroll"
  | "documents"
  | "analytics"
  | "alumni"
  | "staff-access"
  | "settings"
  | "academics"
  | "timetable"
  | "admissions"
  | "engagement"
  // University / higher-ed modules
  | "programs"
  | "courses"
  | "semesters"
  | "registration"
  | "transcripts"
  | "portal"
  | "exam-cell"
  | "hostel"
  | "scholarships"
  | "research"
  | "registrar"
  | "subscription";

const ALL: ModuleKey[] = [
  "dashboard", "students", "teachers", "fees", "payments", "attendance", "exams",
  "ai-assistant", "parents", "notifications", "homework", "events", "library",
  "transport", "canteen", "health", "activities", "hr-payroll", "documents",
  "analytics", "alumni", "staff-access", "settings", "academics",
  "timetable", "admissions", "engagement", "subscription",
  "programs", "courses", "semesters", "registration", "transcripts", "portal",
  "exam-cell", "hostel", "scholarships", "research", "registrar",
];

const ACCESS: Record<Role, ModuleKey[]> = {
  SUPER_ADMIN: ALL,
  SCHOOL_ADMIN: ALL,
  TEACHER: [
    "dashboard", "students", "attendance", "exams", "homework",
    "events", "activities", "ai-assistant", "timetable", "engagement",
    "courses", "registration", "exam-cell", "research",
  ],
  ACCOUNTANT: ["dashboard", "fees", "payments", "hr-payroll", "canteen", "transport", "scholarships"],
  PARENT: ["parents"],
  // A student only sees their own portal.
  STUDENT: ["portal"],
  // Deans oversee a whole faculty; HODs a department.
  DEAN: [
    "dashboard", "analytics", "programs", "courses", "semesters",
    "registration", "transcripts", "research", "exam-cell",
  ],
  HOD: [
    "dashboard", "analytics", "programs", "courses", "semesters",
    "registration", "transcripts", "research", "teachers",
  ],
  // The registrar owns enrollment, transcripts and graduation.
  REGISTRAR: [
    "dashboard", "students", "programs", "courses", "semesters",
    "registration", "transcripts", "registrar", "admissions", "exam-cell",
  ],
  LIBRARIAN: ["dashboard", "library"],
};

export function canAccess(role: Role | null | undefined, module: ModuleKey): boolean {
  if (!role) return false;
  return ACCESS[role]?.includes(module) ?? false;
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SCHOOL_ADMIN: "Admin",
  TEACHER: "Faculty",
  ACCOUNTANT: "Accountant",
  PARENT: "Parent",
  STUDENT: "Student",
  DEAN: "Dean",
  HOD: "Head of Department",
  REGISTRAR: "Registrar",
  LIBRARIAN: "Librarian",
};
