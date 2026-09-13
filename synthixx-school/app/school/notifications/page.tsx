"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { getAIInsight } from "@/lib/school/ai";
import type { Notification } from "@/lib/school/types";
import {
  PageHeader, EmptyState, Field, Select, Textarea, Modal, AIButton, Pill, useToast,
} from "@/components/school/ui";

const TYPES = ["Fee Reminder", "Attendance Alert", "Announcement", "Custom"];
const RECIPIENTS = [
  { value: "all_parents", label: "All Parents" },
  { value: "specific_class", label: "Specific Class" },
  { value: "all_staff", label: "All Staff" },
];

export default function NotificationsPage() {
  return (
    <ModuleGuard module="notifications">
      <NotificationsView />
    </ModuleGuard>
  );
}

interface ChannelCfg { email: boolean; whatsapp: boolean; sms: boolean }

function NotificationsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [log, setLog] = useState<Notification[]>([]);
  const [type, setType] = useState("Announcement");
  const [recipient, setRecipient] = useState("all_parents");
  const [klass, setKlass] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [channels, setChannels] = useState<Record<string, boolean>>({ in_app: true, email: false, whatsapp: false, sms: false });
  const [cfg, setCfg] = useState<ChannelCfg>({ email: false, whatsapp: false, sms: false });
  const [triggers, setTriggers] = useState({ feeDue: false, absent: false, results: false });

  const load = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await sb().from("notifications").select("*").eq("school_id", schoolId).order("sent_at", { ascending: false }).limit(50);
    setLog((data ?? []) as Notification[]);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/school/notify").then((r) => r.json()).then((d) => d?.configured && setCfg(d.configured)).catch(() => {});
  }, []);

  async function aiDraft() {
    setAiBusy(true);
    try {
      const text = await getAIInsight(
        `Draft a short, polite ${type} notification for a school to send to ${recipient.replace("_", " ")}. Keep it under 3 sentences. Output only the message.`,
        message.trim() || `Write a ${type.toLowerCase()} message.`,
      );
      setMessage(text);
    } catch { show("AI draft failed", "error"); }
    finally { setAiBusy(false); }
  }

  async function sendNotification() {
    if (!schoolId || !message.trim()) return;
    const selected = Object.entries(channels).filter(([, on]) => on).map(([k]) => k);
    if (selected.length === 0) { show("Pick at least one channel", "info"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/school/notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, recipientType: recipient, class: klass || null, message: message.trim(), channels: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Send failed");
      if (data.log) setLog((c) => [data.log as Notification, ...c]);
      else await load();

      const live = data.results as Record<string, { sent: number; failed: number; skipped?: string }> | undefined;
      const liveSummary = live
        ? Object.entries(live).map(([ch, r]) => r.skipped ? `${ch}: ${r.skipped}` : `${ch}: ${r.sent} sent${r.failed ? `, ${r.failed} failed` : ""}`).join(" · ")
        : "";
      setMessage("");
      show(liveSummary ? `Sent. ${liveSummary}` : "Notification sent");
    } catch (e) { show(e instanceof Error ? e.message : "Send failed", "error"); }
    finally { setBusy(false); }
  }

  async function runTriggers() {
    setBusy(true);
    try {
      const res = await fetch("/api/school/triggers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeDue: triggers.feeDue, absent: triggers.absent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      const sum = data.summary ? Object.values(data.summary)[0] as { feeReminders: number; absentAlerts: number; delivered: number } | undefined : undefined;
      await load();
      show(sum ? `Queued ${sum.feeReminders} fee + ${sum.absentAlerts} absent reminders (${sum.delivered} delivered).` : "Triggers run");
    } catch (e) { show(e instanceof Error ? e.message : "Failed", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Notifications" description="Send announcements and reminders to parents and staff." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Compose</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Recipients"><Select value={recipient} onChange={(e) => setRecipient(e.target.value)}>{RECIPIENTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select></Field>
            </div>
            {recipient === "specific_class" && (
              <Field label="Class"><input value={klass} onChange={(e) => setKlass(e.target.value)} placeholder="e.g. 5" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" /></Field>
            )}
            <Field label="Message"><Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message, or let AI draft it…" /></Field>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Channels</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <ChannelBox label="In-app" k="in_app" channels={channels} setChannels={setChannels} />
                <ChannelBox label={`Email${cfg.email ? "" : " (setup)"}`} k="email" channels={channels} setChannels={setChannels} />
                <ChannelBox label={`WhatsApp${cfg.whatsapp ? "" : " (setup)"}`} k="whatsapp" channels={channels} setChannels={setChannels} />
                <ChannelBox label={`SMS${cfg.sms ? "" : " (setup)"}`} k="sms" channels={channels} setChannels={setChannels} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <AIButton loading={aiBusy} onClick={aiDraft}>AI draft</AIButton>
            </div>
            <button onClick={sendNotification} disabled={busy || !message.trim()} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
              <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send Notification"}
            </button>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h4 className="mb-2 text-sm font-semibold">Auto triggers</h4>
            <Toggle label="Fee pending → reminder to parent" on={triggers.feeDue} onChange={(v) => setTriggers((t) => ({ ...t, feeDue: v }))} />
            <Toggle label="Absent 3 days in a row → parent alert" on={triggers.absent} onChange={(v) => setTriggers((t) => ({ ...t, absent: v }))} />
            <button onClick={runTriggers} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft disabled:opacity-50">
              <Send className="h-4 w-4" /> Run reminders now
            </button>
            <p className="mt-2 text-xs text-muted">Sends the selected reminders to parents via WhatsApp/SMS (where configured). A cron can call <code>/api/school/triggers</code> daily to fully automate this.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sent log</h3>
            <WhatsAppButton />
          </div>
          {log.length === 0 ? (
            <EmptyState title="No notifications yet" description="Your sent messages will appear here." />
          ) : (
            <ul className="space-y-2">
              {log.map((n) => (
                <li key={n.id} className="rounded-lg bg-background p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Pill tone="blue">{n.type}</Pill>
                    <span className="text-xs text-muted">{new Date(n.sent_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{n.recipient_type.replace("_", " ")} · {n.channel}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelBox({ label, k, channels, setChannels }: {
  label: string; k: string; channels: Record<string, boolean>; setChannels: (fn: (c: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-muted">
      <input type="checkbox" checked={!!channels[k]} onChange={(e) => setChannels((c) => ({ ...c, [k]: e.target.checked }))} /> {label}
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-1.5 text-left text-sm">
      <span className="text-muted">{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-border"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

function WhatsAppButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-accent-soft">
        <MessageCircle className="h-3.5 w-3.5 text-green-500" /> Connect WhatsApp
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Connect WhatsApp Business">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Create a Meta Business account and a WhatsApp Business app.</li>
          <li>Get your Phone Number ID and a permanent access token.</li>
          <li>Add them to your environment as WHATSAPP_PHONE_ID and WHATSAPP_TOKEN.</li>
          <li>Approve message templates in Meta Business Manager.</li>
          <li>Once configured, the &quot;Send via WhatsApp&quot; option will deliver messages.</li>
        </ol>
        <p className="mt-4 text-xs text-muted">This is a setup guide — live WhatsApp delivery requires the credentials above.</p>
      </Modal>
    </>
  );
}
