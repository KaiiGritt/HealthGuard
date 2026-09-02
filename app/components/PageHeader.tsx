"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/app/components/ui/primitives";
import { useInterfaceLanguage } from "@/app/components/LanguageProvider";
import { getMe, logout, type User } from "@/lib/api";

function IconWrapper({ children }: { children: ReactNode }) {
  return <span className="flex h-5 w-5 items-center justify-center">{children}</span>;
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PageHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useInterfaceLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const uiText = {
    history: language === "fil" ? "Kasaysayan" : language === "both" ? "History / Kasaysayan" : "History",
    dashboard: language === "fil" ? "Dashboard" : language === "both" ? "Dashboard / Dashboard" : "Dashboard",
    profile: language === "fil" ? "Profile" : language === "both" ? "Profile / Profile" : "Profile",
    login: language === "fil" ? "Mag-log in" : language === "both" ? "Log in / Mag-log in" : "Log in",
    signup: language === "fil" ? "Mag-sign up" : language === "both" ? "Sign up / Mag-sign up" : "Sign up",
    logout: language === "fil" ? "Mag-logout" : language === "both" ? "Log out / Mag-logout" : "Log out",
  } as const;

  useEffect(() => {
    let active = true;

    getMe()
      .then((u) => {
        if (!active) return;
        setUser(u);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setAuthReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMobileMenuOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  function linkClass(href: string) {
    const active = pathname === href;
    return cn(
      "flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors sm:gap-2.5 sm:px-4 lg:gap-2.5 lg:px-4.5 lg:py-2.5 lg:text-base",
      active
        ? "bg-brand-tint text-brand-dark"
        : "text-ink-secondary hover:bg-card hover:text-ink",
    );
  }

  if (pathname === "/") {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-header/95 px-4 py-5 backdrop-blur-xl sm:w-64">
        <Link href="/" className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-brand to-brand-dark text-lg text-brand-foreground shadow-sm"
            style={{ fontFamily: "var(--font-display)" }}
          >
            H
          </span>
          <span className="text-lg font-medium text-ink" style={{ fontFamily: "var(--font-display)" }}>
            HealthGuard
          </span>
        </Link>

        <nav className="mt-8 flex flex-col gap-2">
          <Link href="/" className={linkClass("/")}>Home</Link>
          <Link href="/assessment" className={linkClass("/assessment")}>Assessment</Link>
          {!authReady ? (
            <div className="h-10 w-full animate-pulse rounded-full bg-card" aria-label="Loading user menu" />
          ) : user ? (
            <>
              <Link href="/history" className={linkClass("/history")}>History</Link>
              <Link href="/profile" className={linkClass("/profile")}>Profile</Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-border bg-card px-3 py-2.5 text-left text-sm font-medium text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink"
              >
                {uiText.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>Login</Link>
              <Link href="/register" className={linkClass("/register")}>Sign up</Link>
            </>
          )}
        </nav>
      </aside>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-header/90 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-5 2xl:px-16">
        <Link href="/" className="justify-self-start flex items-center gap-2.5 lg:gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-brand to-brand-dark text-lg text-brand-foreground shadow-sm lg:h-11 lg:w-11 lg:text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            H
          </span>
          <span className="text-lg font-medium text-ink lg:text-xl" style={{ fontFamily: "var(--font-display)" }}>
            HealthGuard
          </span>
        </Link>

        <div className="col-start-3 justify-self-end flex items-center gap-3 lg:gap-4">
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1.5 md:flex lg:gap-1.5">
            {pathname !== "/" && user?.role === "resident" && (
              <Link href="/history" className={linkClass("/history")}>
                <IconWrapper>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </IconWrapper>
                {uiText.history}
              </Link>
            )}

            {user?.role === "mho" && (
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                <IconWrapper>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15V9m5 6V5m5 10v-4" />
                  </svg>
                </IconWrapper>
                Dashboard
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin" className={linkClass("/admin")}>
                <IconWrapper>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 0114 0" />
                  </svg>
                </IconWrapper>
                Admin
              </Link>
            )}

            {!authReady ? (
              <div className="h-10 w-28 animate-pulse rounded-full bg-card" aria-label="Loading user menu" />
            ) : user ? (
              <>
                <Link href="/profile" className={linkClass("/profile")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0M12 12a4 4 0 100-8 4 4 0 000 8z" />
                    </svg>
                  </IconWrapper>
                  {user.full_name.split(" ")[0]}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:border-brand/40 hover:text-ink lg:px-4 lg:py-2.5 lg:text-base"
                >
                  {uiText.logout}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h12" />
                    </svg>
                  </IconWrapper>
                  {uiText.login}
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-full bg-brand px-3 py-2 text-sm font-medium text-brand-foreground shadow-sm transition-colors hover:bg-brand-dark lg:gap-2.5 lg:px-5 lg:py-2.5 lg:text-base"
                >
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </IconWrapper>
                  {uiText.signup}
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-secondary md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-header px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {user?.role === "resident" && (
              <Link href="/history" className={linkClass("/history")}>
                <IconWrapper>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </IconWrapper>
                {uiText.history}
              </Link>
            )}
            {user?.role === "mho" && (
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                <IconWrapper>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15V9m5 6V5m5 10v-4" />
                  </svg>
                </IconWrapper>
                Dashboard
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin" className={linkClass("/admin")}>
                <IconWrapper>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 100-6 3 3 0 000 6zm-7 8a7 7 0 0114 0" />
                  </svg>
                </IconWrapper>
                Admin
              </Link>
            )}
            {!authReady ? (
              <div className="h-10 w-28 animate-pulse rounded-full bg-card" aria-label="Loading user menu" />
            ) : user ? (
              <>
                <Link href="/profile" className={linkClass("/profile")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0M12 12a4 4 0 100-8 4 4 0 000 8z" />
                    </svg>
                  </IconWrapper>
                  {uiText.profile}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-left text-sm font-medium text-ink-secondary"
                >
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5m0 0l-5-5m5 5H9" />
                    </svg>
                  </IconWrapper>
                  {uiText.logout}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h12" />
                    </svg>
                  </IconWrapper>
                  {uiText.login}
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-full bg-brand px-3 py-2 text-sm font-medium text-brand-foreground"
                >
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </IconWrapper>
                  {uiText.signup}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}