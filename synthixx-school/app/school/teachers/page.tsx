"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { listRows, insertRow, updateRow, deleteRow } from "@/lib/school/queries";
import { Avatar, AvatarUpload } from "@/components/school/avatar-upload";
import type { Teacher } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, useToast,
} from "@/components/school/ui";

export default function TeachersPage() {
  return (
    <ModuleGuard module="teachers">
      <TeachersView />
    </ModuleGuard>
  );
}

function TeachersView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Teacher[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      setRows(await listRows<Teacher>("teachers", schoolId));
    } catch {
      show("Could not load teachers", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this teacher?")) return;
    try {
      await deleteRow("teachers", id);
      setRows((c) => c.filter((t) => t.id !== id));
      show("Teacher deleted");
    } catch {
      show("Delete failed", "error");
    }
  }

  const totalSalary = rows.reduce((sum, t) => sum + (Number(t.salary) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Teachers"
        description="Manage teaching staff and their details."
        actions={
          <button onClick={() => { setEditing(null); setOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Teacher
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Total Teachers" value={rows.length} />
        <StatCard label="Monthly Salary" value={`Rs. ${totalSalary.toLocaleString()}`} />
      </div>

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="No teachers" description="Add your first teacher." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="sk-stagger">
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={t.name} url={t.photo_url} size={32} />
                      {t.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">{t.subject || "—"}</td>
                  <td className="px-4 py-3">{t.phone || "—"}</td>
                  <td className="px-4 py-3">Rs. {(Number(t.salary) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(t); setOpen(true); }} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(t.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TeacherModal open={open} editing={editing} onClose={() => setOpen(false)}
        onSaved={(t, isEdit) => { setRows((c) => isEdit ? c.map((x) => (x.id === t.id ? t : x)) : [t, ...c]); show(isEdit ? "Teacher updated" : "Teacher added"); }} />
    </div>
  );
}

function TeacherModal({
  open, editing, onClose, onSaved,
}: { open: boolean; editing: Teacher | null; onClose: () => void; onSaved: (t: Teacher, isEdit: boolean) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const blank = { name: "", subject: "", phone: "", salary: "" };
  const [form, setForm] = useState(blank);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        name: editing.name ?? "", subject: editing.subject ?? "", phone: editing.phone ?? "",
        salary: editing.salary != null ? String(editing.salary) : "",
      } : blank);
      setPhotoUrl(editing?.photo_url ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.name.trim()) return;
    setBusy(true);
    try {
      const values = {
        name: form.name.trim(),
        subject: form.subject.trim() || null,
        phone: form.phone.trim() || null,
        salary: Number(form.salary) || 0,
        photo_url: photoUrl,
      };
      if (editing) {
        const row = (await updateRow("teachers", editing.id, values)) as Teacher;
        onSaved(row, true);
      } else {
        const row = (await insertRow("teachers", schoolId, values)) as Teacher;
        onSaved(row, false);
      }
      onClose();
    } catch {
      show("Could not save teacher", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Teacher" : "Add Teacher"}>
      <form onSubmit={submit} className="space-y-3">
        {schoolId && (
          <Field label="Photo">
            <AvatarUpload schoolId={schoolId} entity="teachers" entityId={editing?.id} name={form.name} value={photoUrl} onChange={setPhotoUrl} />
          </Field>
        )}
        <Field label="Full name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <Field label="Subject"><Input value={form.subject} onChange={(e) => set("subject", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Salary (Rs.)"><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></Field>
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? "Saving…" : editing ? "Save Changes" : "Add Teacher"}
        </button>
      </form>
    </Modal>
  );
}
