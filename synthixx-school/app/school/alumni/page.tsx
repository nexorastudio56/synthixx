"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { listRows, insertRow, deleteRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import type { Alumnus } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, AIInsightCard, useToast,
} from "@/components/school/ui";

export default function AlumniPage() {
  return (
    <ModuleGuard module="alumni">
      <AlumniView />
    </ModuleGuard>
  );
}

function AlumniView() {
  const { schoolId, schoolName } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Alumnus[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try { setRows(await listRows<Alumnus>("alumni", schoolId)); }
    catch { show("Could not load alumni", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this alumnus?")) return;
    try { await deleteRow("alumni", id); setRows((c) => c.filter((r) => r.id !== id)); show("Deleted"); }
    catch { show("Delete failed", "error"); }
  }

  const filtered = rows.filter((r) => !query || `${r.name} ${r.city ?? ""} ${r.graduation_year ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const years = new Set(rows.map((r) => r.graduation_year).filter(Boolean));

  return (
    <div>
      <PageHeader
        title="Alumni"
        description="Stay connected with graduated students."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Add Alumnus</button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Alumni" value={rows.length} />
        <StatCard label="Graduation years" value={years.size} />
        <StatCard label="With contacts" value={rows.filter((r) => r.phone || r.email).length} />
      </div>

      <div className="mb-4">
        <AIInsightCard
          title="Reunion invite draft"
          description="Generate a warm reunion invitation message."
          buttonLabel="Draft invite"
          onRun={() => getAIInsight("Write a warm, short alumni reunion invitation message (under 120 words) the school can send via SMS/WhatsApp/email. Friendly and professional.", `School: ${schoolName}. Total alumni: ${rows.length}.`)}
        />
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <Search className="h-4 w-4 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, city or year" className="w-full bg-transparent text-sm outline-none" />
      </div>

      {loading ? <TableSkeleton cols={5} /> : filtered.length === 0 ? (
        <EmptyState title="No alumni" description="Add graduated students to your alumni network." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Year</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">City</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.graduation_year || "—"}</td>
                  <td className="px-4 py-3">{r.current_status || "—"}</td>
                  <td className="px-4 py-3">{r.phone || r.email || "—"}</td>
                  <td className="px-4 py-3">{r.city || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddAlumnusModal open={open} onClose={() => setOpen(false)} onAdded={(a) => { setRows((c) => [a, ...c]); show("Alumnus added"); }} />
    </div>
  );
}

function AddAlumnusModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (a: Alumnus) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ name: "", graduation_year: "", class: "", current_status: "", phone: "", email: "", city: "", notes: "" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.name.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("alumni", schoolId, {
        name: form.name.trim(), graduation_year: form.graduation_year ? Number(form.graduation_year) : null,
        class: form.class.trim() || null, current_status: form.current_status.trim() || null,
        phone: form.phone.trim() || null, email: form.email.trim() || null, city: form.city.trim() || null,
        notes: form.notes.trim() || null,
      })) as Alumnus;
      onAdded(row);
      setForm({ name: "", graduation_year: "", class: "", current_status: "", phone: "", email: "", city: "", notes: "" });
      onClose();
    } catch { show("Could not add alumnus", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Alumnus">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Graduation year"><Input type="number" value={form.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} placeholder="e.g. 2020" /></Field>
          <Field label="Class"><Input value={form.class} onChange={(e) => set("class", e.target.value)} /></Field>
        </div>
        <Field label="Current status"><Input value={form.current_status} onChange={(e) => set("current_status", e.target.value)} placeholder="e.g. University student, Engineer" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Alumnus"}</button>
      </form>
    </Modal>
  );
}
