"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function ResponsiveSidebarContent({ user, dashboardAlertCount = 0 }: { user: User | null; dashboardAlertCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const items: Item[] = user
    ? [
        ...(user.role === "mho"
          ? [
              { href: "/dashboard", label: "Dashboard", icon: "dashboard" as const },
              { href: "/dashboard?section=records", label: "Assessment records", icon: "history" as const },
              { href: "/dashboard?section=analytics", label: "Analytics", icon: "dashboard" as const },
              { href: "/dashboard?section=reports", label: "Reports", icon: "dashboard" as const },
            ]
          : []),
        ...(user.role === "admin"
          ? [
              { href: "/admin#admin-overview", label: "Overview", icon: "dashboard" as const },
              { href: "/admin#admin-users", label: "Users", icon: "profile" as const },
              { href: "/admin#admin-lexicon", label: "Lexicon", icon: "dashboard" as const },
              { href: "/admin#admin-rules", label: "Triage rules", icon: "dashboard" as const },
              { href: "/admin#admin-settings", label: "Settings", icon: "dashboard" as const },
            ]
          : []),
        ...(user.role === "resident" ? [{ href: "/assessment", label: "Assessment", icon: "assessment" as const }, { href: "/history", label: "History", icon: "history" as const }] : []),
        { href: "/profile", label: "Profile", icon: "profile" },
      ]
    : [
        { href: "/", label: "Home", icon: "home" },
        { href: "/login", label: "Log in", icon: "login" },
        { href: "/register", label: "Sign up", icon: "signup" },
      ];

  useEffect(() => {
    if (!user || typeof window === "undefined") {
      setPhotoUrl(null);
      return;
    }
    setPhotoUrl(window.localStorage.getItem(`healthguard-profile-photo-${user.id}`));
  }, [user]);

  const active = (href: string) => {
    const [pathWithHash, queryAndHash] = href.split("?");
    const [path, hash] = pathWithHash.split("#");
    const query = queryAndHash ? new URLSearchParams(queryAndHash) : null;

    if (path === "/dashboard" && query?.has("section")) {
      return pathname === path && (searchParams.get("section") ?? "overview") === query.get("section");
    }

    if (path === "/admin" && hash) {
      return pathname === path && typeof window !== "undefined" && window.location.hash === `#${hash}`;
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
        <div className="relative border-b border-[#D7E0D2] px-5 pb-5 pt-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
          <Link href="/" onClick={() => setOpen(false)} className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[linear-gradient(145deg,#2E6A52_0%,#183D2D_100%)] text-lg font-medium text-brand-foreground shadow-[0_8px_18px_rgba(24,61,45,0.2)] ring-1 ring-white/60" style={{ fontFamily: "var(--font-display)" }}>H</span>
            <span className="min-w-0">
              <span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-brand">Irosin health workspace</span>
              <span className="mt-0.5 block text-[1.12rem] font-semibold leading-tight text-ink transition-colors group-hover:text-brand-dark" style={{ fontFamily: "var(--font-display)" }}>HealthGuard</span>
            </span>
          </Link>
          {user ? <div className="relative mt-5 overflow-hidden rounded-[20px] border border-[#315D49] bg-[radial-gradient(circle_at_top_right,_rgba(244,213,141,0.18),_transparent_35%),linear-gradient(135deg,#183D2D_0%,#2E6A52_100%)] px-3.5 py-3.5 text-brand-foreground shadow-[0_12px_24px_rgba(24,61,45,0.16)]"><span className="pointer-events-none absolute -right-8 -top-12 h-28 w-20 rotate-[-28deg] bg-white/10 blur-xl" aria-hidden="true" /><div className="relative flex items-center gap-3"><span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-white/35 bg-white/15 font-display text-lg font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_8px_16px_rgba(8,35,22,0.18)] ring-2 ring-white/10">{photoUrl ? <Image src={photoUrl} alt="" fill sizes="44px" className="object-cover" /> : user.full_name.slice(0, 1).toUpperCase()}<span className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.32)_0%,rgba(255,255,255,0.08)_24%,transparent_48%)]" aria-hidden="true" /><span className="absolute bottom-[-2px] right-[-2px] h-3 w-3 rounded-full border-2 border-[#24523E] bg-[#F4D58D] shadow-[0_0_0_2px_rgba(244,213,141,0.18)]" aria-label="Active account" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.full_name}</p><p className="mt-0.5 truncate text-[11px] text-[#D8EFE0]">{user.email}</p></div></div><div className="relative mt-3 flex items-center justify-between border-t border-white/15 pt-2.5"><span className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#D8EFE0]/75">Account access</span><span className="rounded-full border border-[#F4D58D]/40 bg-[#F4D58D]/15 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#F4D58D]">{user.role === "mho" ? "Health officer" : user.role === "admin" ? "Administrator" : "Resident"}</span></div></div> : <p className="mt-5 rounded-2xl border border-brand/10 bg-white/65 px-3.5 py-3 text-xs leading-relaxed text-ink-muted">Bilingual health guidance for the Irosin community.</p>}
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">{user?.role === "mho" && <div className="mb-3 flex items-center justify-between px-3"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Dashboard</span><span className="rounded-full border border-[#cfe0d3] bg-[#eef6f0] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-brand-dark">Live</span></div>}{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("group relative flex min-h-[48px] items-center gap-3 rounded-2xl px-3 py-2.5 text-sm outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-brand/20", active(item.href) ? "bg-[linear-gradient(100deg,#E6F1E5_0%,#F4F8EF_100%)] font-semibold text-brand-dark shadow-[0_6px_16px_rgba(47,107,79,0.08),inset_3px_0_0_var(--color-brand)]" : "text-ink-secondary hover:bg-white/75 hover:text-ink hover:shadow-[0_4px_12px_rgba(24,38,25,0.04)]")}><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200", active(item.href) ? "bg-white/80 text-brand shadow-sm" : "text-ink-faint group-hover:bg-brand-tint group-hover:text-brand-dark")}><Icon name={item.icon} /></span><span className="flex-1">{item.label}</span>{item.badge ? <span className="rounded-full bg-triage-red px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">{item.badge}</span> : null}</Link>)}</nav>
        {user && <button type="button" onClick={() => void handleLogout()} disabled={loggingOut} className="premium-logout mx-3 mb-4 flex min-h-[44px] items-center gap-3 rounded-xl border border-[#D8E2D3] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] px-3 py-2.5 text-left text-sm font-semibold text-ink-secondary shadow-[0_5px_14px_rgba(24,38,25,0.05)] transition-all duration-200 hover:border-[#E6B2A8] hover:bg-[#FFF6F3] hover:text-emergency-red hover:shadow-[0_10px_20px_rgba(192,67,43,0.1)] disabled:cursor-wait disabled:opacity-60"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-faint shadow-sm"><Icon name="logout" /></span>{loggingOut ? "Logging out..." : "Log out"}</button>}
      </aside>
    </>
  );
}

export default function ResponsiveSidebar(props: { user: User | null; dashboardAlertCount?: number }) {
  return (
    <Suspense fallback={null}>
      <ResponsiveSidebarContent {...props} />
    </Suspense>
  );
}
