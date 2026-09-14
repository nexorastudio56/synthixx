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
    <div className="min-h-screen bg-[#faf9f6] text-[#1f1d1a] antialiased">

      {/* ── Navbar ───────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#e7e3da] bg-[#faf9f6]/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1f1d1a]">
              <GraduationCap className="text-white" size={18} />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-[#1f1d1a]">
              Synthixx Campus
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm text-[#6b665f] transition hover:text-[#1f1d1a]">Features</Link>
            <Link href="#pricing"  className="text-sm text-[#6b665f] transition hover:text-[#1f1d1a]">Pricing</Link>
            <Link href="#portals"  className="text-sm text-[#6b665f] transition hover:text-[#1f1d1a]">Portals</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#6b665f] transition hover:text-[#1f1d1a]">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-[#1f1d1a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3a3733]"
            >
              Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Subtle mesh background */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(31,29,26,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Faint grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,29,26,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(31,29,26,0.8) 1px,transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-start lg:gap-12">

            {/* Left — copy */}
            <div className="max-w-xl flex-1 text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-emerald-700">
                  Pakistan&rsquo;s #1 School Management System
                </span>
              </div>

              <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-[#1f1d1a] lg:text-6xl">
                Run your entire{" "}
                <span className="italic text-[#1f1d1a] underline decoration-[#e7e3da] underline-offset-4">
                  campus
                </span>{" "}
                from one place
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-[#6b665f]">
                Synthixx Campus handles fees, attendance, exams, payroll, parent
                communication, and AI insights — so you can focus on education,
                not spreadsheets.
              </p>

              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <Link
                  href="/signup"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f1d1a] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3a3733] hover:shadow-md sm:w-auto"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e7e3da] bg-white px-7 py-3.5 text-sm font-medium text-[#1f1d1a] transition hover:border-[#bbb] sm:w-auto"
                >
                  Student / Parent login
                </Link>
              </div>

              <p className="mt-4 text-xs text-[#a8a299]">
                15-day free trial &middot; All features included &middot; From Rs. 5,000/month
              </p>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                {["500+ Schools", "1.2M+ Students", "JazzCash & EasyPaisa"].map((b) => (
                  <div key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-[#6b665f]">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative w-full max-w-lg flex-1">
              {/* Floating chips */}
              <div className="absolute -top-4 -left-4 z-10 flex items-center gap-2 rounded-xl border border-[#e7e3da] bg-white px-3.5 py-2 shadow-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-[#1f1d1a]">Live analytics</span>
              </div>
              <div className="absolute -right-4 top-16 z-10 flex items-center gap-2 rounded-xl border border-[#e7e3da] bg-white px-3.5 py-2 shadow-md">
                <Users className="h-3.5 w-3.5 text-[#6b665f]" />
                <span className="text-xs font-medium text-[#1f1d1a]">1,240 students</span>
              </div>

              {/* Main card */}
              <div
                className="relative overflow-hidden rounded-2xl border border-[#e7e3da] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.10)]"
                style={{ transform: "perspective(1200px) rotateY(-6deg) rotateX(2deg)" }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between border-b border-[#f0ede7] bg-[#faf9f6] px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1f1d1a]">
                      <GraduationCap size={12} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-[#1f1d1a]">Campus Dashboard</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-[#f0ede7] border-b border-[#f0ede7]">
                  <div className="p-4">
                    <p className="text-[10px] text-[#a8a299]">Attendance</p>
                    <p className="mt-0.5 text-xl font-bold text-[#1f1d1a]">94%</p>
                    <p className="text-[9px] text-emerald-600">↑ 2% vs last week</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] text-[#a8a299]">Collected</p>
                    <p className="mt-0.5 text-xl font-bold text-[#1f1d1a]">₨1.2M</p>
                    <p className="text-[9px] text-emerald-600">↑ 18% this month</p>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] text-[#a8a299]">AI Insights</p>
                    <p className="mt-0.5 text-xl font-bold text-[#1f1d1a]">12</p>
                    <p className="text-[9px] text-amber-600">Needs attention</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="border-b border-[#f0ede7] px-4 py-3">
                  <p className="mb-2 text-[10px] text-[#a8a299]">Fee collection — last 7 days</p>
                  <div className="flex h-14 items-end gap-1">
                    {[
                      { h: 35, hi: false }, { h: 55, hi: false }, { h: 40, hi: false },
                      { h: 80, hi: true  }, { h: 60, hi: false }, { h: 85, hi: false },
                      { h: 75, hi: true  },
                    ].map((b, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm ${b.hi ? "bg-[#1f1d1a]" : "bg-[#eceae3]"}`}
                        style={{ height: `${b.h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Student list */}
                <div className="px-4 py-2">
                  {[
                    { name: "Ali Hassan",  grade: "Grade 10", status: "Paid",    sc: "text-emerald-700 bg-emerald-50" },
                    { name: "Sara Ahmed",  grade: "Grade 8",  status: "Pending", sc: "text-amber-700 bg-amber-50" },
                    { name: "Omar Khan",   grade: "Grade 11", status: "Paid",    sc: "text-emerald-700 bg-emerald-50" },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eceae3] text-[9px] font-bold text-[#6b665f]">
                          {s.name[0]}
                        </div>
                        <span className="text-[11px] text-[#1f1d1a]">{s.name}</span>
                        <span className="text-[9px] text-[#a8a299]">{s.grade}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${s.sc}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notification */}
                <div className="m-3 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-emerald-700">
                    Payment received &middot; Rs. 12,000 &middot; JazzCash &middot; just now
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="border-y border-[#e7e3da] bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "500+",   label: "Schools trust us" },
              { value: "1.2M+",  label: "Students managed" },
              { value: "₨850M+", label: "Fees collected" },
              { value: "99.9%",  label: "Uptime SLA" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-[#1f1d1a]">{s.value}</p>
                <p className="mt-1 text-sm text-[#a8a299]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="features" className="bg-[#faf9f6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#a8a299]">
              Everything your institution needs
            </p>
            <h2 className="text-4xl font-bold tracking-tight text-[#1f1d1a]">
              One platform. Every department.
            </h2>
            <p className="mt-4 text-[#6b665f]">
              From admissions to graduation — Synthixx Campus covers every workflow.
            </p>
          </div>

          <div className="grid gap-px bg-[#e7e3da] md:grid-cols-2 lg:grid-cols-3 rounded-2xl overflow-hidden">
            {[
              {
                icon: CreditCard,
                title: "Fee Management",
                desc: "Collect fees via JazzCash, EasyPaisa, NayaPay, bank transfer or cash. Automated receipts, overdue alerts, and detailed reports.",
              },
              {
                icon: Users,
                title: "Attendance Tracking",
                desc: "Mark attendance per period or daily. QR-code scanning, SMS alerts to parents, monthly summaries with AI insights.",
              },
              {
                icon: BookOpen,
                title: "Exam & Grading",
                desc: "Create exams, enter marks, auto-calculate grades, generate result cards, and share with parents instantly.",
              },
              {
                icon: BarChart3,
                title: "AI Analytics",
                desc: "Predictive dropout alerts, fee collection forecasts, attendance trends — all powered by AI trained on your school data.",
              },
              {
                icon: Globe,
                title: "Parent & Student Portal",
                desc: "Parents can view fees, attendance, results, and communicate with teachers — all from their phone.",
              },
              {
                icon: Shield,
                title: "HR & Payroll",
                desc: "Manage staff, track leave, calculate salaries, generate payslips — full payroll for your entire institution.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group bg-white p-7 transition hover:bg-[#faf9f6]"
              >
                <div className="mb-4 inline-flex rounded-xl border border-[#e7e3da] bg-[#faf9f6] p-2.5 transition group-hover:border-[#1f1d1a] group-hover:bg-[#1f1d1a]">
                  <f.icon className="h-5 w-5 text-[#1f1d1a] transition group-hover:text-white" />
                </div>
                <h3 className="mb-2 font-semibold text-[#1f1d1a]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#6b665f]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals ──────────────────────────────────────────── */}
      <section id="portals" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="overflow-hidden rounded-2xl border border-[#e7e3da] bg-[#faf9f6] p-8 md:p-12">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#a8a299]">Portals</p>
                <h2 className="text-3xl font-bold text-[#1f1d1a]">
                  Separate dashboards for everyone
                </h2>
                <p className="mt-4 text-[#6b665f]">
                  Every stakeholder gets their own tailored experience — admins see everything,
                  teachers manage their classes, parents track their child, students access their results.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    { role: "School Admin", desc: "Full control — users, fees, reports, settings" },
                    { role: "Teacher",      desc: "Attendance, marks, homework, parent messages" },
                    { role: "Parent",       desc: "Fee payments, attendance, results, chat" },
                    { role: "Student",      desc: "Timetable, results, library, announcements" },
                  ].map((p) => (
                    <div key={p.role} className="flex items-start gap-3">
                      <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1f1d1a]" />
                      <div>
                        <span className="text-sm font-semibold text-[#1f1d1a]">{p.role}</span>
                        <span className="ml-2 text-sm text-[#6b665f]">{p.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Admin",   icon: Shield,        },
                  { label: "Teacher", icon: BookOpen,      },
                  { label: "Parent",  icon: Users,         },
                  { label: "Student", icon: GraduationCap, },
                ].map((p) => (
                  <div
                    key={p.label}
                    className="group flex flex-col items-center rounded-xl border border-[#e7e3da] bg-white py-8 transition hover:border-[#1f1d1a] hover:bg-[#1f1d1a]"
                  >
                    <div className="mb-3 rounded-xl border border-[#e7e3da] bg-[#faf9f6] p-3 transition group-hover:border-transparent group-hover:bg-white/10">
                      <p.icon className="h-6 w-6 text-[#1f1d1a] transition group-hover:text-white" />
                    </div>
                    <span className="text-sm font-medium text-[#1f1d1a] transition group-hover:text-white">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────── */}
      <section id="pricing" className="bg-[#faf9f6] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#a8a299]">Pricing</p>
            <h2 className="text-4xl font-bold tracking-tight text-[#1f1d1a]">
              Simple, honest pricing
            </h2>
            <p className="mt-4 text-[#6b665f]">
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
                    ? "border-[#1f1d1a] bg-[#1f1d1a] shadow-xl"
                    : "border-[#e7e3da] bg-white"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full border border-[#3a3733] bg-[#1f1d1a] px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className={`mb-1 text-sm font-semibold uppercase tracking-widest ${plan.popular ? "text-[#6b665f]" : "text-[#a8a299]"}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-sm ${plan.popular ? "text-[#6b665f]" : "text-[#a8a299]"}`}>Rs.</span>
                  <span className={`text-4xl font-bold tracking-tight ${plan.popular ? "text-white" : "text-[#1f1d1a]"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? "text-[#6b665f]" : "text-[#a8a299]"}`}>/mo</span>
                </div>
                <p className={`mt-1.5 text-sm ${plan.popular ? "text-[#6b665f]" : "text-[#6b665f]"}`}>{plan.desc}</p>

                <Link
                  href={plan.href}
                  className={`mt-6 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition ${
                    plan.popular
                      ? "bg-white text-[#1f1d1a] hover:bg-[#eceae3]"
                      : "border border-[#e7e3da] text-[#1f1d1a] hover:border-[#bbb] hover:bg-[#faf9f6]"
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${plan.popular ? "text-[#a8a299]" : "text-[#6b665f]"}`}>
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
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
      <section className="bg-white py-16">
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
              <div key={t.name} className="rounded-2xl border border-[#e7e3da] bg-[#faf9f6] p-6 transition hover:shadow-md">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-[#6b665f]">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eceae3] text-xs font-bold text-[#6b665f]">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1f1d1a]">{t.name}</p>
                    <p className="text-xs text-[#a8a299]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="bg-[#1f1d1a] py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Zap className="mx-auto mb-4 h-10 w-10 text-[#6b665f]" />
          <h2 className="text-4xl font-bold text-white">
            Ready to modernise your institution?
          </h2>
          <p className="mt-4 text-[#6b665f]">
            Join 500+ schools across Pakistan. Setup in under 30 minutes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#1f1d1a] transition hover:bg-[#eceae3]"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-[#6b665f] underline underline-offset-4 transition hover:text-white"
            >
              Sign in to dashboard
            </Link>
          </div>
          <p className="mt-5 text-xs text-[#4a4844]">
            From Rs. 5,000/month after trial. 15-day free trial — all features included.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-[#2a2724] bg-[#1f1d1a] py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2a2724]">
                <GraduationCap size={14} className="text-[#6b665f]" />
              </div>
              <span className="text-sm font-semibold text-[#6b665f]">Synthixx Campus</span>
            </div>
            <div className="flex gap-8">
              <a href="mailto:support@synthixx.com" className="text-xs text-[#4a4844] transition hover:text-[#6b665f]">
                support@synthixx.com
              </a>
              <Link href="/login"  className="text-xs text-[#4a4844] transition hover:text-[#6b665f]">Sign in</Link>
              <Link href="/signup" className="text-xs text-[#4a4844] transition hover:text-[#6b665f]">Sign up</Link>
            </div>
            <p className="text-xs text-[#4a4844]">&copy; 2026 Synthixx. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
