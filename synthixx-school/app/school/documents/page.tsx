"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, Printer, Save, Trash2, FileText } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import { getAIInsight } from "@/lib/school/ai";
import { printDocument } from "@/components/school/print";
import type { SchoolDocument, Student } from "@/lib/school/types";
import {
  PageHeader, EmptyState, Field, Select, Textarea, Pill, useToast, Spinner,
} from "@/components/school/ui";

const DOC_TYPES = [
  { value: "character", label: "Character Certificate" },
  { value: "leaving", label: "School Leaving Certificate" },
  { value: "fee-clearance", label: "Fee Clearance Certificate" },
  { value: "salary-slip", label: "Salary Slip" },
  { value: "custom", label: "Custom Document" },
];

export default function DocumentsPage() {
  return (
    <ModuleGuard module="documents">
      <DocumentsView />
    </ModuleGuard>
  );
}

function DocumentsView() {
  const { schoolId, schoolName } = useSchool();
  const { show } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [docs, setDocs] = useState<SchoolDocument[]>([]);
  const [type, setType] = useState("character");
  const [studentId, setStudentId] = useState("");
  const [lang, setLang] = useState("English");
  const [details, setDetails] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    const supabase = sb();
    const [s, d] = await Promise.all([
      supabase.from("students").select("*").eq("school_id", schoolId),
      supabase.from("documents").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(50),
    ]);
    setStudents((s.data ?? []) as Student[]);
    setDocs((d.data ?? []) as SchoolDocument[]);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const typeLabel = (v: string) => DOC_TYPES.find((t) => t.value === v)?.label ?? v;

  async function generate() {
    setBusy(true);
    try {
      const student = students.find((s) => s.id === studentId);
      const text = await getAIInsight(
        `Write a formal, print-ready ${typeLabel(type)} in ${lang}. Do NOT include the school header, date line, or signature lines (those are added by the template). Keep it professional and ready to print. Output only the document body.`,
        `School: ${schoolName}. Document: ${typeLabel(type)}. ${student ? `Student: ${student.name}${student.class ? `, Class ${student.class}` : ""}${student.roll_no ? `, Roll ${student.roll_no}` : ""}.` : ""} Extra details: ${details || "none"}.`,
      );
      setBody(text);
    } catch { show("Generation failed", "error"); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!schoolId || !body.trim()) return;
    setSaving(true);
    try {
      const row = (await insertRow("documents", schoolId, {
        type, title: typeLabel(type), body: body.trim(), student_id: studentId || null,
      })) as SchoolDocument;
      setDocs((c) => [row, ...c]);
      show("Document saved");
    } catch { show("Save failed", "error"); }
    finally { setSaving(false); }
  }

  function print(title: string, text: string) {
    printDocument({ schoolName, title, body: text });
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    try { await deleteRow("documents", id); setDocs((c) => c.filter((d) => d.id !== id)); show("Deleted"); }
    catch { show("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader title="Documents" description="Generate print-ready certificates and letters with AI." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Generate</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Document type"><Select value={type} onChange={(e) => setType(e.target.value)}>{DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
              <Field label="Language"><Select value={lang} onChange={(e) => setLang(e.target.value)}><option>English</option><option>Urdu</option></Select></Field>
            </div>
            <Field label="Student (optional)">
              <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">None</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
              </Select>
            </Field>
            <Field label="Extra details (optional)"><Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. conduct excellent, leaving for relocation" /></Field>
            <button onClick={generate} disabled={busy} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
              {busy ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} {busy ? "Generating…" : "Generate with AI"}
            </button>

            {body && (
              <>
                <Field label="Document body (editable)"><Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent-soft disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
                  <button onClick={() => print(typeLabel(type), body)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Printer className="h-4 w-4" /> Print</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><FileText className="h-4 w-4 text-accent" /> Saved documents</h3>
          {docs.length === 0 ? <EmptyState title="No documents" description="Generated documents will be saved here." /> : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="rounded-lg bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium"><Pill tone="blue">{typeLabel(d.type)}</Pill></p>
                      <p className="mt-0.5 text-xs text-muted">{d.student_id ? studentName.get(d.student_id) ?? "" : ""} · {new Date(d.created_at).toLocaleDateString()}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted">{d.body}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => print(typeLabel(d.type), d.body ?? "")} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-accent" aria-label="Print"><Printer className="h-4 w-4" /></button>
                      <button onClick={() => remove(d.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
