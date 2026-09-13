"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  LayoutDashboard,
  Users,
  GraduationCap,
  Wallet,
  CalendarCheck,
  FileBarChart,
  CalendarRange,
  Bot,
  UserRound,
  Bell,
  Sparkles,
  Settings,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Keyboard,
  CornerDownLeft,
} from "lucide-react";
import { sb } from "@/lib/school/client";
import { canAccess, type ModuleKey, type Role } from "@/lib/school/roles";
import { useSchool } from "./school-provider";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  module?: ModuleKey;
  run: () => void;
}

const DENSITY_KEY = "sk-density";

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const { schoolId } = useSchool();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Cmd[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
    setResults([]);
  }, []);

  const toggleDensity = useCallback(() => {
    const el = document.documentElement;
    const next = !el.classList.contains("sk-compact");
    el.classList.toggle("sk-compact", next);
    try {
      localStorage.setItem(DENSITY_KEY, next ? "1" : "0");
    } catch {}
  }, []);

  // Restore density preference on mount.
  useEffect(() => {
    try {
      if (localStorage.getItem(DENSITY_KEY) === "1") {
        document.documentElement.classList.add("sk-compact");
      }
    } catch {}
  }, []);

  // Allow other components (e.g. the header search button) to open the palette.
  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener("school:open-palette", open);
    return () => window.removeEventListener("school:open-palette", open);
  }, []);

  // Global hotkeys: Cmd/Ctrl+K opens, "?" opens help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "?" && !isTyping(e)) {
        e.preventDefault();
        setShowHelp(true);
      } else if (e.key === "Escape") {
        close();
        setShowHelp(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const baseCommands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      close();
    };
    const isDark = resolvedTheme === "dark";
    const items: Cmd[] = [
      { id: "nav-dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, module: "dashboard", run: go("/school") },
      { id: "nav-students", label: "Students", icon: <Users className="h-4 w-4" />, module: "students", run: go("/school/students") },
      { id: "nav-teachers", label: "Teachers", icon: <GraduationCap className="h-4 w-4" />, module: "teachers", run: go("/school/teachers") },
      { id: "nav-fees", label: "Fee Management", icon: <Wallet className="h-4 w-4" />, module: "fees", run: go("/school/fees") },
      { id: "nav-attendance", label: "Attendance", icon: <CalendarCheck className="h-4 w-4" />, module: "attendance", run: go("/school/attendance") },
      { id: "nav-exams", label: "Exams & Results", icon: <FileBarChart className="h-4 w-4" />, module: "exams", run: go("/school/exams") },
      { id: "nav-timetable", label: "Timetable", icon: <CalendarRange className="h-4 w-4" />, module: "timetable", run: go("/school/timetable") },
      { id: "nav-ai", label: "AI Assistant", icon: <Bot className="h-4 w-4" />, module: "ai-assistant", run: go("/school/ai-assistant") },
      { id: "nav-parents", label: "Parent Portal", icon: <UserRound className="h-4 w-4" />, module: "parents", run: go("/school/parents") },
      { id: "nav-notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, module: "notifications", run: go("/school/notifications") },
      { id: "nav-analytics", label: "AI Analytics", icon: <Sparkles className="h-4 w-4" />, module: "analytics", run: go("/school/analytics") },
      { id: "nav-settings", label: "Settings", icon: <Settings className="h-4 w-4" />, module: "settings", run: go("/school/settings") },
      // Quick actions
      { id: "act-add-student", label: "Add Student", hint: "Quick action", icon: <Users className="h-4 w-4 text-accent" />, module: "students", run: go("/school/students?new=1") },
      { id: "act-mark-attendance", label: "Mark Attendance", hint: "Quick action", icon: <CalendarCheck className="h-4 w-4 text-accent" />, module: "attendance", run: go("/school/attendance") },
      { id: "act-generate-fees", label: "Generate Monthly Fees", hint: "Quick action", icon: <Wallet className="h-4 w-4 text-accent" />, module: "fees", run: go("/school/fees?generate=1") },
      { id: "act-ask-ai", label: "Ask AI", hint: "Quick action", icon: <Bot className="h-4 w-4 text-accent" />, module: "ai-assistant", run: go("/school/ai-assistant") },
      // Preferences
      { id: "pref-theme", label: isDark ? "Switch to light mode" : "Switch to dark mode", icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />, run: () => { setTheme(isDark ? "light" : "dark"); close(); } },
      { id: "pref-density", label: "Toggle compact density", icon: document.documentElement.classList.contains("sk-compact") ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />, run: () => { toggleDensity(); close(); } },
      { id: "pref-help", label: "Keyboard shortcuts", hint: "?", icon: <Keyboard className="h-4 w-4" />, run: () => { setShowHelp(true); close(); } },
    ];
    return items.filter((c) => !c.module || canAccess(role, c.module));
  }, [router, close, resolvedTheme, setTheme, toggleDensity, role]);

  // Build the result list: filtered commands + live search records.
  useEffect(() => {
    const term = q.trim().toLowerCase();
    const filtered = term
      ? baseCommands.filter((c) => c.label.toLowerCase().includes(term))
      : baseCommands;

    if (!term || !schoolId) {
      setResults(filtered);
      setActive(0);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      const extra: Cmd[] = [];
      try {
        const supabase = sb();
        const tasks: Promise<void>[] = [];
        if (canAccess(role, "students")) {
          tasks.push((async () => {
            const { data } = await supabase.from("students").select("id,name,class").eq("school_id", schoolId).ilike("name", `%${term}%`).limit(5);
            (data ?? []).forEach((r: { id: string; name: string; class: string | null }) =>
              extra.push({ id: `stu-${r.id}`, label: r.name, hint: `Student${r.class ? ` · ${r.class}` : ""}`, icon: <Users className="h-4 w-4" />, run: () => { router.push(`/school/students/${r.id}`); close(); } }),
            );
          })());
        }
        if (canAccess(role, "teachers")) {
          tasks.push((async () => {
            const { data } = await supabase.from("teachers").select("id,name,subject").eq("school_id", schoolId).ilike("name", `%${term}%`).limit(5);
            (data ?? []).forEach((r: { id: string; name: string; subject: string | null }) =>
              extra.push({ id: `tea-${r.id}`, label: r.name, hint: `Teacher${r.subject ? ` · ${r.subject}` : ""}`, icon: <GraduationCap className="h-4 w-4" />, run: () => { router.push(`/school/teachers`); close(); } }),
            );
          })());
        }
        await Promise.all(tasks);
      } catch {}
      if (!cancelled) {
        setResults([...filtered, ...extra]);
        setActive(0);
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, baseCommands, schoolId, role, router, close]);

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); results[active]?.run(); }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <div className="sk-animate-fade-in absolute inset-0 bg-black/50" onClick={close} />
          <div className="sk-animate-scale-in relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-3.5">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onListKey}
                placeholder="Search modules, students, actions…"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
            </div>
            <ul className="max-h-[55vh] overflow-y-auto p-1.5">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted">No results</li>
              )}
              {results.map((c, i) => (
                <li key={c.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={c.run}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      i === active ? "bg-accent-soft text-foreground" : "text-muted hover:bg-accent-soft"
                    }`}
                  >
                    <span className="shrink-0">{c.icon}</span>
                    <span className="flex-1 truncate text-foreground">{c.label}</span>
                    {c.hint && <span className="shrink-0 text-xs text-muted">{c.hint}</span>}
                    {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}

function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ["Ctrl / ⌘ + K", "Open command palette"],
    ["?", "Show this help"],
    ["↑ / ↓", "Navigate results"],
    ["Enter", "Run selected"],
    ["Esc", "Close"],
  ];
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="sk-animate-fade-in absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="sk-animate-scale-in relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <Keyboard className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold">Keyboard shortcuts</h2>
        </div>
        <ul className="space-y-2">
          {rows.map(([k, d]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="text-muted">{d}</span>
              <kbd className="rounded border border-border bg-background px-2 py-0.5 text-xs">{k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}
