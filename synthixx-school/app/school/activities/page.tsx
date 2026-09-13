"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trophy, Award, Printer, Sparkles } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import { printDocument } from "@/components/school/print";
import type { Activity, Achievement, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select, Pill, AIButton, useToast, Spinner,
} from "@/components/school/ui";

export default function ActivitiesPage() {
  return (
    <ModuleGuard module="activities">
      <ActivitiesView />
    </ModuleGuard>
  );
}

function ActivitiesView() {
  const { schoolId, schoolName } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [actOpen, setActOpen] = useState(false);
  const [achOpen, setAchOpen] = useState(false);
  const [certBusy, setCertBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [a, ach, s] = await Promise.all([
        supabase.from("activities").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("achievements").select("*").eq("school_id", schoolId).order("date", { ascending: false }),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setActivities((a.data ?? []) as Activity[]);
      setAchievements((ach.data ?? []) as Achievement[]);
      setStudents((s.data ?? []) as Student[]);
    } catch { show("Could not load activities", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  async function makeCertificate(ach: Achievement) {
    setCertBusy(ach.id);
    try {
      let text = ach.certificate_text;
      if (!text) {
        text = await getAIInsight(
          "Write a short, formal certificate body (3-4 sentences) honoring the student's achievement. Do not include a header or signature lines. Output only the body.",
          `Student: ${studentName.get(ach.student_id ?? "") ?? "the student"}. Achievement: ${ach.title}. ${ach.description ?? ""}`,
        );
        await updateRow("achievements", ach.id, { certificate_text: text });
        setAchievements((c) => c.map((x) => (x.id === ach.id ? { ...x, certificate_text: text } : x)));
      }
      printDocument({
        schoolName,
        title: "Certificate of Achievement",
        body: `${text}`,
        meta: ach.date || undefined,
      });
    } catch { show("Could not generate certificate", "error"); }
    finally { setCertBusy(null); }
  }

  return (
    <div>
      <PageHeader
        title="Activities & Achievements"
        description="Sports, clubs, teams and student awards."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setAchOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"><Award className="h-4 w-4" /> Add Achievement</button>
            <button onClick={() => setActOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Add Activity</button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Activities" value={activities.length} />
        <StatCard label="Achievements" value={achievements.length} />
        <StatCard label="Students" value={students.length} />
      </div>

      {loading ? <TableSkeleton cols={3} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Trophy className="h-4 w-4 text-accent" /> Activities & teams</h3>
            {activities.length === 0 ? <EmptyState title="No activities" /> : (
              <ul className="space-y-1.5 text-sm">
                {activities.map((a) => (
                  <li key={a.id} className="flex items-center justify-between"><span>{a.name}</span><Pill tone="gray">{a.type}</Pill></li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Achievements</h3>
            {achievements.length === 0 ? <EmptyState title="No achievements" /> : (
              <ul className="space-y-2 text-sm">
                {achievements.map((a) => (
                  <li key={a.id} className="rounded-lg bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted">{studentName.get(a.student_id ?? "") ?? "—"}{a.date ? ` · ${a.date}` : ""}</p>
                        {a.description && <p className="mt-1 text-xs text-muted">{a.description}</p>}
                      </div>
                      <button onClick={() => makeCertificate(a)} disabled={certBusy === a.id} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft disabled:opacity-50">
                        {certBusy === a.id ? <Spinner className="h-3.5 w-3.5" /> : <Printer className="h-3.5 w-3.5" />} Certificate
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <AddActivityModal open={actOpen} onClose={() => setActOpen(false)} onAdded={(a) => { setActivities((c) => [a, ...c]); show("Activity added"); }} />
      <AddAchievementModal open={achOpen} onClose={() => setAchOpen(false)} students={students} onAdded={(a) => { setAchievements((c) => [a, ...c]); show("Achievement added"); }} />
    </div>
  );
}

function AddActivityModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (a: Activity) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<Activity["type"]>("sport");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !name.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("activities", schoolId, { name: name.trim(), type })) as Activity;
      onAdded(row);
      setName(""); setType("sport");
      onClose();
    } catch { show("Could not add activity", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Activity">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Cricket Team" /></Field>
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as Activity["type"])}>
            <option value="sport">Sport</option>
            <option value="academic">Academic</option>
            <option value="art">Art</option>
          </Select>
        </Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Activity"}</button>
      </form>
    </Modal>
  );
}

function AddAchievementModal({
  open, onClose, students, onAdded,
}: { open: boolean; onClose: () => void; students: Student[]; onAdded: (a: Achievement) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ student_id: "", title: "", description: "", date: "" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.student_id || !form.title.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("achievements", schoolId, {
        student_id: form.student_id, title: form.title.trim(), description: form.description.trim() || null,
        date: form.date || new Date().toISOString().slice(0, 10),
      })) as Achievement;
      onAdded(row);
      setForm({ student_id: "", title: "", description: "", date: "" });
      onClose();
    } catch { show("Could not add achievement", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Achievement">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={form.student_id} onChange={(e) => set("student_id", e.target.value)} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="e.g. 1st in Inter-school Quiz" /></Field>
        <Field label="Description"><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <p className="flex items-center gap-1.5 text-xs text-muted"><Sparkles className="h-3.5 w-3.5 text-accent" /> Generate a printable certificate from the list after saving.</p>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Achievement"}</button>
      </form>
    </Modal>
  );
}
