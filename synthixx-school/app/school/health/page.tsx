"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, HeartPulse, AlertTriangle, Stethoscope } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow } from "@/lib/school/queries";
import type { HealthProfile, NurseVisit, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select, Textarea, Pill, useToast,
} from "@/components/school/ui";

export default function HealthPage() {
  return (
    <ModuleGuard module="health">
      <HealthView />
    </ModuleGuard>
  );
}

function HealthView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<HealthProfile[]>([]);
  const [visits, setVisits] = useState<NurseVisit[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [profOpen, setProfOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [p, v, s] = await Promise.all([
        supabase.from("health_profiles").select("*").eq("school_id", schoolId),
        supabase.from("nurse_visits").select("*").eq("school_id", schoolId).order("date", { ascending: false }).limit(100),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setProfiles((p.data ?? []) as HealthProfile[]);
      setVisits((v.data ?? []) as NurseVisit[]);
      setStudents((s.data ?? []) as Student[]);
    } catch { show("Could not load health records", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const critical = profiles.filter((p) => (p.allergies && p.allergies.trim()) || (p.conditions && p.conditions.trim()));

  return (
    <div>
      <PageHeader
        title="Health Records"
        description="Student health profiles and nurse visits."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setVisitOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"><Stethoscope className="h-4 w-4" /> Log Visit</button>
            <button onClick={() => setProfOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Add Profile</button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Profiles" value={profiles.length} />
        <StatCard label="Critical alerts" value={critical.length} icon={critical.length ? <AlertTriangle className="h-4 w-4 text-danger" /> : undefined} />
        <StatCard label="Nurse visits" value={visits.length} />
      </div>

      {loading ? <TableSkeleton cols={4} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><HeartPulse className="h-4 w-4 text-accent" /> Health profiles</h3>
            {profiles.length === 0 ? <EmptyState title="No profiles" /> : (
              <ul className="space-y-2 text-sm">
                {profiles.map((p) => {
                  const isCritical = (p.allergies && p.allergies.trim()) || (p.conditions && p.conditions.trim());
                  return (
                    <li key={p.id} className="rounded-lg bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{studentName.get(p.student_id ?? "") ?? "—"}</span>
                        <span className="flex items-center gap-1.5">
                          {p.blood_group && <Pill tone="blue">{p.blood_group}</Pill>}
                          {isCritical && <Pill tone="red">Critical</Pill>}
                        </span>
                      </div>
                      {p.allergies && <p className="mt-1 text-xs text-muted">Allergies: {p.allergies}</p>}
                      {p.conditions && <p className="text-xs text-muted">Conditions: {p.conditions}</p>}
                      {p.emergency_phone && <p className="text-xs text-muted">Emergency: {p.emergency_contact || ""} {p.emergency_phone}</p>}
                      {p.vaccination && <p className="text-xs text-muted">Vaccination: {p.vaccination}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Nurse visit log</h3>
            {visits.length === 0 ? <EmptyState title="No visits" /> : (
              <ul className="space-y-2 text-sm">
                {visits.map((v) => (
                  <li key={v.id} className="rounded-lg bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{studentName.get(v.student_id ?? "") ?? "—"}</span>
                      <span className="text-xs text-muted">{v.date}</span>
                    </div>
                    {v.complaint && <p className="mt-1 text-xs text-muted">Complaint: {v.complaint}</p>}
                    {v.treatment && <p className="text-xs text-muted">Treatment: {v.treatment}</p>}
                    {v.referred && <Pill tone="amber">Referred</Pill>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <ProfileModal open={profOpen} onClose={() => setProfOpen(false)} students={students} onAdded={(p) => { setProfiles((c) => [p, ...c]); show("Profile saved"); }} />
      <VisitModal open={visitOpen} onClose={() => setVisitOpen(false)} students={students} onAdded={(v) => { setVisits((c) => [v, ...c]); show("Visit logged"); }} />
    </div>
  );
}

function ProfileModal({
  open, onClose, students, onAdded,
}: { open: boolean; onClose: () => void; students: Student[]; onAdded: (p: HealthProfile) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ student_id: "", blood_group: "", allergies: "", conditions: "", emergency_contact: "", emergency_phone: "", vaccination: "" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.student_id) return;
    setBusy(true);
    try {
      const row = (await insertRow("health_profiles", schoolId, {
        student_id: form.student_id, blood_group: form.blood_group.trim() || null, allergies: form.allergies.trim() || null,
        conditions: form.conditions.trim() || null, emergency_contact: form.emergency_contact.trim() || null,
        emergency_phone: form.emergency_phone.trim() || null, vaccination: form.vaccination.trim() || null,
      })) as HealthProfile;
      onAdded(row);
      setForm({ student_id: "", blood_group: "", allergies: "", conditions: "", emergency_contact: "", emergency_phone: "", vaccination: "" });
      onClose();
    } catch { show("Could not save profile (one profile per student)", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Health Profile">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={form.student_id} onChange={(e) => set("student_id", e.target.value)} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Blood group"><Input value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)} placeholder="e.g. O+" /></Field>
          <Field label="Vaccination"><Input value={form.vaccination} onChange={(e) => set("vaccination", e.target.value)} /></Field>
        </div>
        <Field label="Allergies"><Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} /></Field>
        <Field label="Conditions"><Textarea rows={2} value={form.conditions} onChange={(e) => set("conditions", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Emergency contact"><Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} /></Field>
          <Field label="Emergency phone"><Input value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} /></Field>
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Save Profile"}</button>
      </form>
    </Modal>
  );
}

function VisitModal({
  open, onClose, students, onAdded,
}: { open: boolean; onClose: () => void; students: Student[]; onAdded: (v: NurseVisit) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ student_id: "", complaint: "", treatment: "", referred: false });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.student_id) return;
    setBusy(true);
    try {
      const row = (await insertRow("nurse_visits", schoolId, {
        student_id: form.student_id, date: new Date().toISOString().slice(0, 10),
        complaint: form.complaint.trim() || null, treatment: form.treatment.trim() || null, referred: form.referred,
      })) as NurseVisit;
      onAdded(row);
      setForm({ student_id: "", complaint: "", treatment: "", referred: false });
      onClose();
    } catch { show("Could not log visit", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Nurse Visit">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Complaint"><Input value={form.complaint} onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))} /></Field>
        <Field label="Treatment"><Textarea rows={2} value={form.treatment} onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.referred} onChange={(e) => setForm((f) => ({ ...f, referred: e.target.checked }))} /> Referred to hospital/doctor
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Log Visit"}</button>
      </form>
    </Modal>
  );
}
