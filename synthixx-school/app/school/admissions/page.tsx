"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, UserPlus, Trash2, Link2 } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { updateRow, deleteRow, insertRow } from "@/lib/school/queries";
import type { AdmissionLead } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Pill, Select, useToast,
} from "@/components/school/ui";

const STATUSES: AdmissionLead["status"][] = ["new", "contacted", "admitted", "rejected"];
const TONE: Record<AdmissionLead["status"], "blue" | "amber" | "green" | "red"> = {
  new: "blue", contacted: "amber", admitted: "green", rejected: "red",
};

export default function AdmissionsPage() {
  return (
    <ModuleGuard module="admissions">
      <AdmissionsView />
    </ModuleGuard>
  );
}

function AdmissionsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<AdmissionLead[]>([]);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data } = await sb()
        .from("admission_leads")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });
      setLeads((data ?? []) as AdmissionLead[]);
    } catch {
      show("Could not load leads", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const publicLink = useMemo(
    () => (typeof window !== "undefined" && schoolId ? `${window.location.origin}/admissions/${schoolId}` : ""),
    [schoolId],
  );

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, admitted: 0, rejected: 0 } as Record<AdmissionLead["status"], number>;
    leads.forEach((l) => { c[l.status] = (c[l.status] ?? 0) + 1; });
    return c;
  }, [leads]);

  const filtered = filter ? leads.filter((l) => l.status === filter) : leads;

  async function setStatus(lead: AdmissionLead, status: AdmissionLead["status"]) {
    try {
      await updateRow("admission_leads", lead.id, { status });
      setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    } catch {
      show("Could not update status", "error");
    }
  }

  async function convert(lead: AdmissionLead) {
    if (!schoolId) return;
    if (!confirm(`Convert "${lead.name}" into an enrolled student?`)) return;
    try {
      await insertRow("students", schoolId, {
        name: lead.name,
        class: lead.class_applied,
        parent_name: lead.parent_name,
        parent_phone: lead.phone,
        status: "active",
      });
      await updateRow("admission_leads", lead.id, { status: "admitted" });
      setLeads((cur) => cur.map((l) => (l.id === lead.id ? { ...l, status: "admitted" } : l)));
      show(`${lead.name} added to Students`);
    } catch {
      show("Could not convert to student", "error");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this lead?")) return;
    try {
      await deleteRow("admission_leads", id);
      setLeads((cur) => cur.filter((l) => l.id !== id));
    } catch {
      show("Delete failed", "error");
    }
  }

  function copyLink() {
    if (!publicLink) return;
    navigator.clipboard?.writeText(publicLink).then(() => show("Link copied")).catch(() => {});
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Admissions"
        description="Online enquiry leads and admission pipeline"
        actions={
          <button onClick={copyLink} className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
            <Copy className="h-4 w-4" /> Copy public link
          </button>
        }
      />

      <div className="sk-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="New" value={counts.new} />
        <StatCard label="Contacted" value={counts.contacted} />
        <StatCard label="Admitted" value={counts.admitted} />
        <StatCard label="Rejected" value={counts.rejected} />
      </div>

      {publicLink && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-accent-soft/40 px-3 py-2 text-sm">
          <Link2 className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate text-muted">Share this link to collect enquiries:</span>
          <code className="truncate text-xs">{publicLink}</code>
        </div>
      )}

      <div className="max-w-xs">
        <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </Select>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState title="No leads yet" description="Share your public admissions link to start collecting enquiries." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-accent-soft/40 text-left">
                <th className="p-3 font-medium">Applicant</th>
                <th className="p-3 font-medium">Class</th>
                <th className="p-3 font-medium">Contact</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="sk-stagger">
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{l.name}</div>
                    {l.parent_name && <div className="text-xs text-muted">Parent: {l.parent_name}</div>}
                    {l.notes && <div className="mt-0.5 text-xs text-muted">{l.notes}</div>}
                  </td>
                  <td className="p-3">{l.class_applied || "—"}</td>
                  <td className="p-3">
                    <div>{l.phone || "—"}</div>
                    {l.email && <div className="text-xs text-muted">{l.email}</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Pill tone={TONE[l.status]}>{l.status}</Pill>
                      <Select
                        value={l.status}
                        onChange={(e) => setStatus(l, e.target.value as AdmissionLead["status"])}
                        className="w-auto py-1 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => convert(l)}
                        disabled={l.status === "admitted"}
                        className="sk-press inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-accent-soft disabled:opacity-40"
                        title="Convert to student"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Convert
                      </button>
                      <button
                        onClick={() => remove(l.id)}
                        className="sk-press rounded-lg border border-border p-1.5 text-danger hover:bg-danger/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
