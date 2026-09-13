"use client";

import { useState } from "react";
import { Sparkles, Printer } from "lucide-react";
import { useSchool } from "@/components/school/school-provider";
import { getAIInsight } from "@/lib/school/ai";
import { printDocument } from "@/components/school/print";
import { Modal, Field, Input, Textarea, Select, Spinner, useToast } from "@/components/school/ui";

export interface GenField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "textarea" | "select";
  options?: string[];
  defaultValue?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  cta?: string;
  fields: GenField[];
  build: (values: Record<string, string>) => { system: string; user: string };
  printTitle: string;
}

export function AIGeneratorModal({ open, onClose, title, cta = "Generate", fields, build, printTitle }: Props) {
  const { schoolName, logoUrl, letterhead } = useSchool();
  const { show } = useToast();
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, f.defaultValue ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  function set(k: string, v: string) { setValues((c) => ({ ...c, [k]: v })); }

  async function generate() {
    setBusy(true);
    setResult("");
    try {
      const { system, user } = build(values);
      const text = await getAIInsight(system, user);
      setResult(text || "(no response)");
    } catch (e) {
      show(e instanceof Error ? e.message : "Generation failed", "error");
    } finally {
      setBusy(false);
    }
  }

  function print() {
    printDocument({ schoolName, logoUrl, letterhead, title: printTitle, body: result, meta: new Date().toLocaleDateString() });
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === "textarea" ? (
              <Textarea value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={3} placeholder={f.placeholder} />
            ) : f.type === "select" ? (
              <Select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </Select>
            ) : (
              <Input type={f.type === "number" ? "number" : "text"} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
          </Field>
        ))}

        <button onClick={generate} disabled={busy} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          {busy ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} {busy ? "Generating…" : cta}
        </button>

        {result && (
          <div className="space-y-2">
            <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 text-sm">{result}</div>
            <button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
