"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cn } from "./ui/primitives";
import { logout, type User } from "@/lib/api";

const ICONS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z",
  assessment: "M9 4h6l4 4v12H5V4h4Zm3 0v5h5M8 13h8M8 17h5",
  dashboard: "M4 18V8m8 10V4m8 14v-7M3 20h18",
  history: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  profile: "M5 20a7 7 0 0 1 14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  login: "M10 16 5 11l5-5M5 11h11a5 5 0 0 1 0 10h-1",
  signup: "M12 5v14M5 12h14",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  close: "M6 6l12 12M18 6 6 18",
  menu: "M4 6h16M4 12h16M4 18h16",
} as const;

type IconName = keyof typeof ICONS;
type Item = { href: string; label: string; icon: IconName; badge?: number };

function Icon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[name]} /></svg>;
}

export default function ResponsiveSidebar({ user, dashboardAlertCount = 0 }: { user: User | null; dashboardAlertCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const items: Item[] = user
    ? [
        ...(user.role === "mho" ? [{ href: "/dashboard?section=overview", label: "Overview", icon: "dashboard" as const }, { href: "/dashboard?section=records", label: "Assessment records", icon: "history" as const, badge: dashboardAlertCount }, { href: "/dashboard?section=analytics", label: "Analytics", icon: "dashboard" as const }, { href: "/dashboard?section=reports", label: "Reports", icon: "dashboard" as const }] : []),
        ...(user.role === "admin" ? [{ href: "/admin", label: "Overview", icon: "dashboard" as const }] : []),
        ...(user.role === "resident" ? [{ href: "/assessment", label: "Assessment", icon: "assessment" as const }, { href: "/history", label: "History", icon: "history" as const }] : []),
        { href: "/profile", label: "Profile", icon: "profile" },
      ]
    : [
        { href: "/", label: "Home", icon: "home" },
        { href: "/login", label: "Log in", icon: "login" },
        { href: "/register", label: "Sign up", icon: "signup" },
      ];

  const active = (href: string) => {
    const [path, query] = href.split("?");
    if (path === "/dashboard" && query) {
      return pathname === path && (searchParams.get("section") ?? "overview") === new URLSearchParams(query).get("section");
    }
    return path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  };

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setOpen(false);
      window.location.href = "/";
    }
  }

  return (
    <>
      <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)} className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-header text-ink-secondary shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-brand/20 md:hidden">
        <Icon name={open ? "close" : "menu"} />
      </button>
      {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="premium-overlay fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden" />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#D7E0D2] bg-[linear-gradient(180deg,#FBF9F2_0%,#F2F6EE_100%)] shadow-[0_18px_48px_rgba(20,31,25,0.18)] transition-transform md:hidden", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="relative border-b border-[#D7E0D2] px-5 py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-brand to-brand-dark text-base font-medium text-brand-foreground shadow-sm" style={{ fontFamily: "var(--font-display)" }}>H</span><span className="text-[1.05rem] font-medium text-ink" style={{ fontFamily: "var(--font-display)" }}>HealthGuard</span></Link>
          {user ? <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-xs font-medium text-brand-dark">{user.full_name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{user.full_name}</p><p className="truncate text-xs text-ink-faint">{user.role === "mho" ? "Municipal Health Officer" : user.role === "admin" ? "Administrator" : "Resident access"}</p></div></div> : <p className="mt-5 text-xs leading-relaxed text-ink-muted">Bilingual health guidance for the Irosin community.</p>}
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">{user?.role === "mho" && <div className="mb-3 flex items-center justify-between px-3"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Dashboard</span><span className="rounded-full border border-[#cfe0d3] bg-[#eef6f0] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-brand-dark">Live</span></div>}{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand/20", active(item.href) ? "bg-brand-tint font-semibold text-brand-dark shadow-[inset_3px_0_0_var(--color-brand)]" : "text-ink-secondary hover:bg-card hover:text-ink")}><span className="flex h-6 w-6 shrink-0 items-center justify-center text-ink-faint"><Icon name={item.icon} /></span><span className="flex-1">{item.label}</span>{item.badge ? <span className="rounded-full bg-triage-red px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">{item.badge}</span> : null}</Link>)}</nav>
        {user && <button type="button" onClick={() => void handleLogout()} disabled={loggingOut} className="premium-logout mx-3 mb-4 flex min-h-[44px] items-center gap-3 rounded-xl border border-[#D8E2D3] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] px-3 py-2.5 text-left text-sm font-semibold text-ink-secondary shadow-[0_5px_14px_rgba(24,38,25,0.05)] transition-all duration-200 hover:border-[#E6B2A8] hover:bg-[#FFF6F3] hover:text-emergency-red hover:shadow-[0_10px_20px_rgba(192,67,43,0.1)] disabled:cursor-wait disabled:opacity-60"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-faint shadow-sm"><Icon name="logout" /></span>{loggingOut ? "Logging out..." : "Log out"}</button>}
      </aside>
    </>
  );
}
