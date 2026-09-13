"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Wallet,
  CalendarCheck,
  FileBarChart,
  Bot,
  MessagesSquare,
  Bell,
  BookOpen,
  CalendarDays,
  Library,
  Bus,
  Utensils,
  HeartPulse,
  Trophy,
  Briefcase,
  FileText,
  Sparkles,
  CreditCard,
  UserRound,
  UserCog,
  Settings,
  Layers,
  CalendarRange,
  ClipboardList,
  ArrowLeft,
  X,
  Building2,
  BookMarked,
  CalendarClock,
  ClipboardCheck,
  ScrollText,
  UserSquare,
  FileCheck2,
  BedDouble,
  Award,
  FlaskConical,
  Landmark,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { sb } from "@/lib/school/client";
import { cn } from "@/lib/utils";
import { canAccess, type ModuleKey, type Role } from "@/lib/school/roles";
import { useSchool } from "./school-provider";
import { isHigherEd } from "@/lib/school/university";

interface NavItem {
  key: ModuleKey;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const I = (n: React.ReactNode) => n;

const SECTIONS: NavSection[] = [
  {
    title: "Core",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/school", icon: I(<LayoutDashboard className="h-4 w-4" />) },
      { key: "students", label: "Students", href: "/school/students", icon: I(<Users className="h-4 w-4" />) },
      { key: "teachers", label: "Teachers", href: "/school/teachers", icon: I(<GraduationCap className="h-4 w-4" />) },
      { key: "fees", label: "Fee Management", href: "/school/fees", icon: I(<Wallet className="h-4 w-4" />) },
      { key: "attendance", label: "Attendance", href: "/school/attendance", icon: I(<CalendarCheck className="h-4 w-4" />) },
      { key: "exams", label: "Exams & Results", href: "/school/exams", icon: I(<FileBarChart className="h-4 w-4" />) },
      { key: "timetable", label: "Timetable", href: "/school/timetable", icon: I(<CalendarRange className="h-4 w-4" />) },
      { key: "ai-assistant", label: "AI Assistant", href: "/school/ai-assistant", icon: I(<Bot className="h-4 w-4" />) },
    ],
  },
  {
    title: "Communication",
    items: [
      { key: "parents", label: "Parent Portal", href: "/school/parents", icon: I(<UserRound className="h-4 w-4" />) },
      { key: "notifications", label: "Notifications", href: "/school/notifications", icon: I(<Bell className="h-4 w-4" />) },
      { key: "homework", label: "Homework", href: "/school/homework", icon: I(<BookOpen className="h-4 w-4" />) },
      { key: "events", label: "Events & Calendar", href: "/school/events", icon: I(<CalendarDays className="h-4 w-4" />) },
    ],
  },
  {
    title: "Management",
    items: [
      { key: "library", label: "Library", href: "/school/library", icon: I(<Library className="h-4 w-4" />) },
      { key: "transport", label: "Transport", href: "/school/transport", icon: I(<Bus className="h-4 w-4" />) },
      { key: "canteen", label: "Canteen", href: "/school/canteen", icon: I(<Utensils className="h-4 w-4" />) },
      { key: "health", label: "Health Records", href: "/school/health", icon: I(<HeartPulse className="h-4 w-4" />) },
      { key: "activities", label: "Activities", href: "/school/activities", icon: I(<Trophy className="h-4 w-4" />) },
    ],
  },
  {
    title: "Staff & Finance",
    items: [
      { key: "hr-payroll", label: "HR & Payroll", href: "/school/hr-payroll", icon: I(<Briefcase className="h-4 w-4" />) },
      { key: "payments", label: "Payments", href: "/school/payments", icon: I(<CreditCard className="h-4 w-4" />) },
      { key: "documents", label: "Documents", href: "/school/documents", icon: I(<FileText className="h-4 w-4" />) },
    ],
  },
  {
    title: "Insights",
    items: [
      { key: "analytics", label: "AI Analytics", href: "/school/analytics", icon: I(<Sparkles className="h-4 w-4" />) },
      { key: "engagement", label: "Engagement", href: "/school/engagement", icon: I(<Trophy className="h-4 w-4" />) },
      { key: "alumni", label: "Alumni", href: "/school/alumni", icon: I(<MessagesSquare className="h-4 w-4" />) },
    ],
  },
  {
    title: "Administration",
    items: [
      { key: "academics", label: "Academics", href: "/school/academics", icon: I(<Layers className="h-4 w-4" />) },
      { key: "admissions", label: "Admissions", href: "/school/admissions", icon: I(<ClipboardList className="h-4 w-4" />) },
      { key: "staff-access", label: "Staff & Access", href: "/school/staff-access", icon: I(<UserCog className="h-4 w-4" />) },
      { key: "subscription", label: "Subscription & Plans", href: "/school/subscription", icon: I(<CreditCard className="h-4 w-4" />) },
      { key: "settings", label: "Settings", href: "/school/settings", icon: I(<Settings className="h-4 w-4" />) },
    ],
  },
];

// Higher-ed only sections, shown when institution_type is college/university.
const UNIVERSITY_SECTIONS: NavSection[] = [
  {
    title: "Academics (University)",
    items: [
      { key: "programs", label: "Programs & Departments", href: "/school/programs", icon: I(<Building2 className="h-4 w-4" />) },
      { key: "courses", label: "Course Catalog", href: "/school/courses", icon: I(<BookMarked className="h-4 w-4" />) },
      { key: "semesters", label: "Semesters & Offerings", href: "/school/semesters", icon: I(<CalendarClock className="h-4 w-4" />) },
      { key: "registration", label: "Registration", href: "/school/registration", icon: I(<ClipboardCheck className="h-4 w-4" />) },
      { key: "transcripts", label: "GPA & Transcripts", href: "/school/transcripts", icon: I(<ScrollText className="h-4 w-4" />) },
      { key: "portal", label: "Student Portal", href: "/school/portal", icon: I(<UserSquare className="h-4 w-4" />) },
    ],
  },
  {
    title: "Operations (University)",
    items: [
      { key: "exam-cell", label: "Examination Cell", href: "/school/exam-cell", icon: I(<FileCheck2 className="h-4 w-4" />) },
      { key: "hostel", label: "Hostel", href: "/school/hostel", icon: I(<BedDouble className="h-4 w-4" />) },
      { key: "scholarships", label: "Scholarships", href: "/school/scholarships", icon: I(<Award className="h-4 w-4" />) },
      { key: "research", label: "Research & Thesis", href: "/school/research", icon: I(<FlaskConical className="h-4 w-4" />) },
      { key: "registrar", label: "Registrar", href: "/school/registrar", icon: I(<Landmark className="h-4 w-4" />) },
    ],
  },
];

export function SchoolSidebar({
  role,
  open,
  onClose,
}: {
  role: Role | null;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { institutionType } = useSchool();

  async function handleLogout() {
    await sb().auth.signOut();
    router.push("/school");
    router.refresh();
  }
  const sections = isHigherEd(institutionType)
    ? [SECTIONS[0], ...UNIVERSITY_SECTIONS, ...SECTIONS.slice(1)]
    : SECTIONS;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Synthixx Campus</p>
              <p className="text-[10px] text-muted">School & University</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-accent-soft md:hidden"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
          {sections.map((section) => {
            const visible = section.items.filter((it) => canAccess(role, it.key));
            if (visible.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {visible.map((it) => {
                    const active =
                      it.href === "/school"
                        ? pathname === "/school"
                        : pathname.startsWith(it.href);
                    return (
                      <li key={it.key}>
                        <Link
                          href={it.href}
                          onClick={onClose}
                          className={cn(
                            "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200 hover:translate-x-0.5",
                            active
                              ? "bg-accent-soft font-medium text-foreground"
                              : "text-muted hover:bg-accent-soft hover:text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full bg-accent transition-all duration-200",
                              active ? "w-1 opacity-100" : "w-0 opacity-0",
                            )}
                          />
                          {it.icon}
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-0.5">
          <a
            href={process.env.NEXT_PUBLIC_MAIN_APP_URL || "https://app.synthixx.com/chat"}
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-accent-soft hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Synthixx
          </a>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
