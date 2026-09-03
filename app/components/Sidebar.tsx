"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/app/components/ui/primitives";
import type { User } from "@/lib/api";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const icons = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z",
  overview: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  lexicon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z",
  rules: "m9 12 2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138Z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.15-1.5l2.02-1.58-2-3.46-2.38.96a7.5 7.5 0 0 0-1.3-.75L15.2 3h-4l-.39 2.67a7.5 7.5 0 0 0-1.3.75l-2.38-.96-2 3.46L7.15 10.5A7.4 7.4 0 0 0 7 12a7.4 7.4 0 0 0 .15 1.5l-2.02 1.58 2 3.46 2.38-.96c.4.31.84.56 1.3.75L11.2 21h4l.39-2.67c.46-.19.9-.44 1.3-.75l2.38.96 2-3.46-2.02-1.58c.1-.49.15-.99.15-1.5Z",
  records: "M8 2h8l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 0v5h5M8 13h8M8 17h5",
  reports: "M3 3v18h18M7 15l3-4 3 3 5-7",
  login: "M11 16l-4-4m0 0 4-4m-4 4h12",
  signup: "M12 5v14M5 12h14",
};

type NavItem = { href: string; label: string; icon: keyof typeof icons };

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/lexicon", label: "Lexicon", icon: "lexicon" },
  { href: "/admin/rules", label: "Triage rules", icon: "rules" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

const MHO_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/records", label: "Assessment records", icon: "records" },
  { href: "/dashboard/reports", label: "Analytics & reports", icon: "reports" },
];

const PUBLIC_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
];

export default function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const accountItems = user
    ? user.role === "admin"
      ? ADMIN_ITEMS
      : user.role === "mho"
        ? MHO_ITEMS
        : [{ href: "/history", label: "History", icon: "records" as const }]
    : [
        { href: "/login", label: "Log in", icon: "login" as const },
        { href: "/register", label: "Sign up", icon: "signup" as const },
      ];
  const items = user?.role === "mho" || user?.role === "admin" ? accountItems : [...PUBLIC_ITEMS, ...accountItems];
  if (user) items.push({ href: "/profile", label: "Profile", icon: "users" });
  const roleLabel = user?.role === "admin" ? "Administrator" : user?.role === "mho" ? "Municipal Health Officer" : "Resident access";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return href === pathname || pathname.startsWith(`${href}/`);
  }

  const content: ReactNode = (
    <>
      <div className="border-b border-border px-5 py-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-brand to-brand-dark text-base font-medium text-brand-foreground shadow-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            H
          </span>
          <span className="text-[1.05rem] font-medium text-ink" style={{ fontFamily: "var(--font-display)" }}>
            HealthGuard
          </span>
        </Link>

        {user ? <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-medium text-brand-dark">
            {user.full_name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{user.full_name}</p>
            <p className="truncate text-xs text-ink-faint">{roleLabel}</p>
          </div>
        </div> : <p className="mt-5 text-xs leading-relaxed text-ink-muted">Bilingual health guidance for the Irosin community.</p>}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand/20",
                active
                  ? "bg-brand-tint font-semibold text-brand-dark shadow-[inset_3px_0_0_var(--color-brand)]"
                  : "text-ink-secondary hover:bg-card hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center",
                  active ? "text-brand-dark" : "text-ink-faint",
                )}
              >
                <Icon path={icons[item.icon]} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-xs leading-relaxed text-ink-faint">
          Irosin, Sorsogon — community health workspace
        </p>
      </div>
    </>
  );

  return (
    <>
      <button type="button" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)} className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-header text-ink-secondary shadow-[0_8px_18px_rgba(24,38,25,0.1)] outline-none transition-all duration-200 hover:border-brand/30 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand/20 lg:hidden">
        <Icon path={open ? "M6 6l12 12M18 6 6 18" : "M4 6h16M4 12h16M4 18h16"} />
      </button>
      {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] lg:hidden" />}
      <aside className={`fixed left-0 top-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-[#D7E0D2] bg-[linear-gradient(180deg,#FBF9F2_0%,#F2F6EE_100%)] shadow-[0_18px_48px_rgba(20,31,25,0.18)] transition-transform lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
        {content}
      </aside>
    </>
  );
}