"use client";

import { useState } from "react";
import {
  Check, Zap, Building2, GraduationCap,
  ArrowLeft, Copy, CheckCircle2, Clock, ChevronRight,
} from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { PageHeader, useToast } from "@/components/school/ui";
import { PAYMENT_ACCOUNTS, type PaymentMethodKey } from "@/lib/school/payment-accounts";

export default function SubscriptionPage() {
  return (
    <ModuleGuard module="subscription">
      <SubscriptionView />
    </ModuleGuard>
  );
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    icon: GraduationCap,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Perfect for small schools up to 200 students.",
    features: ["Up to 200 students","Fee management","Attendance tracking","Parent portal","Basic reports","Email support"],
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 12000,
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-400",
    description: "For growing schools that need more power.",
    features: ["Up to 1,000 students","Everything in Starter","AI analytics & insights","HR & Payroll","Priority support","All payment methods"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 25000,
    icon: Building2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: "Full-scale solution for large institutions.",
    features: ["Unlimited students","Everything in Growth","University modules","Custom domain","API access","Dedicated support"],
    popular: false,
  },
];

type Plan = typeof PLANS[number];
type Step = "plans" | "checkout" | "success";

const METHOD_ICONS: Record<PaymentMethodKey, string> = {
  jazzcash:  "🟡",
  easypaisa: "🟢",
  nayapay:   "🔵",
  bank:      "🏦",
};

function SubscriptionView() {
  const { show } = useToast();
  const [step, setStep]             = useState<Step>("plans");
  const [plan, setPlan]             = useState<Plan | null>(null);
  const [method, setMethod]         = useState<PaymentMethodKey>("jazzcash");
  const [txnId, setTxnId]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ref, setRef]               = useState("");
  const [copied, setCopied]         = useState<string | null>(null);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function submit() {
    if (!plan) return;
    if (!txnId.trim()) { show("Transaction ID darj karein", "error"); return; }
    setSubmitting(true);
    try {
      const res  = await fetch("/api/school/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, planName: plan.name, paymentMethod: method, transactionId: txnId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submit failed");
      setRef(data.ref ?? "");
      setStep("success");
    } catch (e) {
      show(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const acc = PAYMENT_ACCOUNTS[method];

  /* ── Success ─────────────────────────────────────────────── */
  if (step === "success") return (
    <div>
      <PageHeader title="Subscription & Plans" description="Manage your Synthixx Campus subscription." />
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-emerald-800">Payment Submit Ho Gaya!</h2>
          <p className="mt-2 text-sm text-emerald-700">
            Aapka payment 12 ghanty mein verify ho jaye ga aur subscription activate ho jaye gi.
          </p>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-left text-sm">
            <p className="text-muted">Reference Number</p>
            <p className="mt-0.5 font-mono font-semibold text-foreground">{ref}</p>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Agar 12 ghantay baad bhi activate na ho to support@synthixx.com pe yeh reference number bhejein.</span>
          </div>
          <button
            onClick={() => { setStep("plans"); setTxnId(""); setPlan(null); }}
            className="mt-6 text-sm text-muted underline underline-offset-2 hover:text-foreground"
          >
            Plans page pe wapas jaein
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Checkout ────────────────────────────────────────────── */
  if (step === "checkout" && plan) return (
    <div>
      <PageHeader title="Subscription & Plans" description="Manage your Synthixx Campus subscription." />
      <div className="mx-auto max-w-xl">
        <button
          onClick={() => setStep("plans")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Plans pe wapas jaein
        </button>

        {/* Plan summary */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
          <div>
            <p className="text-xs text-muted">Selected Plan</p>
            <p className="font-bold text-foreground">{plan.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Monthly</p>
            <p className="font-bold text-foreground">Rs. {plan.price.toLocaleString()}</p>
          </div>
        </div>

        {/* Method selector */}
        <div className="mb-1 text-sm font-semibold text-foreground">Payment Method chunein</div>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(PAYMENT_ACCOUNTS) as PaymentMethodKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-sm font-medium transition ${
                method === key
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-surface text-foreground hover:border-muted"
              }`}
            >
              <span className="text-xl">{METHOD_ICONS[key]}</span>
              <span className="text-xs">{PAYMENT_ACCOUNTS[key].label}</span>
            </button>
          ))}
        </div>

        {/* Account details card */}
        <div className="mb-6 rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-accent-soft px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {METHOD_ICONS[method]} {acc.label} Account Details
            </p>
          </div>
          <div className="divide-y divide-border">
            {/* Account title */}
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-muted">Account Name</p>
                <p className="font-medium text-foreground">{acc.title}</p>
              </div>
            </div>

            {/* Number / ID */}
            {"number" in acc && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">
                    {method === "bank" ? "Account Number" : "Mobile Number"}
                  </p>
                  <p className="font-mono font-semibold text-foreground">{acc.number}</p>
                </div>
                <button
                  onClick={() => copyText(acc.number as string, "number")}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {copied === "number" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  Copy
                </button>
              </div>
            )}

            {/* NayaPay ID */}
            {"id" in acc && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">NayaPay ID</p>
                  <p className="font-mono font-semibold text-foreground">{(acc as typeof PAYMENT_ACCOUNTS.nayapay).id}</p>
                </div>
                <button
                  onClick={() => copyText((acc as typeof PAYMENT_ACCOUNTS.nayapay).id, "id")}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {copied === "id" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  Copy
                </button>
              </div>
            )}

            {/* IBAN */}
            {"iban" in acc && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">IBAN</p>
                  <p className="font-mono text-sm font-semibold text-foreground">{(acc as { iban: string }).iban}</p>
                </div>
                <button
                  onClick={() => copyText((acc as { iban: string }).iban, "iban")}
                  className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                >
                  {copied === "iban" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  Copy
                </button>
              </div>
            )}

            {/* Amount to send */}
            <div className="flex items-center justify-between bg-amber-50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-amber-700">Exact Amount Bhejein</p>
                <p className="font-mono text-lg font-bold text-amber-800">Rs. {plan.price.toLocaleString()}</p>
              </div>
              <button
                onClick={() => copyText(String(plan.price), "amount")}
                className="flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50"
              >
                {copied === "amount" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <p className="font-semibold text-foreground">Instructions:</p>
          <p className="mt-1 leading-relaxed">{acc.instructions}</p>
        </div>

        {/* T-ID input */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Transaction ID / Reference Number *
          </label>
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder="e.g. AB123456789 ya TRX-XXXXXX"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-muted">
            Payment karne ke baad jo Transaction ID / Reference Number aata hai woh yahan darj karein.
          </p>
        </div>

        {/* Notice */}
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-sm text-blue-800">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <span>
            Payment submit karne ke baad <strong>12 ghante</strong> mein verify ho jaye gi aur subscription automatic activate ho jaye gi.
          </span>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={submitting || !txnId.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
        >
          {submitting ? "Submit ho raha hai..." : (
            <>Payment Confirm Karein <ChevronRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );

  /* ── Plan selection ──────────────────────────────────────── */
  return (
    <div>
      <PageHeader
        title="Subscription & Plans"
        description="Apna plan chunein. Payment 12 ghante mein verify ho jaye gi."
      />

      <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="font-medium">Current Plan: <span className="text-accent">Free Trial</span></p>
        <p className="mt-1 text-muted">Upgrade karein — JazzCash, EasyPaisa, NayaPay, ya Bank Transfer se asan payment.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative rounded-2xl border-2 p-6 ${p.popular ? p.border + " shadow-lg" : "border-border"}`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-0.5 text-xs font-semibold text-white">
                Most Popular
              </span>
            )}

            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${p.bg}`}>
              <p.icon className={`h-6 w-6 ${p.color}`} />
            </div>

            <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">Rs. {p.price.toLocaleString()}</span>
              <span className="text-sm text-muted">/ month</span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => { setPlan(p); setStep("checkout"); setTxnId(""); }}
              className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                p.popular
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "border border-border bg-background hover:bg-accent-soft"
              }`}
            >
              Subscribe — Rs. {p.price.toLocaleString()}/mo
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        <p>Payment methods: 🟡 JazzCash &nbsp;·&nbsp; 🟢 EasyPaisa &nbsp;·&nbsp; 🔵 NayaPay &nbsp;·&nbsp; 🏦 Allied Bank</p>
        <p className="mt-1">Har payment <strong>12 ghante</strong> mein manually verify hoti hai. Questions? <a href="mailto:support@synthixx.com" className="text-accent underline">support@synthixx.com</a></p>
      </div>
    </div>
  );
}
