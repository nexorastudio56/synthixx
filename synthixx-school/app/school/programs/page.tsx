"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Building2, Network, GraduationCap, Users } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import type { Faculty, Department, Program, Batch } from "@/lib/school/university";
import {
  PageHeader,
  Spinner,
  EmptyState,
  Modal,
  Field,
  Input,
  Select,
  useToast,
} from "@/components/school/ui";

type Tab = "faculties" | "departments" | "programs" | "batches";

export default function ProgramsPage() {
  return (
    <ModuleGuard module="programs">
      <ProgramsInner />
    </ModuleGuard>
  );
}

function ProgramsInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>("faculties");
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [modal, setModal] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [f, d, p, b] = await Promise.all([
      sb().from("faculties").select("*").eq("school_id", schoolId).order("created_at"),
      sb().from("departments").select("*").eq("school_id", schoolId).order("created_at"),
      sb().from("programs").select("*").eq("school_id", schoolId).order("created_at"),
      sb().from("batches").select("*").eq("school_id", schoolId).order("created_at"),
    ]);
    setFaculties((f.data ?? []) as Faculty[]);
    setDepartments((d.data ?? []) as Department[]);
    setPrograms((p.data ?? []) as Program[]);
    setBatches((b.data ?? []) as Batch[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const facultyName = (id: string | null) =>
    faculties.find((f) => f.id === id)?.name ?? "—";
  const deptName = (id: string | null) =>
    departments.find((d) => d.id === id)?.name ?? "—";
  const programName = (id: string | null) =>
    programs.find((p) => p.id === id)?.name ?? "—";

  async function remove(table: string, id: string) {
    if (!confirm("Delete this item? Linked records may be affected.")) return;
    try {
      await deleteRow(table, id);
      show("Deleted");
      load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Delete failed");
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: "faculties", label: "Faculties", icon: <Building2 className="h-4 w-4" />, count: faculties.length },
    { key: "departments", label: "Departments", icon: <Network className="h-4 w-4" />, count: departments.length },
    { key: "programs", label: "Programs", icon: <GraduationCap className="h-4 w-4" />, count: programs.length },
    { key: "batches", label: "Batches", icon: <Users className="h-4 w-4" />, count: batches.length },
  ];

  return (
    <div>
      <PageHeader
        title="Programs & Departments"
        description="Build the academic hierarchy: faculties → departments → programs → batches."
        actions={
          <button
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-1.5 text-sm font-medium text-foreground"
                : "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-accent-soft"
            }
          >
            {t.icon} {t.label}
            <span className="rounded-full bg-background px-1.5 text-xs">{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-accent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {tab === "faculties" && (
            <List
              rows={faculties.map((f) => ({ id: f.id, cells: [f.name, f.code || "—"] }))}
              headers={["Faculty", "Code"]}
              onDelete={(id) => remove("faculties", id)}
              empty="No faculties yet. Add one to begin."
            />
          )}
          {tab === "departments" && (
            <List
              rows={departments.map((d) => ({ id: d.id, cells: [d.name, d.code || "—", facultyName(d.faculty_id)] }))}
              headers={["Department", "Code", "Faculty"]}
              onDelete={(id) => remove("departments", id)}
              empty="No departments yet."
            />
          )}
          {tab === "programs" && (
            <List
              rows={programs.map((p) => ({
                id: p.id,
                cells: [p.name, p.code || "—", deptName(p.department_id), p.level, `${p.total_credits} cr`],
              }))}
              headers={["Program", "Code", "Department", "Level", "Credits"]}
              onDelete={(id) => remove("programs", id)}
              empty="No programs yet."
            />
          )}
          {tab === "batches" && (
            <List
              rows={batches.map((b) => ({
                id: b.id,
                cells: [b.name, programName(b.program_id), b.intake_year?.toString() || "—", b.status],
              }))}
              headers={["Batch", "Program", "Intake", "Status"]}
              onDelete={(id) => remove("batches", id)}
              empty="No batches yet."
            />
          )}
        </div>
      )}

      {modal && (
        <AddModal
          tab={tab}
          schoolId={schoolId!}
          faculties={faculties}
          departments={departments}
          programs={programs}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            load();
            show("Saved");
          }}
        />
      )}
    </div>
  );
}

function List({
  rows,
  headers,
  onDelete,
  empty,
}: {
  rows: { id: string; cells: string[] }[];
  headers: string[];
  onDelete: (id: string) => void;
  empty: string;
}) {
  if (rows.length === 0) return <div className="bg-surface p-6"><EmptyState description={empty} /></div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
          {headers.map((h) => (
            <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
          ))}
          <th className="px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
            {r.cells.map((c, i) => (
              <td key={i} className="px-4 py-2.5">{c}</td>
            ))}
            <td className="px-4 py-2.5 text-right">
              <button onClick={() => onDelete(r.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AddModal({
  tab,
  schoolId,
  faculties,
  departments,
  programs,
  onClose,
  onSaved,
}: {
  tab: Tab;
  schoolId: string;
  faculties: Faculty[];
  departments: Department[];
  programs: Program[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ level: "undergraduate", status: "active" });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      if (tab === "faculties") {
        await insertRow("faculties", schoolId, { name: form.name, code: form.code || null });
      } else if (tab === "departments") {
        await insertRow("departments", schoolId, {
          name: form.name,
          code: form.code || null,
          faculty_id: form.faculty_id || null,
        });
      } else if (tab === "programs") {
        await insertRow("programs", schoolId, {
          name: form.name,
          code: form.code || null,
          department_id: form.department_id || null,
          level: form.level || "undergraduate",
          duration_years: Number(form.duration_years) || 4,
          total_credits: Number(form.total_credits) || 130,
        });
      } else {
        await insertRow("batches", schoolId, {
          name: form.name,
          program_id: form.program_id || null,
          intake_year: form.intake_year ? Number(form.intake_year) : null,
          status: form.status || "active",
        });
      }
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Tab, string> = {
    faculties: "Add faculty",
    departments: "Add department",
    programs: "Add program",
    batches: "Add batch",
  };

  return (
    <Modal open onClose={onClose} title={titles[tab]}>
      <div className="space-y-3">
        <Field label="Name">
          <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Name" />
        </Field>
        {tab !== "batches" && (
          <Field label="Code (optional)">
            <Input value={form.code || ""} onChange={(e) => set("code", e.target.value)} placeholder="e.g. CS" />
          </Field>
        )}
        {tab === "departments" && (
          <Field label="Faculty">
            <Select value={form.faculty_id || ""} onChange={(e) => set("faculty_id", e.target.value)}>
              <option value="">— Select faculty —</option>
              {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        )}
        {tab === "programs" && (
          <>
            <Field label="Department">
              <Select value={form.department_id || ""} onChange={(e) => set("department_id", e.target.value)}>
                <option value="">— Select department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Level">
              <Select value={form.level} onChange={(e) => set("level", e.target.value)}>
                <option value="diploma">Diploma</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="graduate">Graduate</option>
                <option value="postgraduate">Postgraduate</option>
                <option value="phd">PhD</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (years)">
                <Input type="number" step="0.5" value={form.duration_years || ""} onChange={(e) => set("duration_years", e.target.value)} placeholder="4" />
              </Field>
              <Field label="Total credits">
                <Input type="number" value={form.total_credits || ""} onChange={(e) => set("total_credits", e.target.value)} placeholder="130" />
              </Field>
            </div>
          </>
        )}
        {tab === "batches" && (
          <>
            <Field label="Program">
              <Select value={form.program_id || ""} onChange={(e) => set("program_id", e.target.value)}>
                <option value="">— Select program —</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Intake year">
              <Input type="number" value={form.intake_year || ""} onChange={(e) => set("intake_year", e.target.value)} placeholder="2024" />
            </Field>
          </>
        )}
        <button
          onClick={save}
          disabled={busy || !form.name}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {busy && <Spinner className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
}
