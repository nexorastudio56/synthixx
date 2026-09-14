import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { GraduationCap, LayoutDashboard, CreditCard, School, LogOut } from "lucide-react";
import Link from "next/link";

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? "";

export const metadata = { title: "Platform Admin — Synthixx" };

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/login?next=/platform-admin");
  }

  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-white/8 bg-[#1a1d27]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Synthixx</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Platform Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {[
            { href: "/platform-admin",               icon: LayoutDashboard, label: "Dashboard"     },
            { href: "/platform-admin/subscriptions", icon: CreditCard,      label: "Subscriptions" },
            { href: "/platform-admin/schools",       icon: School,          label: "Schools"       },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/8 p-4">
          <p className="truncate text-xs text-white/40">{user.email}</p>
          <Link
            href="/api/auth/signout"
            className="mt-2 flex items-center gap-2 text-xs text-white/40 hover:text-white transition"
          >
            <LogOut size={12} /> Sign out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-8 text-white">{children}</main>
    </div>
  );
}
