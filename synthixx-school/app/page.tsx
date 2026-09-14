import Link from "next/link";
import {
  GraduationCap,
  Users,
  Wallet,
  CalendarCheck,
  Bot,
  FileBarChart,
  Bell,
  Bus,
  Shield,
  Zap,
  Building2,
  Check,
  ArrowRight,
  Phone,
  Mail,
} from "lucide-react";

export const metadata = {
  title: "Synthixx Campus — Smart School Management System",
  description:
    "Pakistan's AI-powered school & university management platform. Fee collection, attendance, exams, parent portal, payroll and more — all in one place.",
};

const FEATURES = [
  { icon: Users, title: "Student Management", desc: "Admissions, profiles, class allocation & performance tracking." },
  { icon: Wallet, title: "Fee Management", desc: "Online payments via JazzCash, EasyPaisa & bank transfer. Auto-receipts." },
  { icon: CalendarCheck, title: "Attendance", desc: "Daily attendance with QR scan support. Instant parent alerts." },
  { icon: FileBarChart, title: "Exams & Results", desc: "Exam schedules, grading, report cards & result publishing." },
  { icon: Bot, title: "AI Assistant", desc: "Gemini-powered insights for principals, teachers and admin." },
  { icon: Bell, title: "Parent Portal", desc: "Parents track fees, attendance and results from any device." },
  { icon: Bus, title: "Transport & Hostel", desc: "Route tracking, hostel management and canteen records." },
  { icon: Shield, title: "Role-based Access", desc: "Admin, Teacher, Accountant, Parent — each sees only what they need." },
];

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "5,000",
    period: "/month",
    color: "from-blue-600 to-blue-500",
    border: "border-blue-100",
    features: ["Up to 200 students", "Fee management", "Attendance tracking", "Parent portal", "Basic reports", "Email support"],
    popular: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "12,000",
    period: "/month",
    color: "from-purple-600 to-violet-500",
    border: "border-purple-300",
    features: ["Up to 1,000 students", "Everything in Starter", "AI analytics & insights", "JazzCash / EasyPaisa", "HR & Payroll", "Priority support"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "25,000",
    period: "/month",
    color: "from-emerald-600 to-teal-500",
    border: "border-emerald-100",
    features: ["Unlimited students", "Everything in Growth", "University modules", "Custom domain", "API access", "Dedicated support"],
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-violet-500 text-white">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Synthixx Campus</p>
              <p className="text-[10px] text-gray-500">by Synthixx</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 sm:flex">
            <a href="#features" className="hover:text-purple-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-purple-600 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-purple-600 transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              Login
            </Link>
            <Link href="/signup" className="rounded-lg bg-gradient-to-r from-purple-600 to-violet-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-100/60 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            <Zap className="h-3 w-3" /> AI-Powered School Management
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Run your school<br />
            <span className="bg-gradient-to-r from-purple-600 to-violet-500 bg-clip-text text-transparent">
              smarter, not harder.
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-500 sm:text-xl">
            Pakistan&apos;s most complete school & university management platform — students, fees, attendance, exams, payroll and AI insights, all in one place.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-500 px-6 py-3 text-base font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              Login to Dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required &nbsp;·&nbsp; Setup in minutes</p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-purple-600 to-violet-500 py-10">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 text-center text-white sm:grid-cols-4">
          {[
            { value: "500+", label: "Schools Registered" },
            { value: "1L+", label: "Students Managed" },
            { value: "99.9%", label: "Uptime" },
            { value: "24/7", label: "Support" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-purple-100">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Everything your institution needs</h2>
            <p className="mt-3 text-gray-500">From a small school to a full university — one platform for all.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 hover:border-purple-200 hover:bg-purple-50 transition-colors">
                <div className="mb-3 inline-flex rounded-lg bg-white p-2 shadow-sm">
                  <f.icon className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Simple, transparent pricing</h2>
            <p className="mt-3 text-gray-500">Pay monthly. Cancel anytime. Payments via CashMaal — JazzCash, EasyPaisa & Cards accepted.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 bg-white p-6 ${plan.border} ${plan.popular ? "shadow-xl" : "shadow-sm"}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-violet-500 px-4 py-0.5 text-xs font-bold text-white shadow">
                    Most Popular
                  </span>
                )}
                <div className={`mb-1 inline-block rounded-lg bg-gradient-to-br ${plan.color} px-3 py-1 text-xs font-bold text-white`}>
                  {plan.name}
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">Rs. {plan.price}</span>
                  <span className="text-sm text-gray-400">{plan.period}</span>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-6 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-violet-500 text-white shadow"
                      : "border border-gray-200 text-gray-700 hover:border-purple-400 hover:text-purple-700"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Synthixx ─────────────────────────────────────────────── */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Built for Pakistan&apos;s schools</h2>
          <p className="mt-3 text-gray-500 sm:text-lg">
            Designed from the ground up for Pakistani institutions — Urdu-friendly, local payment gateways, affordable pricing in PKR.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Shield, title: "Data Security", desc: "Your school data is encrypted and hosted on enterprise-grade infrastructure." },
              { icon: Zap, title: "Fast & Reliable", desc: "99.9% uptime. Works on slow connections. Mobile-first design." },
              { icon: Building2, title: "School to University", desc: "Scales from a small school to a large university with zero migration." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 p-6 text-left">
                <item.icon className="h-7 w-7 text-purple-600" />
                <h3 className="mt-3 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-purple-600 to-violet-500 px-4 py-16 text-center text-white">
        <h2 className="text-3xl font-extrabold">Ready to modernize your school?</h2>
        <p className="mt-3 text-purple-100">Join hundreds of schools already using Synthixx Campus.</p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-purple-700 shadow hover:bg-purple-50 transition-colors"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
          >
            Login
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer id="contact" className="border-t border-gray-100 bg-white px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-violet-500 text-white">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">Synthixx Campus</p>
                <p className="text-xs text-gray-400">School & University Management</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-gray-500">
              <a href="mailto:support@synthixx.com" className="flex items-center gap-1.5 hover:text-purple-600 transition-colors">
                <Mail className="h-4 w-4" /> support@synthixx.com
              </a>
              <a href="tel:+92300000000" className="flex items-center gap-1.5 hover:text-purple-600 transition-colors">
                <Phone className="h-4 w-4" /> +92 300 0000000
              </a>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Synthixx. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
