"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Plus, Trash2, Save } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import type { School, FeeStructure, GradeBand } from "@/lib/school/types";
import {
  PageHeader, Field, Input, Textarea, Spinner, useToast,
} from "@/components/school/ui";

const DEFAULT_GRADES: GradeBand[] = [
  { grade: "A+", min: 90 }, { grade: "A", min: 80 }, { grade: "B", min: 70 },
  { grade: "C", min: 60 }, { grade: "D", min: 50 }, { grade: "F", min: 0 },
];

export default function SettingsPage() {
  return (
    <ModuleGuard module="settings">
      <SettingsView />
    </ModuleGuard>
  );
}

function SettingsView() {
  const { schoolId, refresh } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", phone: "", address: "", academic_year: "", letterhead: "",
    jazzcash_number: "", jazzcash_name: "", easypaisa_number: "", easypaisa_name: "",
    bank_name: "", bank_account: "", bank_title: "", payment_note: "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeBand[]>(DEFAULT_GRADES);
  const [feeRows, setFeeRows] = useState<{ id?: string; class: string; amount: string }[]>([]);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [{ data: school }, { data: fs }] = await Promise.all([
        supabase.from("schools").select("*").eq("id", schoolId).single(),
        supabase.from("fee_structure").select("*").eq("school_id", schoolId).order("class"),
      ]);
      const s = school as School | null;
      if (s) {
        setForm({
          name: s.name ?? "", phone: s.phone ?? "", address: s.address ?? "",
          academic_year: s.academic_year ?? "", letterhead: s.letterhead ?? "",
          jazzcash_number: s.jazzcash_number ?? "", jazzcash_name: s.jazzcash_name ?? "",
          easypaisa_number: s.easypaisa_number ?? "", easypaisa_name: s.easypaisa_name ?? "",
          bank_name: s.bank_name ?? "", bank_account: s.bank_account ?? "",
          bank_title: s.bank_title ?? "", payment_note: s.payment_note ?? "",
        });
        setLogoUrl(s.logo_url);
        if (Array.isArray(s.grading_scheme) && s.grading_scheme.length) setGrades(s.grading_scheme);
      }
      setFeeRows(((fs ?? []) as FeeStructure[]).map((r) => ({ id: r.id, class: r.class, amount: String(r.amount) })));
    } catch {
      show("Could not load settings", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function uploadLogo(file: File) {
    if (!schoolId) return;
    setUploading(true);
    try {
      const supabase = sb();
      const ext = file.name.split(".").pop() || "png";
      const path = `${schoolId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("school-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      await supabase.from("schools").update({ logo_url: data.publicUrl }).eq("id", schoolId);
      await refresh();
      show("Logo updated");
    } catch {
      show("Logo upload failed (did you run the Phase 4 SQL & create the bucket?)", "error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!schoolId) return;
    setSaving(true);
    try {
      const supabase = sb();
      const cleanGrades = grades
        .filter((g) => g.grade.trim())
        .map((g) => ({ grade: g.grade.trim(), min: Number(g.min) || 0 }))
        .sort((a, b) => b.min - a.min);
      const { error } = await supabase.from("schools").update({
        name: form.name.trim() || "School",
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        academic_year: form.academic_year.trim() || null,
        letterhead: form.letterhead.trim() || null,
        grading_scheme: cleanGrades,
        jazzcash_number: form.jazzcash_number.trim() || null,
        jazzcash_name: form.jazzcash_name.trim() || null,
        easypaisa_number: form.easypaisa_number.trim() || null,
        easypaisa_name: form.easypaisa_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_account: form.bank_account.trim() || null,
        bank_title: form.bank_title.trim() || null,
        payment_note: form.payment_note.trim() || null,
      }).eq("id", schoolId);
      if (error) throw error;

      // Upsert fee structure rows.
      const rows = feeRows.filter((r) => r.class.trim()).map((r) => ({
        school_id: schoolId, class: r.class.trim(), amount: Number(r.amount) || 0,
      }));
      if (rows.length) {
        const { error: fe } = await supabase.from("fee_structure").upsert(rows, { onConflict: "school_id,class" });
        if (fe) throw fe;
      }
      await refresh();
      await load();
      show("Settings saved");
    } catch {
      show("Could not save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-muted"><Spinner className="h-4 w-4" /> Loading…</div>;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="School profile, branding, grading and fee structure."
        actions={
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">School profile</h3>
          <div className="space-y-3">
            <Field label="School name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Academic year"><Input value={form.academic_year} onChange={(e) => set("academic_year", e.target.value)} placeholder="2026-27" /></Field>
            </div>
            <Field label="Address"><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
            <Field label="Letterhead (printed under school name)"><Textarea value={form.letterhead} onChange={(e) => set("letterhead", e.target.value)} rows={3} placeholder="Phone · Email · Address · Affiliation" /></Field>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Logo</h3>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
              {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted">No logo</span>}
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft disabled:opacity-50">
                {uploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Upload logo
              </button>
              <p className="mt-1 text-xs text-muted">PNG/JPG. Appears on printed documents.</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
            </div>
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold">Grading scheme</h3>
          <div className="space-y-2">
            {grades.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={g.grade} onChange={(e) => setGrades((c) => c.map((x, j) => j === i ? { ...x, grade: e.target.value } : x))} className="w-24" placeholder="Grade" />
                <span className="text-sm text-muted">min %</span>
                <Input type="number" value={String(g.min)} onChange={(e) => setGrades((c) => c.map((x, j) => j === i ? { ...x, min: Number(e.target.value) } : x))} className="w-24" />
                <button onClick={() => setGrades((c) => c.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setGrades((c) => [...c, { grade: "", min: 0 }])} className="inline-flex items-center gap-1 text-sm text-accent hover:underline"><Plus className="h-4 w-4" /> Add grade band</button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
          <h3 className="mb-1 text-sm font-semibold">Fee payment accounts</h3>
          <p className="mb-3 text-xs text-muted">Yeh numbers parents ko parent portal mein dikhenge taake wo fee bhej sakein. (These show to parents so they can pay fees directly.)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold text-[#b91d2e]">JazzCash</p>
              <div className="space-y-2">
                <Field label="Account number"><Input value={form.jazzcash_number} onChange={(e) => set("jazzcash_number", e.target.value)} placeholder="03xx-xxxxxxx" /></Field>
                <Field label="Account title / name"><Input value={form.jazzcash_name} onChange={(e) => set("jazzcash_name", e.target.value)} placeholder="e.g. City Public School" /></Field>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold text-[#1aa84a]">EasyPaisa</p>
              <div className="space-y-2">
                <Field label="Account number"><Input value={form.easypaisa_number} onChange={(e) => set("easypaisa_number", e.target.value)} placeholder="03xx-xxxxxxx" /></Field>
                <Field label="Account title / name"><Input value={form.easypaisa_name} onChange={(e) => set("easypaisa_name", e.target.value)} placeholder="e.g. City Public School" /></Field>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3 sm:col-span-2">
              <p className="mb-2 text-xs font-semibold text-muted">Bank account (optional)</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Field label="Bank name"><Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="e.g. HBL" /></Field>
                <Field label="Account title"><Input value={form.bank_title} onChange={(e) => set("bank_title", e.target.value)} /></Field>
                <Field label="Account / IBAN"><Input value={form.bank_account} onChange={(e) => set("bank_account", e.target.value)} /></Field>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Field label="Note for parents (optional)"><Textarea value={form.payment_note} onChange={(e) => set("payment_note", e.target.value)} rows={2} placeholder="e.g. Fee bhejne ke baad screenshot teacher ko chat par bhej dein." /></Field>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Per-class fee structure</h3>
          <p className="mb-3 text-xs text-muted">Used by &quot;Generate Monthly&quot; fee defaults and challans.</p>
          <div className="space-y-2">
            {feeRows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={r.class} onChange={(e) => setFeeRows((c) => c.map((x, j) => j === i ? { ...x, class: e.target.value } : x))} className="w-40" placeholder="Class (e.g. 5)" />
                <span className="text-sm text-muted">Rs.</span>
                <Input type="number" value={r.amount} onChange={(e) => setFeeRows((c) => c.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} className="w-40" placeholder="Amount" />
                <button onClick={() => setFeeRows((c) => c.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-muted hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setFeeRows((c) => [...c, { class: "", amount: "" }])} className="inline-flex items-center gap-1 text-sm text-accent hover:underline"><Plus className="h-4 w-4" /> Add class</button>
          </div>
        </section>
      </div>
    </div>
  );
}
