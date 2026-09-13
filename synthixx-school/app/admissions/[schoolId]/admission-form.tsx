"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const fieldCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function AdmissionForm({ schoolId }: { schoolId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    parent_name: "",
    phone: "",
    email: "",
    class_applied: "",
    notes: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not submit");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="sk-animate-scale-in py-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-3 text-lg font-semibold">Enquiry submitted</h2>
        <p className="mt-1 text-sm text-muted">
          Thank you! The school will contact you soon regarding admission.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Student name *</span>
        <input className={fieldCls} value={form.name} onChange={set("name")} required placeholder="Full name" />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Parent / Guardian</span>
          <input className={fieldCls} value={form.parent_name} onChange={set("parent_name")} placeholder="Parent name" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Class applying for</span>
          <input className={fieldCls} value={form.class_applied} onChange={set("class_applied")} placeholder="e.g. Class 5" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Phone</span>
          <input className={fieldCls} value={form.phone} onChange={set("phone")} placeholder="03xx-xxxxxxx" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input className={fieldCls} type="email" value={form.email} onChange={set("email")} placeholder="name@email.com" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Notes (optional)</span>
        <textarea className={fieldCls} rows={3} value={form.notes} onChange={set("notes")} placeholder="Anything you'd like the school to know" />
      </label>
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="sk-press flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit enquiry
      </button>
    </form>
  );
}
