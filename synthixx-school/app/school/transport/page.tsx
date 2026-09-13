"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UserPlus, Bus } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import type { Route, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, useToast,
} from "@/components/school/ui";

interface StudentRoute { id: string; student_id: string | null; route_id: string | null; pickup_point: string | null }

export default function TransportPage() {
  return (
    <ModuleGuard module="transport">
      <TransportView />
    </ModuleGuard>
  );
}

function TransportView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [assigns, setAssigns] = useState<StudentRoute[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Route | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [r, sr, s] = await Promise.all([
        supabase.from("routes").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("student_routes").select("*").eq("school_id", schoolId),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setRoutes((r.data ?? []) as Route[]);
      setAssigns((sr.data ?? []) as StudentRoute[]);
      setStudents((s.data ?? []) as Student[]);
    } catch { show("Could not load transport", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const countFor = (routeId: string) => assigns.filter((a) => a.route_id === routeId).length;

  async function remove(id: string) {
    if (!confirm("Delete this route?")) return;
    try { await deleteRow("routes", id); setRoutes((c) => c.filter((r) => r.id !== id)); show("Route deleted"); }
    catch { show("Delete failed", "error"); }
  }

  const monthlyTotal = routes.reduce((sum, r) => sum + (Number(r.monthly_fee) || 0) * countFor(r.id), 0);

  return (
    <div>
      <PageHeader
        title="Transport"
        description="Routes, vehicles and student assignments."
        actions={
          <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Add Route</button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Routes" value={routes.length} />
        <StatCard label="Students using transport" value={assigns.length} />
        <StatCard label="Monthly transport fee" value={`Rs. ${monthlyTotal.toLocaleString()}`} />
      </div>

      {loading ? <TableSkeleton cols={3} /> : routes.length === 0 ? (
        <EmptyState title="No routes" description="Add your first transport route." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {routes.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 font-medium"><Bus className="h-4 w-4 text-accent" /> {r.route_name}</h3>
                  <p className="mt-0.5 text-xs text-muted">{r.area || "—"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setAssignFor(r)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent hover:bg-accent-soft"><UserPlus className="h-3.5 w-3.5" /> Assign</button>
                  <button onClick={() => remove(r.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-xs text-muted">Driver</dt><dd>{r.driver_name || "—"}</dd></div>
                <div><dt className="text-xs text-muted">Driver phone</dt><dd>{r.driver_phone || "—"}</dd></div>
                <div><dt className="text-xs text-muted">Vehicle</dt><dd>{r.vehicle_no || "—"}</dd></div>
                <div><dt className="text-xs text-muted">Monthly fee</dt><dd>Rs. {(Number(r.monthly_fee) || 0).toLocaleString()}</dd></div>
              </dl>
              <div className="mt-3 border-t border-border pt-2">
                <p className="mb-1 text-xs text-muted">{countFor(r.id)} / {r.capacity || "∞"} students</p>
                <div className="flex flex-wrap gap-1">
                  {assigns.filter((a) => a.route_id === r.id).slice(0, 8).map((a) => (
                    <span key={a.id} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs">{studentName.get(a.student_id ?? "") ?? "—"}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddRouteModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={(r) => { setRoutes((c) => [r, ...c]); show("Route added"); }} />
      {assignFor && (
        <AssignModal route={assignFor} students={students} assigned={assigns.filter((a) => a.route_id === assignFor.id)} onClose={() => setAssignFor(null)}
          onAssigned={(sr) => setAssigns((c) => [...c, sr])} />
      )}
    </div>
  );
}

function AddRouteModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (r: Route) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ route_name: "", area: "", driver_name: "", driver_phone: "", vehicle_no: "", capacity: "", monthly_fee: "" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.route_name.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("routes", schoolId, {
        route_name: form.route_name.trim(), area: form.area.trim() || null, driver_name: form.driver_name.trim() || null,
        driver_phone: form.driver_phone.trim() || null, vehicle_no: form.vehicle_no.trim() || null,
        capacity: Number(form.capacity) || 0, monthly_fee: Number(form.monthly_fee) || 0,
      })) as Route;
      onAdded(row);
      setForm({ route_name: "", area: "", driver_name: "", driver_phone: "", vehicle_no: "", capacity: "", monthly_fee: "" });
      onClose();
    } catch { show("Could not add route", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Route">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Route name"><Input value={form.route_name} onChange={(e) => set("route_name", e.target.value)} required /></Field>
        <Field label="Area covered"><Input value={form.area} onChange={(e) => set("area", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Driver name"><Input value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} /></Field>
          <Field label="Driver phone"><Input value={form.driver_phone} onChange={(e) => set("driver_phone", e.target.value)} /></Field>
          <Field label="Vehicle no"><Input value={form.vehicle_no} onChange={(e) => set("vehicle_no", e.target.value)} /></Field>
          <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
        </div>
        <Field label="Monthly fee (Rs.)"><Input type="number" value={form.monthly_fee} onChange={(e) => set("monthly_fee", e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Route"}</button>
      </form>
    </Modal>
  );
}

function AssignModal({
  route, students, assigned, onClose, onAssigned,
}: { route: Route; students: Student[]; assigned: StudentRoute[]; onClose: () => void; onAssigned: (sr: StudentRoute) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [studentId, setStudentId] = useState("");
  const [pickup, setPickup] = useState("");
  const [busy, setBusy] = useState(false);
  const assignedIds = new Set(assigned.map((a) => a.student_id));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !studentId) return;
    setBusy(true);
    try {
      const row = (await insertRow("student_routes", schoolId, { route_id: route.id, student_id: studentId, pickup_point: pickup.trim() || null })) as StudentRoute;
      onAssigned(row);
      setStudentId(""); setPickup("");
      show("Student assigned");
    } catch { show("Could not assign", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Assign to ${route.route_name}`}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Select student</option>
            {students.filter((s) => !assignedIds.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </select>
        </Field>
        <Field label="Pickup point"><Input value={pickup} onChange={(e) => setPickup(e.target.value)} /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Assigning…" : "Assign"}</button>
      </form>
    </Modal>
  );
}
