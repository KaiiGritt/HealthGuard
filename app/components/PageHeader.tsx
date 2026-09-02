"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/app/components/ui/primitives";
import { useInterfaceLanguage } from "@/app/components/LanguageProvider";
import { getMe, logout, type User } from "@/lib/api";
import Sidebar from "./Sidebar";

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

function MobileMenuIcon({ type }: { type: "home" | "history" | "dashboard" | "profile" | "login" | "signup" | "logout" }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    className: "h-4 w-4",
  } as const;

  switch (type) {
    case "home":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "history":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 18V8m8 10V4m8 14v-7" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0 1 14 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        </svg>
      );
    case "login":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 16 5 11l5-5M5 11h11a5 5 0 0 1 0 10h-1" />
        </svg>
      );
    case "signup":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      );
    case "logout":
      return (
        <svg {...commonProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
    default:
      return null;
  }
}

export default function PageHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useInterfaceLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCompactNav, setIsCompactNav] = useState(false);

  const currentPath = pathname ?? "/";
  const isHistoryRoute = pathname === "/history";
  const isProfileRoute = pathname === "/profile";
  const isLoginRoute = pathname === "/login";
  const isRegisterRoute = pathname === "/register";

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
    const onResize = () => {
      const width = window.innerWidth;
      setIsCompactNav(width < 768);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
      "flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-brand/20 sm:gap-2.5 sm:px-4 lg:gap-2.5 lg:px-4.5 lg:py-2.5 lg:text-base",
      active
        ? "bg-brand-tint text-brand-dark shadow-sm ring-1 ring-brand/15"
        : "text-ink-secondary hover:bg-card hover:text-ink hover:shadow-sm hover:ring-1 hover:ring-border/80",
    );
  }

  const isHomeRoute = currentPath === "/";

  const mobileMenuItems = !authReady
    ? [
        { href: "/", label: "Home", active: isHomeRoute, icon: "home" as const },
        { href: "/login", label: uiText.login, active: isLoginRoute, icon: "login" as const },
        { href: "/register", label: uiText.signup, active: isRegisterRoute, icon: "signup" as const },
      ]
    : user
      ? [
          { href: "/", label: "Home", active: isHomeRoute, icon: "home" as const },
          ...(user.role === "mho" ? [{ href: "/dashboard", label: uiText.dashboard, active: pathname === "/dashboard", icon: "dashboard" as const }] : []),
          ...(user.role === "admin" ? [{ href: "/admin", label: "Admin", active: pathname === "/admin", icon: "dashboard" as const }] : []),
          { href: "/history", label: uiText.history, active: isHistoryRoute, icon: "history" as const },
          { href: "/profile", label: uiText.profile, active: isProfileRoute, icon: "profile" as const },
        ]
      : [
          { href: "/", label: "Home", active: isHomeRoute, icon: "home" as const },
          { href: "/login", label: uiText.login, active: isLoginRoute, icon: "login" as const },
          { href: "/register", label: uiText.signup, active: isRegisterRoute, icon: "signup" as const },
        ];

  return <Sidebar user={user} />;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-header/90 backdrop-blur-xl">
      <div className="relative mx-auto grid w-full max-w-[1800px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-5 2xl:px-16">
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

        {!isCompactNav ? (
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
                    {user?.full_name.split(" ")[0]}
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3" />
                      </svg>
                    </IconWrapper>
                    {uiText.login}
                  </Link>
                  <Link href="/register" className={linkClass("/register")}>
                    <IconWrapper>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </IconWrapper>
                    {uiText.signup}
                  </Link>
                </>
              )}
            </nav>
          </div>
        ) : (
          <div className="col-start-3 justify-self-end">
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-ink-secondary shadow-sm outline-none transition hover:border-brand/30 hover:text-ink focus-visible:ring-4 focus-visible:ring-brand/20"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        )}
      </div>

      {isCompactNav && mobileMenuOpen && (
        <>
          <button type="button" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden" />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[min(84vw,320px)] flex-col border-r border-border bg-header p-4 shadow-[0_18px_48px_rgba(20,31,25,0.2)] md:hidden">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Navigation</span>
              <button type="button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-secondary outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col gap-2 pt-4">
            {mobileMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-brand/20",
                  item.active
                    ? "border-brand/20 bg-brand-tint text-brand-dark shadow-sm"
                    : "border-transparent bg-card text-ink-secondary hover:border-border hover:text-ink",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-current">
                  <MobileMenuIcon type={item.icon} />
                </span>
                <span>{item.label}</span>
              </Link>
            ))}

            {user && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className="mt-1 flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left text-sm font-medium text-ink-secondary transition-all duration-200 hover:border-brand/30 hover:text-ink"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-current">
                  <MobileMenuIcon type="logout" />
                </span>
                <span>{uiText.logout}</span>
              </button>
            )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}