"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Send, CreditCard, MessageSquare, Copy, Wallet } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, deleteRow } from "@/lib/school/queries";
import { Avatar } from "@/components/school/avatar-upload";
import type { Student, Fee, Exam, Attendance, Assignment, Notification, School } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Pill, useToast,
} from "@/components/school/ui";

type SchoolPay = Pick<School, "jazzcash_number" | "jazzcash_name" | "easypaisa_number" | "easypaisa_name" | "bank_name" | "bank_account" | "bank_title" | "payment_note">;

interface ParentRow {
  id: string; school_id: string; student_id: string | null;
  name: string; phone: string | null; email: string | null; user_id: string | null; created_at: string;
}
interface MessageRow {
  id: string; parent_id: string | null; message: string; sent_by: string; created_at: string;
}

export default function ParentsPage() {
  return (
    <ModuleGuard module="parents">
      <ParentsRouter />
    </ModuleGuard>
  );
}

function ParentsRouter() {
  const { role } = useSchool();
  return role === "PARENT" ? <ParentView /> : <AdminParentsView />;
}

/* ----------------------------- Parent view ----------------------------- */
function ParentView() {
  const { schoolId, studentId, userId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [att, setAtt] = useState<Attendance[]>([]);
  const [homework, setHomework] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Notification[]>([]);
  const [parentRow, setParentRow] = useState<ParentRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [msg, setMsg] = useState("");
  const [schoolPay, setSchoolPay] = useState<SchoolPay | null>(null);

  const load = useCallback(async () => {
    if (!schoolId || !studentId) { setLoading(false); return; }
    setLoading(true);
    try {
      const supabase = sb();
      const [st, f, e, a, ann, sch] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
        supabase.from("fees").select("*").eq("school_id", schoolId).eq("student_id", studentId),
        supabase.from("exams").select("*").eq("school_id", schoolId).eq("student_id", studentId),
        supabase.from("attendance").select("*").eq("school_id", schoolId).eq("student_id", studentId),
        supabase.from("notifications").select("*").eq("school_id", schoolId).order("sent_at", { ascending: false }).limit(10),
        supabase.from("schools").select("jazzcash_number,jazzcash_name,easypaisa_number,easypaisa_name,bank_name,bank_account,bank_title,payment_note").eq("id", schoolId).maybeSingle(),
      ]);
      const stu = (st.data as Student) ?? null;
      setStudent(stu);
      setFees((f.data ?? []) as Fee[]);
      setExams((e.data ?? []) as Exam[]);
      setAtt((a.data ?? []) as Attendance[]);
      setAnnouncements((ann.data ?? []) as Notification[]);
      setSchoolPay((sch.data as SchoolPay) ?? null);

      if (stu?.class) {
        const hw = await supabase.from("assignments").select("*").eq("school_id", schoolId).eq("class", stu.class).order("due_date", { ascending: false });
        setHomework((hw.data ?? []) as Assignment[]);
      }
      const pr = await supabase.from("parents").select("*").eq("school_id", schoolId).eq("student_id", studentId)
        .or(`user_id.eq.${userId},user_id.is.null`).limit(1).maybeSingle();
      const prow = (pr.data as ParentRow) ?? null;
      setParentRow(prow);
      if (prow) {
        const m = await supabase.from("messages").select("*").eq("school_id", schoolId).eq("parent_id", prow.id).order("created_at");
        setMessages((m.data ?? []) as MessageRow[]);
      }
    } catch {
      show("Could not load", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, userId, show]);

  useEffect(() => { load(); }, [load]);

  // Returning from JazzCash/EasyPaisa/CashMaal checkout: confirm + refresh.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pay = params.get("pay");
    if (pay === "success") {
      show("Payment received. Updating fee status…");
      window.history.replaceState({}, "", window.location.pathname);
      const t = setTimeout(() => load(), 2500);
      return () => clearTimeout(t);
    }
    if (pay === "processing") {
      show("Payment received. Confirming with the bank…");
      window.history.replaceState({}, "", window.location.pathname);
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        load();
        if (tries >= 12) {
          clearInterval(iv);
          show("Still confirming. You can check the fee status shortly.", "info");
        }
      }, 3000);
      return () => clearInterval(iv);
    }
    if (pay === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (pay === "failed") {
      show("Payment was not completed. Please try again.", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load, show]);

  // Realtime: live-append messages for this parent's thread.
  useEffect(() => {
    if (!schoolId || !parentRow) return;
    const supabase = sb();
    const ch = supabase
      .channel(`msg-${parentRow.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `parent_id=eq.${parentRow.id}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((c) => (c.some((m) => m.id === row.id) ? c : [...c, row]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [schoolId, parentRow]);

  const attPct = att.length ? Math.round((att.filter((a) => a.status === "present").length / att.length) * 100) : null;
  const feeStatus = fees.some((f) => f.status === "unpaid") ? "unpaid" : fees.some((f) => f.status === "partial") ? "partial" : fees.length ? "paid" : null;

  const [paying, setPaying] = useState(false);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [gateways, setGateways] = useState<{ jazzcash: boolean; easypaisa: boolean }>({
    jazzcash: false, easypaisa: false,
  });
  const [btRef, setBtRef] = useState<string | null>(null);
  const [btInitiating, setBtInitiating] = useState(false);

  // Only advertise gateways the school has actually configured (server-side probe).
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/school/pay/jazzcash").then((r) => r.json()).catch(() => ({})),
      fetch("/api/school/pay/easypaisa").then((r) => r.json()).catch(() => ({})),
    ]).then(([j, e]) => {
      if (!alive) return;
      setGateways({
        jazzcash: !!j.configured,
        easypaisa: !!e.configured,
      });
    });
    return () => { alive = false; };
  }, []);

  const anyGateway = gateways.jazzcash || gateways.easypaisa;

  async function initiateBankTransfer() {
    if (unpaidFees.length === 0) { show("No pending fees", "info"); return; }
    setBtInitiating(true);
    try {
      const res = await fetch("/api/school/pay/bank-transfer/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeIds: unpaidFees.map((f) => f.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not initiate bank transfer");
      setBtRef(data.txnRef as string);
    } catch (e) {
      show(e instanceof Error ? e.message : "Could not initiate bank transfer", "error");
    } finally {
      setBtInitiating(false);
    }
  }

  function copyText(t: string) {
    navigator.clipboard?.writeText(t).then(() => show("Copied")).catch(() => {});
  }

  async function sendMessage() {
    if (!schoolId || !parentRow || !msg.trim()) return;
    try {
      const row = (await insertRow("messages", schoolId, { parent_id: parentRow.id, message: msg.trim(), sent_by: "parent" })) as MessageRow;
      setMessages((c) => [...c, row]);
      setMsg("");
    } catch {
      show("Could not send", "error");
    }
  }

  const unpaidFees = fees.filter((f) => f.status !== "paid");
  const unpaidTotal = unpaidFees.reduce((s, f) => s + (Number(f.amount) || 0), 0);

  async function payWith(gateway: "jazzcash" | "easypaisa") {
    if (unpaidFees.length === 0) { show("No pending fees", "info"); return; }
    setPaying(true);
    try {
      const res = await fetch(`/api/school/pay/${gateway}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feeIds: unpaidFees.map((f) => f.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Payment failed");
      // Auto-submit a form to the gateway's hosted checkout.
      if (data.action && data.fields) {
        const form = document.createElement("form");
        form.method = data.method || "POST";
        form.action = data.action as string;
        Object.entries(data.fields as Record<string, string>).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = k;
          input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }
      if (data.url) { window.location.href = data.url as string; return; }
      throw new Error("Gateway did not return a redirect");
    } catch (e) {
      show(e instanceof Error ? e.message : "Payment failed", "error");
      setPaying(false);
    }
  }

  if (loading) return <TableSkeleton cols={3} />;
  if (!student) return <EmptyState title="No child linked" description="Ask your school admin to link your account to a student." />;

  return (
    <div>
      <PageHeader title="Parent Portal" description="Your child's overview" />

      <div className="sk-animate-fade-up mb-4 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <Avatar name={student.name} url={student.photo_url} size={56} />
        <div>
          <p className="text-lg font-semibold">{student.name}</p>
          <p className="text-sm text-muted">{student.class ? `Class ${student.class}` : ""}{student.roll_no ? ` · Roll ${student.roll_no}` : ""}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Attendance" value={attPct === null ? "—" : `${attPct}%`} />
        <StatCard label="Fee Status" value={feeStatus === "paid" ? "Paid" : feeStatus === "unpaid" ? "Unpaid" : feeStatus === "partial" ? "Partial" : "—"} />
        <StatCard label="Results" value={exams.length} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Recent Results">
          {exams.length === 0 ? <p className="text-sm text-muted">No results yet.</p> : (
            <ul className="space-y-1.5 text-sm">
              {exams.slice(0, 6).map((e) => {
                const pct = Math.round(((Number(e.marks) || 0) / (Number(e.total_marks) || 100)) * 100);
                return <li key={e.id} className="flex justify-between"><span>{e.subject || "—"}</span><Pill tone={pct >= 50 ? "green" : "red"}>{pct}%</Pill></li>;
              })}
            </ul>
          )}
        </Section>

        <Section title="Homework">
          {homework.length === 0 ? <p className="text-sm text-muted">No homework.</p> : (
            <ul className="space-y-1.5 text-sm">
              {homework.slice(0, 6).map((h) => (
                <li key={h.id} className="flex justify-between gap-2">
                  <span className="truncate">{h.title}{h.subject ? ` · ${h.subject}` : ""}</span>
                  {h.due_date && <span className="shrink-0 text-xs text-muted">due {h.due_date}</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Announcements">
          {announcements.length === 0 ? <p className="text-sm text-muted">No announcements.</p> : (
            <ul className="space-y-2 text-sm">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-lg bg-background p-2.5"><p>{a.message}</p><p className="mt-1 text-xs text-muted">{new Date(a.sent_at).toLocaleDateString()}</p></li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Message Teacher">
          {!parentRow ? <p className="text-sm text-muted">Messaging not set up. Ask the admin to add your parent profile.</p> : (
            <>
              <div className="mb-2 max-h-48 space-y-2 overflow-y-auto">
                {messages.map((m) => (
                  <div key={m.id} className={m.sent_by === "parent" ? "text-right" : "text-left"}>
                    <span className={`inline-block rounded-2xl px-3 py-1.5 text-sm ${m.sent_by === "parent" ? "bg-accent text-accent-fg" : "bg-background"}`}>{m.message}</span>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
              </div>
              <div className="flex items-center gap-2">
                <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }} />
                <button onClick={sendMessage} className="rounded-lg bg-accent p-2 text-accent-fg hover:opacity-90" aria-label="Send"><Send className="h-4 w-4" /></button>
              </div>
            </>
          )}
        </Section>
      </div>

      {/* Manual fee payment: school's JazzCash / EasyPaisa / bank accounts. */}
      {unpaidTotal > 0 && hasPayAccounts(schoolPay) && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4 text-accent" /> Pay fees (Rs. {unpaidTotal.toLocaleString()})</h3>
          <p className="mt-1 text-xs text-muted">In accounts par fee bhejein, phir screenshot teacher ko neeche chat par bhej dein.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {schoolPay?.jazzcash_number && (
              <PayAccount tone="#b91d2e" label="JazzCash" number={schoolPay.jazzcash_number} name={schoolPay.jazzcash_name} onCopy={copyText} />
            )}
            {schoolPay?.easypaisa_number && (
              <PayAccount tone="#1aa84a" label="EasyPaisa" number={schoolPay.easypaisa_number} name={schoolPay.easypaisa_name} onCopy={copyText} />
            )}
            {schoolPay?.bank_account && (
              <PayAccount tone="#2563eb" label={schoolPay.bank_name || "Bank"} number={schoolPay.bank_account} name={schoolPay.bank_title} onCopy={copyText} />
            )}
          </div>
          {schoolPay?.payment_note && <p className="mt-3 rounded-lg bg-accent-soft/40 p-2.5 text-xs text-muted">{schoolPay.payment_note}</p>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {unpaidTotal > 0 && !anyGateway && (
          <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted">No online payment gateway is configured yet — please use the manual accounts above (or the school will add one soon).</p>
        )}
        <button onClick={() => setGatewayOpen(true)} disabled={paying || unpaidTotal <= 0 || !anyGateway} className="sk-press inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">
          <CreditCard className="h-4 w-4" /> {paying ? "Redirecting…" : unpaidTotal > 0 ? `Pay Online — Rs. ${unpaidTotal.toLocaleString()}` : "No pending fees"}
        </button>
        {unpaidTotal > 0 && (
          <button onClick={initiateBankTransfer} disabled={btInitiating || unpaidTotal <= 0} className="sk-press inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent-soft disabled:opacity-50">
            <Wallet className="h-4 w-4" /> {btInitiating ? "Generating…" : "Pay via Bank Transfer"}
          </button>
        )}
      </div>

      <Modal open={!!btRef} onClose={() => setBtRef(null)} title="Bank Transfer Details">
        {btRef && (
          <div className="space-y-4 text-sm">
            <p className="text-muted">Transfer <span className="font-semibold text-foreground">Rs. {unpaidTotal.toLocaleString()}</span> to the school bank account below. Use the reference code so the admin can identify your payment.</p>
            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted uppercase tracking-wide">Reference Code</span>
                <button onClick={() => copyText(btRef)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent-soft"><Copy className="h-3 w-3" /> Copy</button>
              </div>
              <p className="font-mono text-lg font-bold tracking-widest">{btRef}</p>
              <p className="text-xs text-muted">Include this code in the bank transfer remarks/reference field.</p>
            </div>
            {schoolPay?.bank_account && (
              <div className="rounded-xl border border-border p-3 space-y-1">
                <p className="text-xs font-semibold text-[#2563eb]">{schoolPay.bank_name || "School Bank"}</p>
                <p className="font-mono text-sm">{schoolPay.bank_account}</p>
                {schoolPay.bank_title && <p className="text-xs text-muted">{schoolPay.bank_title}</p>}
              </div>
            )}
            <p className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800">After transferring, your fee will show as <strong>Processing</strong>. The school admin will verify and mark it as Paid within 1-2 business days.</p>
            <button onClick={() => setBtRef(null)} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent-soft">Done — I will transfer now</button>
          </div>
        )}
      </Modal>

      <Modal open={gatewayOpen} onClose={() => !paying && setGatewayOpen(false)} title="Choose payment method">
        <p className="mb-3 text-sm text-muted">Pay Rs. {unpaidTotal.toLocaleString()} securely via:</p>
        <div className="grid grid-cols-2 gap-3">
          {gateways.jazzcash && (
            <button
              onClick={() => payWith("jazzcash")}
              disabled={paying}
              className="sk-card flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#b91d2e]/10 text-lg font-bold text-[#b91d2e]">JC</span>
              JazzCash
            </button>
          )}
          {gateways.easypaisa && (
            <button
              onClick={() => payWith("easypaisa")}
              disabled={paying}
              className="sk-card flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm font-medium hover:border-accent disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1aa84a]/10 text-lg font-bold text-[#1aa84a]">EP</span>
              EasyPaisa
            </button>
          )}
          {!anyGateway && <p className="col-span-2 text-sm text-muted">No online gateway is configured for the school yet.</p>}
        </div>
        {paying && <p className="mt-3 text-center text-sm text-muted">Redirecting to gateway…</p>}
      </Modal>
    </div>
  );
}

function hasPayAccounts(p: SchoolPay | null): boolean {
  return !!(p && (p.jazzcash_number || p.easypaisa_number || p.bank_account));
}

function PayAccount({
  tone, label, number, name, onCopy,
}: { tone: string; label: string; number: string; name: string | null; onCopy: (t: string) => void }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: tone }}>{label}</span>
        <button onClick={() => onCopy(number)} className="sk-press inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent-soft">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <p className="mt-1 font-mono text-sm">{number}</p>
      {name && <p className="text-xs text-muted">{name}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/* ----------------------------- Admin view ------------------------------ */
function AdminParentsView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<ParentRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [chatFor, setChatFor] = useState<ParentRow | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [p, s] = await Promise.all([
        supabase.from("parents").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setParents((p.data ?? []) as ParentRow[]);
      setStudents((s.data ?? []) as Student[]);
    } catch {
      show("Could not load parents", "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const nameOf = useMemo(() => {
    const m = new Map(students.map((s) => [s.id, s.name]));
    return (id: string | null) => (id ? m.get(id) ?? "—" : "—");
  }, [students]);

  async function remove(id: string) {
    if (!confirm("Delete this parent?")) return;
    try { await deleteRow("parents", id); setParents((c) => c.filter((p) => p.id !== id)); show("Parent deleted"); }
    catch { show("Delete failed", "error"); }
  }

  return (
    <div>
      <PageHeader
        title="Parent Portal"
        description="Manage parent profiles linked to students."
        actions={
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Parent
          </button>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard label="Parents" value={parents.length} />
        <StatCard label="Students" value={students.length} />
      </div>

      {loading ? <TableSkeleton cols={4} /> : parents.length === 0 ? (
        <EmptyState title="No parents" description="Add a parent and link them to a student." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Child</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Email</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{nameOf(p.student_id)}</td>
                  <td className="px-4 py-3">{p.phone || "—"}</td>
                  <td className="px-4 py-3">{p.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setChatFor(p)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-foreground" aria-label="Chat"><MessageSquare className="h-4 w-4" /></button>
                      <button onClick={() => remove(p.id)} className="rounded-md p-1.5 text-muted hover:bg-accent-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddParentModal open={open} onClose={() => setOpen(false)} students={students} onAdded={(p) => { setParents((c) => [p, ...c]); show("Parent added"); }} />
      {chatFor && <ChatModal parent={chatFor} childName={nameOf(chatFor.student_id)} onClose={() => setChatFor(null)} />}
    </div>
  );
}

function ChatModal({ parent, childName, onClose }: { parent: ParentRow; childName: string; onClose: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!schoolId) return;
    const supabase = sb();
    supabase.from("messages").select("*").eq("school_id", schoolId).eq("parent_id", parent.id).order("created_at")
      .then(({ data }) => setMessages((data ?? []) as MessageRow[]));
    const ch = supabase
      .channel(`admin-msg-${parent.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `parent_id=eq.${parent.id}` },
        (payload) => {
          const row = payload.new as MessageRow;
          setMessages((c) => (c.some((m) => m.id === row.id) ? c : [...c, row]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [schoolId, parent.id]);

  async function send() {
    if (!schoolId || !msg.trim()) return;
    try {
      const row = (await insertRow("messages", schoolId, { parent_id: parent.id, message: msg.trim(), sent_by: "teacher" })) as MessageRow;
      setMessages((c) => (c.some((m) => m.id === row.id) ? c : [...c, row]));
      setMsg("");
    } catch { show("Could not send", "error"); }
  }

  return (
    <Modal open onClose={onClose} title={`Chat · ${parent.name}${childName !== "—" ? ` (${childName})` : ""}`}>
      <div className="mb-2 max-h-72 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
        {messages.map((m) => (
          <div key={m.id} className={m.sent_by === "parent" ? "text-left" : "text-right"}>
            <span className={`inline-block rounded-2xl px-3 py-1.5 text-sm ${m.sent_by === "parent" ? "bg-background" : "bg-accent text-accent-fg"}`}>{m.message}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Reply to parent…" onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button onClick={send} className="rounded-lg bg-accent p-2 text-accent-fg hover:opacity-90" aria-label="Send"><Send className="h-4 w-4" /></button>
      </div>
    </Modal>
  );
}

function AddParentModal({
  open, onClose, students, onAdded,
}: { open: boolean; onClose: () => void; students: Student[]; onAdded: (p: ParentRow) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", student_id: "" });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.name.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("parents", schoolId, {
        name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null,
        student_id: form.student_id || null,
      })) as ParentRow;
      onAdded(row);
      setForm({ name: "", phone: "", email: "", student_id: "" });
      onClose();
    } catch { show("Could not add parent", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Parent">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Parent name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <Field label="Child (student)">
          <select value={form.student_id} onChange={(e) => set("student_id", e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent">
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </select>
        </Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Parent"}</button>
      </form>
    </Modal>
  );
}
