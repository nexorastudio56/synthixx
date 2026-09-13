"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, BedDouble } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow, deleteRow } from "@/lib/school/queries";
import {
  PageHeader,
  Spinner,
  EmptyState,
  StatCard,
  Modal,
  Field,
  Input,
  Select,
  Pill,
  useToast,
} from "@/components/school/ui";

interface Hostel {
  id: string;
  name: string;
  gender: string | null;
  total_rooms: number;
}
interface Allocation {
  id: string;
  hostel_id: string;
  student_id: string;
  room_no: string | null;
  status: string;
  mess_fee: number;
}
interface Student {
  id: string;
  name: string;
}

export default function HostelPage() {
  return (
    <ModuleGuard module="hostel">
      <HostelInner />
    </ModuleGuard>
  );
}

function HostelInner() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [allocs, setAllocs] = useState<Allocation[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [hostelModal, setHostelModal] = useState(false);
  const [allocModal, setAllocModal] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    const [h, a, s] = await Promise.all([
      sb().from("hostels").select("*").eq("school_id", schoolId).order("created_at"),
      sb().from("hostel_allocations").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb().from("students").select("id,name").eq("school_id", schoolId).order("name"),
    ]);
    setHostels((h.data ?? []) as Hostel[]);
    setAllocs((a.data ?? []) as Allocation[]);
    setStudents((s.data ?? []) as Student[]);
    setLoading(false);
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const hostelName = (id: string) => hostels.find((h) => h.id === id)?.name ?? "—";
  const studentName = (id: string) => students.find((s) => s.id === id)?.name ?? "—";
  const activeAllocs = allocs.filter((a) => a.status === "active");

  async function vacate(id: string) {
    await updateRow("hostel_allocations", id, { status: "vacated" });
    show("Vacated");
    load();
  }
  async function removeHostel(id: string) {
    if (!confirm("Delete this hostel?")) return;
    await deleteRow("hostels", id);
    show("Deleted");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Hostel Management"
        description="Manage hostels, room allocations and mess fees."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setHostelModal(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-accent-soft">
              <Plus className="h-4 w-4" /> Hostel
            </button>
            <button onClick={() => setAllocModal(true)} disabled={hostels.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Allocate
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Hostels" value={hostels.length} icon={<BedDouble className="h-4 w-4" />} />
        <StatCard label="Active allocations" value={activeAllocs.length} />
        <StatCard label="Total rooms" value={hostels.reduce((s, h) => s + h.total_rooms, 0)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6 text-accent" /></div>
      ) : (
        <>
          <h3 className="mb-2 text-sm font-semibold">Hostels</h3>
          {hostels.length === 0 ? (
            <EmptyState description="Add a hostel to begin." />
          ) : (
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hostels.map((h) => (
                <div key={h.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-xs text-muted">{h.gender || "—"} · {h.total_rooms} rooms</p>
                    </div>
                    <button onClick={() => removeHostel(h.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {activeAllocs.filter((a) => a.hostel_id === h.id).length} occupants
                  </p>
                </div>
              ))}
            </div>
          )}

          <h3 className="mb-2 text-sm font-semibold">Allocations</h3>
          {allocs.length === 0 ? (
            <EmptyState description="No room allocations yet." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface text-left text-xs uppercase text-muted">
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-4 py-2.5 font-medium">Hostel</th>
                    <th className="px-4 py-2.5 font-medium">Room</th>
                    <th className="px-4 py-2.5 font-medium">Mess fee</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {allocs.map((a) => (
                    <tr key={a.id} className="border-b border-border bg-surface last:border-0 hover:bg-accent-soft/40">
                      <td className="px-4 py-2.5">{studentName(a.student_id)}</td>
                      <td className="px-4 py-2.5">{hostelName(a.hostel_id)}</td>
                      <td className="px-4 py-2.5">{a.room_no || "—"}</td>
                      <td className="px-4 py-2.5">{Number(a.mess_fee || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5"><Pill tone={a.status === "active" ? "green" : "gray"}>{a.status}</Pill></td>
                      <td className="px-4 py-2.5 text-right">
                        {a.status === "active" && (
                          <button onClick={() => vacate(a.id)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent-soft">Vacate</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {hostelModal && (
        <AddHostel schoolId={schoolId!} onClose={() => setHostelModal(false)} onSaved={() => { setHostelModal(false); load(); show("Hostel added"); }} />
      )}
      {allocModal && (
        <AddAllocation schoolId={schoolId!} hostels={hostels} students={students} onClose={() => setAllocModal(false)} onSaved={() => { setAllocModal(false); load(); show("Allocated"); }} />
      )}
    </div>
  );
}

function AddHostel({ schoolId, onClose, onSaved }: { schoolId: string; onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ gender: "male", total_rooms: "0" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("hostels", schoolId, { name: form.name, gender: form.gender, total_rooms: Number(form.total_rooms) || 0 });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add hostel">
      <div className="space-y-3">
        <Field label="Name"><Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Boys Hostel A" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="co-ed">Co-ed</option>
            </Select>
          </Field>
          <Field label="Total rooms"><Input type="number" value={form.total_rooms} onChange={(e) => set("total_rooms", e.target.value)} /></Field>
        </div>
        <button onClick={save} disabled={busy || !form.name} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy && <Spinner className="h-4 w-4" />} Save
        </button>
      </div>
    </Modal>
  );
}

function AddAllocation({ schoolId, hostels, students, onClose, onSaved }: { schoolId: string; hostels: Hostel[]; students: Student[]; onClose: () => void; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ mess_fee: "0" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      await insertRow("hostel_allocations", schoolId, {
        hostel_id: form.hostel_id,
        student_id: form.student_id,
        room_no: form.room_no || null,
        mess_fee: Number(form.mess_fee) || 0,
      });
      onSaved();
    } catch (e) {
      show(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Allocate room">
      <div className="space-y-3">
        <Field label="Hostel">
          <Select value={form.hostel_id || ""} onChange={(e) => set("hostel_id", e.target.value)}>
            <option value="">— Select —</option>
            {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select>
        </Field>
        <Field label="Student">
          <Select value={form.student_id || ""} onChange={(e) => set("student_id", e.target.value)}>
            <option value="">— Select —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Room no"><Input value={form.room_no || ""} onChange={(e) => set("room_no", e.target.value)} placeholder="A-201" /></Field>
          <Field label="Mess fee"><Input type="number" value={form.mess_fee} onChange={(e) => set("mess_fee", e.target.value)} /></Field>
        </div>
        <button onClick={save} disabled={busy || !form.hostel_id || !form.student_id} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy && <Spinner className="h-4 w-4" />} Allocate
        </button>
      </div>
    </Modal>
  );
}
