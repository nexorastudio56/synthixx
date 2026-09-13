"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Mail } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { ROLE_LABEL, type Role } from "@/lib/school/roles";
import type { Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select, Pill, useToast,
} from "@/components/school/ui";

interface Member { id: string; user_id: string; email: string | null; role: Role; student_id: string | null }
interface Invite { id: string; email: string; role: Role; student_id: string | null; status: string }

const ROLES: Role[] = ["SCHOOL_ADMIN", "TEACHER", "ACCOUNTANT", "PARENT"];

export default function StaffAccessPage() {
  return (
    <ModuleGuard module="staff-access">
      <StaffAccessView />
    </ModuleGuard>
  );
}

function StaffAccessView() {
  const { userId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        fetch("/api/school/members", { cache: "no-store" }),
        sb().from("students").select("*"),
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMembers(data.members ?? []);
      setInvites(data.invites ?? []);
      setStudents((s.data ?? []) as Student[]);
    } catch (e) {
      show(e instanceof Error ? e.message : "Could not load", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => { load(); }, [load]);

  const studentName = (id: string | null) => students.find((s) => s.id === id)?.name ?? "";

  async function changeRole(memberId: string, role: Role) {
    try {
      const res = await fetch("/api/school/members", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMembers((c) => c.map((m) => (m.id === memberId ? { ...m, role } : m)));
      show("Role updated");
    } catch (e) { show(e instanceof Error ? e.message : "Update failed", "error"); }
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member's access?")) return;
    try {
      const res = await fetch(`/api/school/members?memberId=${memberId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setMembers((c) => c.filter((m) => m.id !== memberId));
      show("Member removed");
    } catch (e) { show(e instanceof Error ? e.message : "Remove failed", "error"); }
  }

  async function removeInvite(inviteId: string) {
    try {
      const res = await fetch(`/api/school/members?inviteId=${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setInvites((c) => c.filter((i) => i.id !== inviteId));
      show("Invite cancelled");
    } catch { show("Failed", "error"); }
  }

  return (
    <div>
      <PageHeader
        title="Staff & Access"
        description="Invite teachers, accountants and parents, and manage their roles."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <UserPlus className="h-4 w-4" /> Invite Member
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Members" value={members.length} />
        <StatCard label="Pending invites" value={invites.length} />
        <StatCard label="Admins" value={members.filter((m) => m.role === "SCHOOL_ADMIN" || m.role === "SUPER_ADMIN").length} />
      </div>

      {loading ? <TableSkeleton cols={3} /> : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Linked student</th><th className="px-4 py-3"></th></tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{m.email || m.user_id.slice(0, 8)}{m.user_id === userId && <span className="ml-2 text-xs text-muted">(you)</span>}</td>
                    <td className="px-4 py-3">
                      <Select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as Role)} className="h-8 w-40 py-0 text-xs">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </Select>
                    </td>
                    <td className="px-4 py-3">{m.role === "PARENT" ? studentName(m.student_id) || "—" : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeMember(m.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-2 mt-8 text-sm font-semibold">Pending invites</h2>
          {invites.length === 0 ? (
            <EmptyState title="No pending invites" description="Invited people appear here until they log in." />
          ) : (
            <div className="space-y-1.5">
              {invites.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted" /> {i.email} <Pill tone="blue">{ROLE_LABEL[i.role]}</Pill></span>
                  <button onClick={() => removeInvite(i.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Cancel"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <InviteModal open={open} onClose={() => setOpen(false)} students={students} onInvited={() => { show("Invite sent"); load(); }} />
    </div>
  );
}

function InviteModal({
  open, onClose, students, onInvited,
}: { open: boolean; onClose: () => void; students: Student[]; onInvited: () => void }) {
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("TEACHER");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/school/members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role, studentId: role === "PARENT" ? studentId || null : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setEmail(""); setRole("TEACHER"); setStudentId("");
      onClose();
      onInvited();
    } catch (e) { show(e instanceof Error ? e.message : "Invite failed", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Member">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" required /></Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </Select>
        </Field>
        {role === "PARENT" && (
          <Field label="Link to student">
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
            </Select>
          </Field>
        )}
        <p className="text-xs text-muted">They&apos;ll get access automatically the first time they sign in to Synthixx with this email and open the school agent.</p>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Sending…" : "Send Invite"}</button>
      </form>
    </Modal>
  );
}
