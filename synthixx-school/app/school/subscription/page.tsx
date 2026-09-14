"use client";

import { useState } from "react";
import { Check, Zap, Building2, GraduationCap } from "lucide-react";
import { ModuleGuard } from "@/components/school/guard";
import { PageHeader, useToast } from "@/components/school/ui";

export default function SubscriptionPage() {
  return (
    <ModuleGuard module="subscription">
      <SubscriptionView />
    </ModuleGuard>
  );
}

const PLANS = [
  {
    id: "test",
    name: "Test Plan",
    price: 100,
    period: "/ one-time",
    icon: <Zap className="h-6 w-6" />,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-300 dark:border-orange-700",
    description: "Test payment flow only. Remove after testing.",
    features: [
      "Rs. 100 test transaction",
      "Verifies CashMaal works",
      "Remove after testing",
    ],
    popular: false,
    testOnly: true,
  },
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    period: "/ month",
    icon: <GraduationCap className="h-6 w-6" />,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    description: "Perfect for small schools up to 200 students.",
    features: [
      "Up to 200 students",
      "Fee management",
      "Attendance tracking",
      "Parent portal",
      "Basic reports",
      "Email support",
    ],
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: 12000,
    period: "/ month",
    icon: <Zap className="h-6 w-6" />,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-400 dark:border-purple-600",
    description: "For growing schools that need more power.",
    features: [
      "Up to 1,000 students",
      "Everything in Starter",
      "AI analytics & insights",
      "JazzCash / EasyPaisa payments",
      "HR & Payroll",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 25000,
    period: "/ month",
    icon: <Building2 className="h-6 w-6" />,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    description: "Full-scale solution for large institutions & universities.",
    features: [
      "Unlimited students",
      "Everything in Growth",
      "University modules",
      "Custom domain",
      "API access",
      "Dedicated support",
    ],
    popular: false,
  },
];

function SubscriptionView() {
  const { show } = useToast();
  const [paying, setPaying] = useState<string | null>(null);

  async function subscribe(planId: string, amount: number, planName: string) {
    setPaying(planId);
    try {
      const res = await fetch("/api/school/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount, planName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not initiate payment");

      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      if (data.action && data.fields) {
        const form = document.createElement("form");
        form.method = data.method || "POST";
        form.action = data.action as string;
        Object.entries(data.fields as Record<string, string>).forEach(([k, v]) => {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = k; input.value = v;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }
      throw new Error("Payment gateway did not respond correctly");
    } catch (e) {
      show(e instanceof Error ? e.message : "Payment failed", "error");
      setPaying(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Subscription & Plans"
        description="Manage your Synthixx Campus subscription. Payments are processed via CashMaal."
      />

      {/* Payment return status */}
      {(() => {
        if (typeof window === "undefined") return null;
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        if (status === "success") return (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Payment received! Subscription is being activated.</p>
            <p className="mt-1 opacity-80">Ref: {params.get("ref") ?? "—"} — refresh in a few seconds.</p>
          </div>
        );
        if (status === "cancelled") return (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Payment cancelled. No charge was made.</p>
          </div>
        );
        return null;
      })()}

      <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="font-medium">Current Plan: <span className="text-accent">Free Trial</span></p>
        <p className="mt-1 text-muted">Upgrade to unlock all features for your institution.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border-2 p-6 ${plan.border} ${plan.popular ? "shadow-lg" : "border-border"}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-0.5 text-xs font-semibold text-white">
                Most Popular
              </span>
            )}
            {"testOnly" in plan && plan.testOnly && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-semibold text-white">
                Test Only
              </span>
            )}

            <div className={`mb-4 inline-flex rounded-xl p-2.5 ${plan.bg}`}>
              <span className={plan.color}>{plan.icon}</span>
            </div>

            <h3 className="text-lg font-bold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted">{plan.description}</p>

            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold">Rs. {plan.price.toLocaleString()}</span>
              <span className="text-sm text-muted">{plan.period}</span>
            </div>

            <ul className="mt-5 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => subscribe(plan.id, plan.price, plan.name)}
              disabled={!!paying}
              className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                plan.popular
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "border border-border bg-background hover:bg-accent-soft"
              }`}
            >
              {paying === plan.id
                ? "Redirecting to CashMaal…"
                : ("testOnly" in plan && plan.testOnly)
                  ? `Test Payment — Rs. ${plan.price}`
                  : `Subscribe — Rs. ${plan.price.toLocaleString()}/mo`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        <p>All payments are processed securely via <strong>CashMaal</strong> — supporting JazzCash, EasyPaisa, NayaPay & Cards.</p>
        <p className="mt-1">Need a custom plan? Contact <a href="mailto:support@synthixx.com" className="text-accent underline">support@synthixx.com</a></p>
      </div>
    </div>
  );
}
