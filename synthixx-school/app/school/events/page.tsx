"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Bell, Sparkles } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, deleteRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import type { SchoolEvent } from "@/lib/school/types";
import {
  PageHeader, TableSkeleton, EmptyState, Modal, Field, Input, Select, Textarea, Pill, AIInsightCard, useToast,
} from "@/components/school/ui";

export default function EventsPage() {
  return (
    <ModuleGuard module="events">
      <EventsView />
    </ModuleGuard>
  );
}

function EventsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SchoolEvent[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data } = await sb().from("events").select("*").eq("school_id", schoolId).order("date", { ascending: true });
      setRows((data ?? []) as SchoolEvent[]);
    } catch { show("Could not load events", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: SchoolEvent["status"]) {
    try { await updateRow("events", id, { status }); setRows((c) => c.map((e) => (e.id === id ? { ...e, status } : e))); }
    catch { show("Update failed", "error"); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    try { await deleteRow("events", id); setRows((c) => c.filter((e) => e.id !== id)); show("Deleted"); }
    catch { show("Delete failed", "error"); }
  }

  async function notifyParents(ev: SchoolEvent) {
    if (!schoolId) return;
    try {
      await insertRow("notifications", schoolId, {
        type: "Announcement", message: `Upcoming event: ${ev.title} on ${ev.date}.`,
        recipient_type: "all_parents", channel: "in_app", status: "sent",
      });
      show("Parents notified");
    } catch { show("Could not notify", "error"); }
  }

  return (
    <div>
      <PageHeader
        title="Events & Calendar"
        description="Plan PTMs, exams, sports days and holidays."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Event
          </button>
        }
      />

      <div className="mb-4">
        <AIInsightCard
          title="Suggest events"
          description="AI suggests events for next month based on best practices."
          buttonLabel="Suggest"
          onRun={() => getAIInsight("Suggest 5 useful school events for next month (PTM, exams, sports, etc.) with one line each on why. Be concise.", "Suggest events for a typical school next month.")}
        />
      </div>

      {loading ? <TableSkeleton cols={4} /> : rows.length === 0 ? (
        <EmptyState title="No events" description="Add your first event." />
      ) : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{e.title}</h3>
                    {e.type && <Pill tone="gray">{e.type}</Pill>}
                    <Pill tone={e.status === "completed" ? "green" : e.status === "ongoing" ? "amber" : "blue"}>{e.status}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted">{e.date}</p>
                  {e.description && <p className="mt-1.5 text-sm text-muted">{e.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Select value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value as SchoolEvent["status"])} className="h-8 py-0 text-xs">
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </Select>
                  <button onClick={() => notifyParents(e)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-accent" aria-label="Notify parents" title="Notify parents"><Bell className="h-4 w-4" /></button>
                  <button onClick={() => remove(e.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEventModal open={open} onClose={() => setOpen(false)} onAdded={(e) => { setRows((c) => [...c, e].sort((a, b) => (a.date < b.date ? -1 : 1))); show("Event added"); }} />
    </div>
  );
}

function AddEventModal({
  open, onClose, onAdded,
}: { open: boolean; onClose: () => void; onAdded: (e: SchoolEvent) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ title: "", date: "", type: "event", description: "" });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.title.trim() || !form.date) return;
    setBusy(true);
    try {
      const row = (await insertRow("events", schoolId, {
        title: form.title.trim(), date: form.date, type: form.type, description: form.description.trim() || null, status: "upcoming",
      })) as SchoolEvent;
      onAdded(row);
      setForm({ title: "", date: "", type: "event", description: "" });
      onClose();
    } catch { show("Could not add event", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Event">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required /></Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="event">Event</option>
              <option value="ptm">PTM</option>
              <option value="exam">Exam</option>
              <option value="sports">Sports</option>
              <option value="holiday">Holiday</option>
            </Select>
          </Field>
        </div>
        <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Event"}</button>
      </form>
    </Modal>
  );
}
