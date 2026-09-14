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

/* ── Brand SVG Logos ─────────────────────────────────────────────────── */

function JazzCashLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Yellow left wing */}
      <path d="M40 18 C32 12, 14 16, 12 32 C10 46, 22 56, 34 52 C28 44, 30 34, 38 30 C36 26, 38 20, 40 18Z" fill="#FFB800"/>
      {/* Red right wing */}
      <path d="M40 18 C48 12, 66 16, 68 32 C70 46, 58 56, 46 52 C52 44, 50 34, 42 30 C44 26, 42 20, 40 18Z" fill="#E31E24"/>
      {/* Center overlap */}
      <ellipse cx="40" cy="36" rx="4" ry="7" fill="#C8960C" opacity="0.6"/>
      <text x="40" y="70" textAnchor="middle" fill="#1a1a1a" fontSize="11" fontWeight="800" fontFamily="Arial,sans-serif">JazzCash</text>
    </svg>
  );
}

function EasyPaisaLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer black circle */}
      <circle cx="40" cy="32" r="22" fill="#1a1a1a"/>
      {/* White inner cutout – e shape */}
      <circle cx="40" cy="32" r="15" fill="white"/>
      {/* Green smile arc */}
      <path d="M26 38 Q40 52 54 38" stroke="#00A651" strokeWidth="5" fill="none" strokeLinecap="round"/>
      {/* Black dot in e */}
      <circle cx="40" cy="28" r="6" fill="#1a1a1a"/>
      {/* Horizontal bar of e */}
      <rect x="26" y="30" width="20" height="4" rx="2" fill="#1a1a1a"/>
      <text x="40" y="70" textAnchor="middle" fill="#1a1a1a" fontSize="10" fontWeight="700" fontFamily="Arial,sans-serif">easypaisa</text>
    </svg>
  );
}

function NayaPayLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Orange background square */}
      <rect x="4" y="4" width="56" height="56" rx="10" fill="#F05A22"/>
      {/* Left lightning bolt */}
      <path d="M18 14 L26 34 L20 34 L28 54 L22 54 L10 28 L17 28 Z" fill="white"/>
      {/* Right lightning bolt */}
      <path d="M32 14 L40 34 L34 34 L42 54 L36 54 L24 28 L31 28 Z" fill="white" opacity="0.85"/>
      <text x="32" y="74" textAnchor="middle" fill="#F05A22" fontSize="11" fontWeight="800" fontFamily="Arial,sans-serif">NayaPay</text>
    </svg>
  );
}

function AlliedBankLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Blue diamond A */}
      <polygon points="40,8 62,36 40,44 18,36" fill="#1B3F7B"/>
      {/* Orange accent top */}
      <polygon points="40,8 52,28 40,32 28,28" fill="#F7941D"/>
      {/* White A crossbar */}
      <rect x="28" y="33" width="24" height="4" rx="2" fill="white"/>
      <text x="40" y="58" textAnchor="middle" fill="#1B3F7B" fontSize="9" fontWeight="800" fontFamily="Arial,sans-serif">ALLIED</text>
      <text x="40" y="70" textAnchor="middle" fill="#1B3F7B" fontSize="9" fontWeight="700" fontFamily="Arial,sans-serif">BANK</text>
    </svg>
  );
}

const METHOD_LOGO: Record<PaymentMethodKey, React.ReactNode> = {
  jazzcash:  <JazzCashLogo size={44} />,
  easypaisa: <EasyPaisaLogo size={44} />,
  nayapay:   <NayaPayLogo size={44} />,
  bank:      <AlliedBankLogo size={44} />,
};

const METHOD_LOGO_SM: Record<PaymentMethodKey, React.ReactNode> = {
  jazzcash:  <JazzCashLogo size={28} />,
  easypaisa: <EasyPaisaLogo size={28} />,
  nayapay:   <NayaPayLogo size={28} />,
  bank:      <AlliedBankLogo size={28} />,
};

/* ── Plans data ─────────────────────────────────────────────────────── */

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    icon: GraduationCap,
    accent: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Ideal for small schools up to 200 students.",
    features: ["Up to 200 students","Fee management","Attendance tracking","Parent portal","Basic reports","Email support"],
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 12000,
    icon: Zap,
    accent: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-400",
    description: "Built for growing institutions that need more.",
    features: ["Up to 1,000 students","Everything in Starter","AI analytics & insights","HR & Payroll","Priority support","All payment methods"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 25000,
    icon: Building2,
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: "Full-scale solution for universities & large schools.",
    features: ["Unlimited students","Everything in Growth","University modules","Custom domain","API access","Dedicated account manager"],
    popular: false,
  },
];

type Plan = typeof PLANS[number];
type Step = "plans" | "checkout" | "success";

/* ── Main view ──────────────────────────────────────────────────────── */

function SubscriptionView() {
  const { show } = useToast();
  const [step, setStep]             = useState<Step>("plans");
  const [plan, setPlan]             = useState<Plan | null>(null);
  const [method, setMethod]         = useState<PaymentMethodKey>("jazzcash");
  const [txnId, setTxnId]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ref, setRef]               = useState("");
  const [copied, setCopied]         = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function submit() {
    if (!plan) return;
    if (!txnId.trim()) { show("Please enter your Transaction ID", "error"); return; }
    setSubmitting(true);
    try {
      const res  = await fetch("/api/school/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, planName: plan.name, paymentMethod: method, transactionId: txnId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submission failed");
      setRef(data.ref ?? "");
      setStep("success");
    } catch (e) {
      show(e instanceof Error ? e.message : "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const acc = PAYMENT_ACCOUNTS[method];

  /* ── Success screen ──────────────────────────────────────── */
  if (step === "success") return (
    <div>
      <PageHeader title="Subscription & Plans" description="Manage your Synthixx Campus subscription." />
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-emerald-800">Payment Submitted Successfully</h2>
          <p className="mt-2 text-sm text-emerald-700">
            Your payment will be verified within 12 hours and your subscription will be activated automatically.
          </p>
          <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4 text-left">
            <p className="text-xs text-muted">Reference Number</p>
            <p className="mt-0.5 font-mono text-base font-bold text-foreground">{ref}</p>
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-left text-xs text-amber-800">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>If your subscription is not activated within 12 hours, please contact <strong>support@synthixx.com</strong> with your reference number.</span>
          </div>
          <button
            onClick={() => { setStep("plans"); setTxnId(""); setPlan(null); }}
            className="mt-6 text-sm text-muted underline underline-offset-2 hover:text-foreground"
          >
            Back to Plans
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Checkout screen ─────────────────────────────────────── */
  if (step === "checkout" && plan) return (
    <div>
      <PageHeader title="Subscription & Plans" description="Manage your Synthixx Campus subscription." />
      <div className="mx-auto max-w-xl">
        <button
          onClick={() => setStep("plans")}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Plans
        </button>

        {/* Plan summary */}
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div>
            <p className="text-xs text-muted uppercase tracking-wide">Selected Plan</p>
            <p className="mt-0.5 text-base font-bold text-foreground">{plan.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted uppercase tracking-wide">Monthly</p>
            <p className="mt-0.5 text-base font-bold text-foreground">Rs. {plan.price.toLocaleString()}</p>
          </div>
        </div>

        {/* Method selector */}
        <p className="mb-3 text-sm font-semibold text-foreground">Select Payment Method</p>
        <div className="mb-6 grid grid-cols-4 gap-3">
          {(Object.keys(PAYMENT_ACCOUNTS) as PaymentMethodKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3.5 transition ${
                method === key
                  ? "border-accent bg-white shadow-md scale-[1.04]"
                  : "border-border bg-surface hover:border-muted hover:shadow-sm"
              }`}
            >
              {METHOD_LOGO[key]}
            </button>
          ))}
        </div>

        {/* Account details card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-accent-soft px-4 py-3">
            {METHOD_LOGO_SM[method]}
            <p className="font-semibold text-foreground">{acc.label} — Account Details</p>
          </div>

          <div className="divide-y divide-border">
            {/* Account holder */}
            <div className="px-4 py-3">
              <p className="text-xs text-muted">Account Holder</p>
              <p className="mt-0.5 font-medium text-foreground">{acc.title}</p>
            </div>

            {/* Mobile number */}
            {"number" in acc && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">{method === "bank" ? "Account Number" : "Mobile Number"}</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-foreground">{acc.number}</p>
                </div>
                <button onClick={() => copy(acc.number as string, "number")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                  {copied === "number" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} Copy
                </button>
              </div>
            )}

            {/* NayaPay ID */}
            {"id" in acc && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">NayaPay ID</p>
                  <p className="mt-0.5 font-mono font-semibold text-foreground">{(acc as typeof PAYMENT_ACCOUNTS.nayapay).id}</p>
                </div>
                <button onClick={() => copy((acc as typeof PAYMENT_ACCOUNTS.nayapay).id, "id")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                  {copied === "id" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} Copy
                </button>
              </div>
            )}

            {/* IBAN */}
            {"iban" in acc && (
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted">IBAN</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{(acc as { iban: string }).iban}</p>
                </div>
                <button onClick={() => copy((acc as { iban: string }).iban, "iban")}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground">
                  {copied === "iban" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} Copy
                </button>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center justify-between bg-amber-50 px-4 py-3.5">
              <div>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Exact Amount to Send</p>
                <p className="mt-0.5 font-mono text-2xl font-bold text-amber-800">Rs. {plan.price.toLocaleString()}</p>
              </div>
              <button onClick={() => copy(String(plan.price), "amount")}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-50">
                {copied === "amount" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />} Copy
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm">
          <p className="font-semibold text-foreground">How to pay:</p>
          <p className="mt-1.5 leading-relaxed text-muted">{acc.instructions}</p>
        </div>

        {/* Transaction ID input */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            Transaction ID / Reference Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder="e.g. TXN123456789"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <p className="mt-1.5 text-xs text-muted">
            Enter the Transaction ID or Reference Number you received after completing your transfer.
          </p>
        </div>

        {/* 12-hour notice */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
          <span>Your payment will be <strong>manually verified within 12 hours</strong>. Subscription activates automatically upon verification.</span>
        </div>

        {/* Submit button */}
        <button
          onClick={submit}
          disabled={submitting || !txnId.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent/90 active:scale-[0.99] disabled:opacity-50"
        >
          {submitting
            ? "Submitting..."
            : <><span>Confirm Payment</span><ChevronRight className="h-4 w-4" /></>
          }
        </button>
      </div>
    </div>
  );

  /* ── Plans screen ────────────────────────────────────────── */
  return (
    <div>
      <PageHeader
        title="Subscription & Plans"
        description="Choose a plan that fits your institution. Payments verified within 12 hours."
      />

      <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="font-medium text-foreground">Current Plan: <span className="text-accent">Free Trial</span></p>
        <p className="mt-1 text-muted">Upgrade to unlock all features. Pay via JazzCash, EasyPaisa, NayaPay, or Allied Bank.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative rounded-2xl border-2 p-6 transition ${p.popular ? p.border + " shadow-lg" : "border-border hover:shadow-md"}`}
          >
            {p.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-4 py-0.5 text-xs font-semibold text-white shadow">
                Most Popular
              </span>
            )}

            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${p.bg}`}>
              <p.icon className={`h-6 w-6 ${p.accent}`} />
            </div>

            <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">Rs. {p.price.toLocaleString()}</span>
              <span className="text-sm text-muted">/ month</span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => { setPlan(p); setStep("checkout"); setTxnId(""); }}
              className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                p.popular
                  ? "bg-purple-600 text-white shadow hover:bg-purple-700"
                  : "border border-border text-foreground hover:bg-accent-soft"
              }`}
            >
              Get Started — Rs. {p.price.toLocaleString()}/mo
            </button>
          </div>
        ))}
      </div>

      {/* Payment methods footer */}
      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <p className="mb-4 text-center text-sm font-semibold text-foreground">Accepted Payment Methods</p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {(Object.keys(PAYMENT_ACCOUNTS) as PaymentMethodKey[]).map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              {METHOD_LOGO[key]}
              <span className="text-xs text-muted">{PAYMENT_ACCOUNTS[key].label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          All payments are manually verified within 12 hours. Questions?{" "}
          <a href="mailto:support@synthixx.com" className="text-accent underline underline-offset-2">support@synthixx.com</a>
        </p>
      </div>
    </div>
  );
}
