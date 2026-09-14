import Link from "next/link";
import {
  GraduationCap,
  BarChart3,
  Users,
  CreditCard,
  BookOpen,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  Globe,
  ChevronRight,
} from "lucide-react";

export const metadata = {
  title: "Synthixx Campus — Run your entire campus from one place",
  description:
    "Pakistan's #1 school management system. Fees, attendance, exams, AI analytics, parent portal and more.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white antialiased">
      {/* ── Navbar ───────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <GraduationCap className="text-white" size={18} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Synthixx Campus
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-slate-400 transition hover:text-white">Features</Link>
            <Link href="#pricing" className="text-sm text-slate-400 transition hover:text-white">Pricing</Link>
            <Link href="#portals" className="text-sm text-slate-400 transition hover:text-white">Portals</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 transition hover:text-white">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
          <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
          <div className="absolute left-0 top-1/3 h-[300px] w-[300px] rounded-full bg-cyan-600/6 blur-[80px]" />
        </div>

        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-start lg:gap-12">
            {/* Left — copy */}
            <div className="max-w-xl flex-1 text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">
                  Pakistan&rsquo;s #1 School Management System
                </span>
              </div>

              <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white lg:text-6xl">
                Run your entire{" "}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  campus
                </span>{" "}
                from one place
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-400">
                Synthixx Campus handles fees, attendance, exams, payroll, parent
                communication, and AI insights — so you can focus on education,
                not spreadsheets.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <Link
                  href="/signup"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 sm:w-auto"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-7 py-3.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-white sm:w-auto"
                >
                  Student / Parent login
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                15-day free trial &middot; All features included &middot; From Rs. 5,000/month
              </p>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                {["500+ Schools", "1.2M+ Students", "JazzCash & EasyPaisa"].map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs text-slate-400">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative w-full max-w-lg flex-1">
              {/* Floating chips */}
              <div className="absolute -top-4 -left-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#131929] px-3.5 py-2 shadow-2xl">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-slate-300">Live analytics</span>
              </div>
              <div className="absolute -right-4 top-16 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#131929] px-3.5 py-2 shadow-2xl">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">1,240 students</span>
              </div>

              {/* Main card */}
              <div
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f1424] shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
                style={{ transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)" }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
                      <GraduationCap size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Campus Dashboard</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 p-4">
                  <div className="rounded-xl bg-blue-500/10 p-3 ring-1 ring-blue-500/20">
                    <p className="text-[10px] text-blue-300/70">Attendance</p>
                    <p className="mt-0.5 text-xl font-bold text-blue-300">94%</p>
                    <p className="text-[9px] text-blue-400/50">↑ 2% vs last week</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20">
                    <p className="text-[10px] text-emerald-300/70">Collected</p>
                    <p className="mt-0.5 text-xl font-bold text-emerald-300">₨1.2M</p>
                    <p className="text-[9px] text-emerald-400/50">↑ 18% this month</p>
                  </div>
                  <div className="rounded-xl bg-violet-500/10 p-3 ring-1 ring-violet-500/20">
                    <p className="text-[10px] text-violet-300/70">AI Insights</p>
                    <p className="mt-0.5 text-xl font-bold text-violet-300">12</p>
                    <p className="text-[9px] text-violet-400/50">New alerts today</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="px-4 pb-3">
                  <p className="mb-2 text-[10px] text-slate-500">Fee collection — last 7 days</p>
                  <div className="flex h-14 items-end gap-1">
                    {[35, 55, 40, 70, 60, 85, 75].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t-sm bg-blue-500/30"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Student list */}
                <div className="border-t border-white/6 px-4 py-2">
                  {[
                    { name: "Ali Hassan", grade: "Grade 10", status: "Paid", color: "text-emerald-400 bg-emerald-400/10" },
                    { name: "Sara Ahmed", grade: "Grade 8", status: "Pending", color: "text-amber-400 bg-amber-400/10" },
                    { name: "Omar Khan", grade: "Grade 11", status: "Paid", color: "text-emerald-400 bg-emerald-400/10" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-slate-300">
                          {s.name[0]}
                        </div>
                        <span className="text-[11px] text-slate-300">{s.name}</span>
                        <span className="text-[9px] text-slate-500">{s.grade}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${s.color}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notification */}
                <div className="m-3 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-300">
                    Payment received &middot; Rs. 12,000 &middot; JazzCash &middot; just now
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "500+", label: "Schools trust us" },
              { value: "1.2M+", label: "Students managed" },
              { value: "₨850M+", label: "Fees collected" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="mt-1 text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium text-blue-400">Everything your institution needs</p>
            <h2 className="text-4xl font-bold tracking-tight text-white">
              One platform. Every department.
            </h2>
            <p className="mt-4 text-slate-400">
              From admissions to graduation — Synthixx Campus covers every workflow.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: CreditCard,
                color: "text-blue-400",
                bg: "bg-blue-500/10",
                ring: "ring-blue-500/20",
                title: "Fee Management",
                desc: "Collect fees via JazzCash, EasyPaisa, NayaPay, bank transfer or cash. Automated receipts, overdue alerts, and detailed reports.",
              },
              {
                icon: Users,
                color: "text-violet-400",
                bg: "bg-violet-500/10",
                ring: "ring-violet-500/20",
                title: "Attendance Tracking",
                desc: "Mark attendance per period or daily. QR-code scanning, SMS alerts to parents, monthly summaries with AI insights.",
              },
              {
                icon: BookOpen,
                color: "text-cyan-400",
                bg: "bg-cyan-500/10",
                ring: "ring-cyan-500/20",
                title: "Exam & Grading",
                desc: "Create exams, enter marks, auto-calculate grades, generate result cards, and share with parents instantly.",
              },
              {
                icon: BarChart3,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                ring: "ring-emerald-500/20",
                title: "AI Analytics",
                desc: "Predictive dropout alerts, fee collection forecasts, attendance trends — all powered by AI trained on your school data.",
              },
              {
                icon: Globe,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                ring: "ring-amber-500/20",
                title: "Parent & Student Portal",
                desc: "Parents can view fees, attendance, results, and communicate with teachers — all from their phone.",
              },
              {
                icon: Shield,
                color: "text-rose-400",
                bg: "bg-rose-500/10",
                ring: "ring-rose-500/20",
                title: "HR & Payroll",
                desc: "Manage staff, track leave, calculate salaries, generate payslips — full payroll for your entire institution.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/6 bg-white/[0.03] p-6 transition hover:border-white/12 hover:bg-white/[0.05]"
              >
                <div className={`mb-4 inline-flex rounded-xl p-2.5 ${f.bg} ring-1 ${f.ring}`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="mb-2 font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals ──────────────────────────────────────────── */}
      <section id="portals" className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="overflow-hidden rounded-2xl border border-white/6 bg-gradient-to-br from-blue-600/10 to-violet-600/10 p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="mb-3 text-sm font-medium text-blue-400">Portals</p>
                <h2 className="text-3xl font-bold text-white">
                  Separate dashboards for everyone
                </h2>
                <p className="mt-4 text-slate-400">
                  Every stakeholder gets their own tailored experience — admins see everything,
                  teachers manage their classes, parents track their child, students access their results.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    { role: "School Admin", desc: "Full control — users, fees, reports, settings" },
                    { role: "Teacher", desc: "Attendance, marks, homework, parent messages" },
                    { role: "Parent", desc: "Fee payments, attendance, results, chat" },
                    { role: "Student", desc: "Timetable, results, library, announcements" },
                  ].map((p) => (
                    <div key={p.role} className="flex items-start gap-3">
                      <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                      <div>
                        <span className="text-sm font-medium text-white">{p.role}</span>
                        <span className="ml-2 text-sm text-slate-500">{p.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Admin", icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: "Teacher", icon: BookOpen, color: "text-violet-400", bg: "bg-violet-500/10" },
                  { label: "Parent", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { label: "Student", icon: GraduationCap, color: "text-amber-400", bg: "bg-amber-500/10" },
                ].map((p) => (
                  <div
                    key={p.label}
                    className="flex flex-col items-center rounded-xl border border-white/8 bg-white/[0.04] py-8 transition hover:border-white/16 hover:bg-white/[0.07]"
                  >
                    <div className={`mb-3 rounded-xl p-3 ${p.bg}`}>
                      <p.icon className={`h-6 w-6 ${p.color}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-200">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-medium text-blue-400">Pricing</p>
            <h2 className="text-4xl font-bold tracking-tight text-white">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-slate-400">
              Start free. Upgrade when you&rsquo;re ready. No hidden fees.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Starter",
                price: "5,000",
                desc: "Perfect for small schools",
                features: ["Up to 200 students", "Fee management", "Attendance tracking", "Parent portal", "Basic reports", "Email support"],
                popular: false,
                cta: "Start free trial",
                href: "/signup?plan=starter",
              },
              {
                name: "Growth",
                price: "12,000",
                desc: "For growing institutions",
                features: ["Up to 1,000 students", "Everything in Starter", "AI analytics", "JazzCash & EasyPaisa", "HR & Payroll", "Priority support"],
                popular: true,
                cta: "Start free trial",
                href: "/signup?plan=growth",
              },
              {
                name: "Enterprise",
                price: "25,000",
                desc: "Universities & large schools",
                features: ["Unlimited students", "Everything in Growth", "University modules", "Custom domain", "API access", "Dedicated support"],
                popular: false,
                cta: "Contact sales",
                href: "/signup?plan=enterprise",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-7 ${
                  plan.popular
                    ? "border-blue-500/40 bg-gradient-to-b from-blue-600/10 to-transparent shadow-lg shadow-blue-500/10"
                    : "border-white/8 bg-white/[0.03]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-1 text-sm font-medium text-slate-400">{plan.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-slate-500">Rs.</span>
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-slate-500">/mo</span>
                </div>
                <p className="mt-1.5 text-sm text-slate-500">{plan.desc}</p>

                <Link
                  href={plan.href}
                  className={`mt-6 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                    plan.popular
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border border-white/12 text-slate-300 hover:border-white/24 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                quote: "We switched from Excel to Synthixx in one week. Fee collection improved by 40% in the first month.",
                name: "Usman Malik",
                role: "Principal, Beacon Academy",
              },
              {
                quote: "Parents love the portal. They can pay fees from home via JazzCash. Complaints dropped to zero.",
                name: "Ayesha Raza",
                role: "Admin, Al-Noor School",
              },
              {
                quote: "The AI attendance alerts helped us identify 12 at-risk students before it was too late.",
                name: "Dr. Khalid Shah",
                role: "Director, City Grammar School",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-white/6 bg-white/[0.03] p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-400">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/15 via-blue-600/5 to-violet-600/10 px-8 py-16">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
            </div>
            <div className="relative">
              <Zap className="mx-auto mb-4 h-10 w-10 text-blue-400" />
              <h2 className="text-4xl font-bold text-white">
                Ready to modernise your institution?
              </h2>
              <p className="mt-4 text-slate-400">
                Join 500+ schools across Pakistan. Setup in under 30 minutes.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/signup"
                  className="group flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-slate-400 underline underline-offset-4 transition hover:text-white"
                >
                  Sign in to dashboard
                </Link>
              </div>
              <p className="mt-5 text-xs text-slate-500">
                From Rs. 5,000/month after trial. 15-day free trial — all features included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <GraduationCap size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Synthixx Campus</span>
            </div>
            <div className="flex gap-8">
              <a href="mailto:support@synthixx.com" className="text-xs text-slate-500 transition hover:text-slate-300">
                support@synthixx.com
              </a>
              <Link href="/login" className="text-xs text-slate-500 transition hover:text-slate-300">Sign in</Link>
              <Link href="/signup" className="text-xs text-slate-500 transition hover:text-slate-300">Sign up</Link>
            </div>
            <p className="text-xs text-slate-600">&copy; 2026 Synthixx. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
