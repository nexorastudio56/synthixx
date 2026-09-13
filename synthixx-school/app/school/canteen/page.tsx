"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Wallet, ShoppingCart, AlertTriangle } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { useSchool } from "@/components/school/school-provider";
import { sb } from "@/lib/school/client";
import { insertRow, updateRow } from "@/lib/school/queries";
import type { CanteenItem, CanteenBalance, Student } from "@/lib/school/types";
import {
  PageHeader, StatCard, TableSkeleton, EmptyState, Modal, Field, Input, Select, Pill, useToast,
} from "@/components/school/ui";

interface Txn { id: string; student_id: string | null; item_id: string | null; amount: number; type: string; created_at: string }
const LOW = 50;

export default function CanteenPage() {
  return (
    <ModuleGuard module="canteen">
      <CanteenView />
    </ModuleGuard>
  );
}

function CanteenView() {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CanteenItem[]>([]);
  const [balances, setBalances] = useState<CanteenBalance[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [itemOpen, setItemOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const supabase = sb();
      const [it, bal, tx, s] = await Promise.all([
        supabase.from("canteen_items").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
        supabase.from("canteen_balance").select("*").eq("school_id", schoolId),
        supabase.from("canteen_transactions").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(500),
        supabase.from("students").select("*").eq("school_id", schoolId),
      ]);
      setItems((it.data ?? []) as CanteenItem[]);
      setBalances((bal.data ?? []) as CanteenBalance[]);
      setTxns((tx.data ?? []) as Txn[]);
      setStudents((s.data ?? []) as Student[]);
    } catch { show("Could not load canteen", "error"); }
    finally { setLoading(false); }
  }, [schoolId, show]);

  useEffect(() => { load(); }, [load]);

  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const itemName = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const low = balances.filter((b) => Number(b.balance) < LOW);

  const topItems = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns.filter((t) => t.type === "debit" && t.item_id)) m.set(t.item_id!, (m.get(t.item_id!) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [txns]);

  const totalSpend = txns.filter((t) => t.type === "debit").reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Canteen"
        description="Menu, prepaid wallets and spending."
        actions={
          <div className="flex gap-2">
            <button onClick={() => setBuyOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"><ShoppingCart className="h-4 w-4" /> Purchase</button>
            <button onClick={() => setTopupOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent-soft"><Wallet className="h-4 w-4" /> Add Balance</button>
            <button onClick={() => setItemOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"><Plus className="h-4 w-4" /> Add Item</button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Menu items" value={items.length} />
        <StatCard label="Wallets" value={balances.length} />
        <StatCard label="Total spend" value={`Rs. ${totalSpend.toLocaleString()}`} />
        <StatCard label="Low balance" value={low.length} icon={low.length ? <AlertTriangle className="h-4 w-4 text-danger" /> : undefined} />
      </div>

      {loading ? <TableSkeleton cols={3} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Menu</h3>
            {items.length === 0 ? <EmptyState title="No items" /> : (
              <ul className="space-y-1.5 text-sm">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center justify-between">
                    <span>{i.name} {!i.available && <Pill tone="gray">unavailable</Pill>}</span>
                    <span className="font-medium">Rs. {Number(i.price).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
            <h4 className="mb-2 mt-5 text-sm font-semibold">Top selling</h4>
            {topItems.length === 0 ? <p className="text-sm text-muted">No sales yet.</p> : (
              <ul className="space-y-1 text-sm">
                {topItems.map(([id, n]) => (
                  <li key={id} className="flex justify-between"><span>{itemName.get(id) ?? "—"}</span><span className="text-muted">{n} sold</span></li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-semibold">Wallets</h3>
            {balances.length === 0 ? <EmptyState title="No wallets" description="Add balance to a student." /> : (
              <ul className="space-y-1.5 text-sm">
                {balances.map((b) => (
                  <li key={b.id} className="flex items-center justify-between">
                    <span>{studentName.get(b.student_id ?? "") ?? "—"}</span>
                    <Pill tone={Number(b.balance) < LOW ? "red" : "green"}>Rs. {Number(b.balance).toLocaleString()}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <AddItemModal open={itemOpen} onClose={() => setItemOpen(false)} onAdded={(i) => { setItems((c) => [i, ...c]); show("Item added"); }} />
      <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} students={students} balances={balances} onDone={load} />
      <BuyModal open={buyOpen} onClose={() => setBuyOpen(false)} students={students} items={items} balances={balances} onDone={load} />
    </div>
  );
}

function AddItemModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (i: CanteenItem) => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [form, setForm] = useState({ name: "", price: "", category: "" });
  const [busy, setBusy] = useState(false);
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !form.name.trim()) return;
    setBusy(true);
    try {
      const row = (await insertRow("canteen_items", schoolId, { name: form.name.trim(), price: Number(form.price) || 0, category: form.category.trim() || null, available: true })) as CanteenItem;
      onAdded(row);
      setForm({ name: "", price: "", category: "" });
      onClose();
    } catch { show("Could not add item", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Menu Item">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Item name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (Rs.)"><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Category"><Input value={form.category} onChange={(e) => set("category", e.target.value)} /></Field>
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Item"}</button>
      </form>
    </Modal>
  );
}

function TopupModal({
  open, onClose, students, balances, onDone,
}: { open: boolean; onClose: () => void; students: Student[]; balances: CanteenBalance[]; onDone: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !studentId || !amount) return;
    setBusy(true);
    try {
      const amt = Number(amount) || 0;
      const existing = balances.find((b) => b.student_id === studentId);
      if (existing) {
        await updateRow("canteen_balance", existing.id, { balance: Number(existing.balance) + amt, last_updated: new Date().toISOString() });
      } else {
        await insertRow("canteen_balance", schoolId, { student_id: studentId, balance: amt, last_updated: new Date().toISOString() });
      }
      await insertRow("canteen_transactions", schoolId, { student_id: studentId, amount: amt, type: "credit" });
      show("Balance added");
      setStudentId(""); setAmount("");
      onClose();
      onDone();
    } catch { show("Could not add balance", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Balance">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Amount (Rs.)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Add Balance"}</button>
      </form>
    </Modal>
  );
}

function BuyModal({
  open, onClose, students, items, balances, onDone,
}: { open: boolean; onClose: () => void; students: Student[]; items: CanteenItem[]; balances: CanteenBalance[]; onDone: () => void }) {
  const { schoolId } = useSchool();
  const { show } = useToast();
  const [studentId, setStudentId] = useState("");
  const [itemId, setItemId] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId || !studentId || !itemId) return;
    const item = items.find((i) => i.id === itemId);
    const bal = balances.find((b) => b.student_id === studentId);
    if (!item) return;
    if (!bal || Number(bal.balance) < Number(item.price)) { show("Insufficient balance", "error"); return; }
    setBusy(true);
    try {
      await updateRow("canteen_balance", bal.id, { balance: Number(bal.balance) - Number(item.price), last_updated: new Date().toISOString() });
      await insertRow("canteen_transactions", schoolId, { student_id: studentId, item_id: itemId, amount: Number(item.price), type: "debit" });
      show("Purchase recorded");
      setStudentId(""); setItemId("");
      onClose();
      onDone();
    } catch { show("Could not record purchase", "error"); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Purchase">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Student">
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Select student</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
          </Select>
        </Field>
        <Field label="Item">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
            <option value="">Select item</option>
            {items.filter((i) => i.available).map((i) => <option key={i.id} value={i.id}>{i.name} — Rs. {Number(i.price)}</option>)}
          </Select>
        </Field>
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50">{busy ? "Saving…" : "Record Purchase"}</button>
      </form>
    </Modal>
  );
}
