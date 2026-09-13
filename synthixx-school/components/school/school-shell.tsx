"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, GraduationCap, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ROLE_LABEL } from "@/lib/school/roles";
import { SchoolProvider, useSchool } from "./school-provider";
import { SchoolSidebar } from "./school-sidebar";
import { CommandPalette } from "./command-palette";
import { PWARegister } from "./pwa-register";
import {
  ToastProvider,
  Spinner,
  Field,
  Input,
  Select,
  Pill,
  useToast,
} from "./ui";

export function SchoolShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SchoolProvider>
        <PWARegister />
        <ShellInner>{children}</ShellInner>
      </SchoolProvider>
    </ToastProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const { loading, schoolId, schoolName, role } = useSchool();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Spinner className="h-6 w-6 text-accent" />
      </div>
    );
  }

  if (!schoolId) return <CreateSchoolScreen />;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <SchoolSidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 hover:bg-accent-soft md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{schoolName || "School"}</p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event("school:open-palette"))}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-muted hover:bg-accent-soft hover:text-foreground"
            aria-label="Search"
            title="Search (Ctrl/⌘ + K)"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="hidden rounded border border-border px-1 text-[10px] md:inline">⌘K</kbd>
          </button>
          {role && <Pill tone="blue">{ROLE_LABEL[role]}</Pill>}
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div key={pathname} className="sk-animate-fade-up">
            {children}
          </div>
        </main>
      </div>
      {role && <CommandPalette role={role} />}
    </div>
  );
}

function CreateSchoolScreen() {
  const { refresh } = useSchool();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [institutionType, setInstitutionType] = useState("university");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          institutionType,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = String(data?.error ?? "Could not create school.");
        const isMissingTable = /does not exist|relation .* does not exist/i.test(msg);
        throw new Error(
          isMissingTable
            ? "Database tables not found. Run supabase/school-management.sql in your Supabase SQL editor, then try again."
            : `${msg}${data?.hint ? ` (${data.hint})` : ""}`,
        );
      }
      show("School created");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create school.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold">Set up your institution</p>
            <p className="text-xs text-muted">Synthixx Campus</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted">
          Create your institution to get started. You will become its admin.
        </p>
        <form onSubmit={create} className="space-y-3">
          <Field label="Institution type">
            <Select value={institutionType} onChange={(e) => setInstitutionType(e.target.value)}>
              <option value="university">University</option>
              <option value="college">College</option>
              <option value="secondary">Secondary School</option>
              <option value="primary">Primary School</option>
              <option value="school">School (K-12)</option>
            </Select>
          </Field>
          <Field label="Institution name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Synthixx University" required />
          </Field>
          <Field label="Phone (optional)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </Field>
          <Field label="Address (optional)">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, area" />
          </Field>
          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Spinner className="h-4 w-4" />}
            Create school
          </button>
        </form>
      </div>
    </div>
  );
}
