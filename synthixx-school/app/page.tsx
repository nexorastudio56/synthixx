// Landing page — school.synthixx.com
import Link from "next/link";
import { GraduationCap, RefreshCw, Users, Wallet, Brain } from "lucide-react";

export const metadata = {
  title: "Synthixx Campus — Run your entire campus from one place",
  description:
    "Synthixx Campus is a modern ERP for schools and universities — fees, attendance, exams, AI insights, and family portals. Trusted by institutions worldwide.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 antialiased">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600">
            <GraduationCap className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-semibold text-gray-800">Campus</span>
        </div>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-8 text-sm text-gray-500">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#portals" className="hover:text-gray-900 transition-colors">Portals</a>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Toggle theme">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-8 pt-16 pb-24 lg:pt-20 lg:pb-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — Text */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500 mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                International · English-first
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold leading-tight tracking-tight text-gray-900 mb-5">
                Run your entire{" "}
                <span className="text-blue-600">campus</span>
                {" "}from one place
              </h1>

              {/* Subtext */}
              <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-md">
                Synthixx Campus is a modern ERP for schools and universities — fees, attendance, exams, AI insights, and family portals. Trusted by institutions worldwide.
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-4 mb-5">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
                >
                  Start free trial <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Student / Parent login
                </Link>
              </div>

              {/* Fine print */}
              <p className="text-xs text-gray-400">
                From Rs. 5,000/month after trial. 15-day free trial — all features included.
              </p>
            </div>

            {/* Right — 3D Dashboard Mockup */}
            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-sm lg:max-w-md">

                {/* Back floating card — Live Analytics */}
                <div className="absolute -top-6 left-4 z-0 rounded-xl border border-gray-200 bg-white shadow-md px-4 py-2.5 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-xs font-medium text-gray-600">Live analytics</span>
                </div>

                {/* Back floating card — User count */}
                <div className="absolute -top-2 right-2 z-0 rounded-xl border border-gray-200 bg-white shadow-md px-3 py-2 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs text-gray-500">1,240 students</span>
                </div>

                {/* Main Dashboard Card */}
                <div className="relative z-10 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden mt-8">
                  {/* Card header */}
                  <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                      <GraduationCap className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">Campus</span>
                    <div className="ml-auto flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400"></span>
                      <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                      <span className="h-2 w-2 rounded-full bg-green-400"></span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dashboard</p>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5 text-center">
                        <p className="text-lg font-bold text-blue-700">94%</p>
                        <p className="text-[10px] text-blue-500 mt-0.5">Attendance</p>
                      </div>
                      <div className="rounded-lg bg-green-50 border border-green-100 p-2.5 text-center">
                        <p className="text-lg font-bold text-green-700">Rs. 1.2M</p>
                        <p className="text-[10px] text-green-500 mt-0.5">Collected</p>
                      </div>
                      <div className="rounded-lg bg-purple-50 border border-purple-100 p-2.5 text-center flex flex-col items-center justify-center gap-1">
                        <Brain className="h-4 w-4 text-purple-600" />
                        <p className="text-[10px] text-purple-500">AI Insights</p>
                      </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="flex items-end gap-1 h-10 mb-3">
                      {[40, 65, 50, 80, 60, 90, 70, 85, 55, 75].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-blue-200"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>

                    {/* Student rows */}
                    <div className="space-y-2">
                      {[
                        { name: "Ali Hassan", class: "Grade 10", fee: "Paid", color: "green" },
                        { name: "Sara Ahmed", class: "Grade 8", fee: "Pending", color: "yellow" },
                        { name: "Omar Khan", class: "Grade 11", fee: "Paid", color: "green" },
                      ].map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                              {s.name[0]}
                            </div>
                            <span className="text-gray-700 font-medium">{s.name}</span>
                            <span className="text-gray-400">{s.class}</span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            s.color === "green"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {s.fee}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">Last updated: just now</span>
                    <div className="flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-gray-400" />
                      <span className="text-[10px] text-gray-400">Fee module active</span>
                    </div>
                  </div>
                </div>

                {/* Bottom floating card — notification */}
                <div className="absolute -bottom-4 right-4 z-20 rounded-xl border border-gray-200 bg-white shadow-lg px-3 py-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-700">Payment received</p>
                    <p className="text-[9px] text-gray-400">Rs. 12,000 · JazzCash</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background gradient blob */}
        <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[500px] w-[500px] rounded-full bg-blue-50 opacity-60 blur-3xl" />
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="border-t border-gray-100 bg-gray-50 px-8 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Everything your institution needs</h2>
          <p className="text-gray-500 mb-10 text-sm">One platform for schools and universities of all sizes.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
            {[
              { icon: "📚", label: "Fee Management", desc: "JazzCash, EasyPaisa, Bank transfer" },
              { icon: "📅", label: "Attendance", desc: "Daily tracking with QR scan" },
              { icon: "📝", label: "Exams & Results", desc: "Grades, report cards, ranking" },
              { icon: "🤖", label: "AI Insights", desc: "Gemini-powered analytics" },
              { icon: "👨‍👩‍👧", label: "Parent Portal", desc: "Live fee & attendance updates" },
              { icon: "🚌", label: "Transport", desc: "Route & hostel management" },
              { icon: "👨‍💼", label: "HR & Payroll", desc: "Staff salary & leaves" },
              { icon: "🏫", label: "University Mode", desc: "GPA, courses, semesters" },
            ].map((f) => (
              <div key={f.label} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="text-sm font-semibold text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="px-8 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Simple pricing</h2>
          <p className="text-gray-500 text-sm mb-10">15-day free trial. No credit card required.</p>
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { name: "Starter", price: "5,000", desc: "Up to 200 students", popular: false },
              { name: "Growth", price: "12,000", desc: "Up to 1,000 students + AI", popular: true },
              { name: "Enterprise", price: "25,000", desc: "Unlimited + University mode", popular: false },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl border p-6 text-left ${p.popular ? "border-blue-500 shadow-lg" : "border-gray-200"}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                    Most popular
                  </span>
                )}
                <p className="text-sm font-semibold text-gray-700 mb-1">{p.name}</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-gray-900">Rs. {p.price}</span>
                  <span className="text-xs text-gray-400">/mo</span>
                </div>
                <p className="text-xs text-gray-500 mb-5">{p.desc}</p>
                <Link
                  href="/signup"
                  className={`block w-full rounded-lg py-2 text-center text-sm font-medium transition-colors ${
                    p.popular
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals ────────────────────────────────────────────────── */}
      <section id="portals" className="border-t border-gray-100 bg-gray-50 px-8 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Built-in portals for everyone</h2>
          <p className="text-gray-500 text-sm mb-8">Each role gets their own experience — no confusion, just clarity.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: "🏫", role: "Admin", desc: "Full control of your institution" },
              { icon: "📖", role: "Teacher", desc: "Classes, homework & grades" },
              { icon: "👨‍👩‍👧", role: "Parent", desc: "Fees, attendance & results" },
              { icon: "🎓", role: "Student", desc: "Courses, marks & schedule" },
            ].map((r) => (
              <div key={r.role} className="rounded-xl border border-gray-200 bg-white p-4 text-center hover:shadow-sm transition-shadow">
                <div className="text-3xl mb-2">{r.icon}</div>
                <p className="text-sm font-semibold text-gray-800">{r.role}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section className="px-8 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to modernise your institution?</h2>
          <p className="text-gray-500 text-sm mb-7">Join hundreds of schools and universities already using Synthixx Campus.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/signup" className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
              Start free trial →
            </Link>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Sign in to dashboard
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">From Rs. 5,000/month after trial. 15-day free trial — all features included.</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
            <GraduationCap className="h-3 w-3 text-white" />
          </span>
          <span className="font-medium text-gray-600">Synthixx Campus</span>
        </div>
        <div className="flex gap-5">
          <a href="mailto:support@synthixx.com" className="hover:text-gray-600 transition-colors">support@synthixx.com</a>
          <Link href="/login" className="hover:text-gray-600 transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-gray-600 transition-colors">Sign up</Link>
        </div>
        <p>© {new Date().getFullYear()} Synthixx. All rights reserved.</p>
      </footer>
    </div>
  );
}
