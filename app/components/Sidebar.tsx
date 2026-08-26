"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/app/components/ui/primitives";
import type { User } from "@/lib/api";

// Minimal inline icons so this file has no dependency on your icons.tsx
// contents (which I haven't seen). Swap these for real entries in
// icons.tsx — e.g. IconUsers, IconLexicon, IconRules, IconReports — if
// those already exist, to keep one icon source of truth.
function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const icons = {
  overview: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  lexicon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z",
  rules: "m9 12 2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138Z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.15-1.5l2.02-1.58-2-3.46-2.38.96a7.5 7.5 0 0 0-1.3-.75L15.2 3h-4l-.39 2.67a7.5 7.5 0 0 0-1.3.75l-2.38-.96-2 3.46L7.15 10.5A7.4 7.4 0 0 0 7 12a7.4 7.4 0 0 0 .15 1.5l-2.02 1.58 2 3.46 2.38-.96c.4.31.84.56 1.3.75L11.2 21h4l.39-2.67c.46-.19.9-.44 1.3-.75l2.38.96 2-3.46-2.02-1.58c.1-.49.15-.99.15-1.5Z",
  records: "M8 2h8l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 0v5h5M8 13h8M8 17h5",
  reports: "M3 3v18h18M7 15l3-4 3 3 5-7",
};

type NavItem = { href: string; label: string; icon: keyof typeof icons };

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/lexicon", label: "Lexicon", icon: "lexicon" },
  { href: "/admin/rules", label: "Triage Rules", icon: "rules" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

const MHO_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/records", label: "Assessment Records", icon: "records" },
  { href: "/dashboard/reports", label: "Analytics & Reports", icon: "reports" },
];

export default function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = user.role === "admin" ? ADMIN_ITEMS : MHO_ITEMS;
  const roleLabel = user.role === "admin" ? "Administrator" : "Municipal Health Officer";

  function isActive(href: string) {
    return href === pathname || (href !== "/admin" && href !== "/dashboard" && pathname.startsWith(href));
  }

  const content: ReactNode = (
    <>
      <div className="border-b border-border px-5 py-6">
        <p className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">{roleLabel}</p>
        <p className="mt-1 truncate font-display text-lg font-semibold text-ink">{user.full_name}</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand/10 text-brand-dark"
                  : "text-ink-secondary hover:bg-brand-tint hover:text-brand-dark",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  active ? "bg-brand text-brand-foreground" : "bg-surface text-ink-faint",
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
          HealthGuard AI — Irosin, Sorsogon
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: persistent rail */}
      <aside className="sticky top-[var(--header-h,72px)] hidden h-[calc(100vh-var(--header-h,72px))] w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {content}
      </aside>

      {/* Mobile: toggle + drawer */}
      <div className="border-b border-border bg-surface px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex min-h-[44px] items-center gap-2 rounded-sm border border-border px-4 text-sm font-medium text-ink-secondary"
        >
          <Icon path={icons.overview} />
          {mobileOpen ? "Close menu" : "Menu"}
        </button>
      </div>
      {mobileOpen && (
        <div className="flex flex-col border-b border-border bg-surface md:hidden">{content}</div>
      )}
    </>
  );
}