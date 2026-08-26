"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  IconAdmin,
  IconAssessment,
  IconClose,
  IconDashboard,
  IconHistory,
  IconLogin,
  IconLogout,
  IconMenu,
  IconProfile,
  IconSignUp,
} from "@/app/components/ui/icons";
import { cn, contentPadClass, contentShellClass } from "@/app/components/ui/primitives";
import { getMe, logout, type User } from "@/lib/api";

function NavIcon({ children }: { children: ReactNode }) {
  return <span className="flex h-5 w-5 items-center justify-center">{children}</span>;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function PageHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let active = true;
    getMe().then((u) => {
      if (active) {
        setUser(u);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  function linkClass(href: string) {
    const active = pathname === href;
    return cn(
      "group relative flex min-h-[44px] items-center gap-2.5 rounded-sm px-4 py-3 text-base font-medium transition sm:gap-3 sm:px-5 lg:text-lg",
      active ? "text-brand-dark" : "text-ink-secondary hover:text-brand-dark",
    );
  }

  // Small animated underline under the active top-level link — reads as
  // "premium" without introducing a new color or shape language.
  function ActiveIndicator({ href }: { href: string }) {
    if (pathname !== href) return null;
    return (
      <span className="pointer-events-none absolute inset-x-3 -bottom-[1px] h-[2px] rounded-full bg-brand transition-all" />
    );
  }

  const navLinks = (
    <>
      <Link href="/assessment" className={linkClass("/assessment")} onClick={() => setMobileMenuOpen(false)}>
        <NavIcon>
          <IconAssessment size={18} />
        </NavIcon>
        Assessment
        <ActiveIndicator href="/assessment" />
      </Link>
      <Link href="/history" className={linkClass("/history")} onClick={() => setMobileMenuOpen(false)}>
        <NavIcon>
          <IconHistory size={18} />
        </NavIcon>
        History
        <ActiveIndicator href="/history" />
      </Link>
      {user?.role === "mho" && (
        <Link href="/dashboard" className={linkClass("/dashboard")} onClick={() => setMobileMenuOpen(false)}>
          <NavIcon>
            <IconDashboard size={18} />
          </NavIcon>
          Dashboard
          <ActiveIndicator href="/dashboard" />
        </Link>
      )}
      {user?.role === "admin" && (
        <Link href="/admin" className={linkClass("/admin")} onClick={() => setMobileMenuOpen(false)}>
          <NavIcon>
            <IconAdmin size={18} />
          </NavIcon>
          Admin
          <ActiveIndicator href="/admin" />
        </Link>
      )}
    </>
  );

  const authLinks = loaded && user ? (
    <>
      <Link
        href="/profile"
        className={cn(linkClass("/profile"), "!gap-2.5 pl-2.5")}
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint font-mono text-xs font-semibold text-brand-dark">
          {initials(user.full_name)}
        </span>
        {user.full_name.split(" ")[0]}
        <ActiveIndicator href="/profile" />
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-sm border border-border px-4 py-3 text-base font-medium text-ink-secondary transition hover:border-brand/50 hover:text-brand-dark lg:px-5 lg:py-3.5 lg:text-lg"
      >
        <NavIcon>
          <IconLogout size={16} />
        </NavIcon>
        Log out
      </button>
    </>
  ) : loaded ? (
    <>
      <Link href="/login" className={linkClass("/login")} onClick={() => setMobileMenuOpen(false)}>
        <NavIcon>
          <IconLogin size={18} />
        </NavIcon>
        Log in
        <ActiveIndicator href="/login" />
      </Link>
      <Link
        href="/register"
        className="flex items-center gap-2.5 rounded-sm bg-brand px-4 py-3 text-base font-medium text-brand-foreground transition hover:bg-brand-dark lg:gap-3 lg:px-6 lg:py-3.5 lg:text-lg"
        onClick={() => setMobileMenuOpen(false)}
      >
        <NavIcon>
          <IconSignUp size={18} />
        </NavIcon>
        Sign up
      </Link>
    </>
  ) : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-header/95 backdrop-blur transition-shadow",
        scrolled ? "border-border shadow-[0_1px_0_0_var(--tw-shadow-color)] shadow-border/60" : "border-transparent",
      )}
    >
      <div
        className={cn(
          contentShellClass,
          contentPadClass,
          "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 sm:py-5 xl:py-6",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 justify-self-start lg:gap-3" onClick={() => setMobileMenuOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand font-mono text-xl font-semibold text-brand-foreground lg:h-12 lg:w-12 lg:text-2xl">
            H
          </span>
          <span className="font-display text-xl font-semibold text-ink lg:text-2xl xl:text-[1.75rem]">
            HealthGuard <span className="text-brand">AI</span>
          </span>
        </Link>

        <div className="col-start-3 flex items-center gap-3 justify-self-end lg:gap-4 xl:gap-5">
          <nav className="hidden items-center gap-1 md:flex lg:gap-1.5 xl:gap-2">
            {navLinks}
            <span className="mx-1 h-6 w-px bg-border lg:mx-2" aria-hidden="true" />
            {authLinks}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-sm border border-border text-ink-secondary md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <IconClose size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-header px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks}
            {loaded && user ? (
              <>
                <Link href="/profile" className={linkClass("/profile")} onClick={() => setMobileMenuOpen(false)}>
                  <NavIcon>
                    <IconProfile size={18} />
                  </NavIcon>
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-left text-sm font-medium text-ink-secondary"
                >
                  <NavIcon>
                    <IconLogout size={18} />
                  </NavIcon>
                  Log out
                </button>
              </>
            ) : (
              authLinks
            )}
          </div>
        </div>
      )}
    </header>
  );
}