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
  const [isCompactNav, setIsCompactNav] = useState(false);
  const [isIconRail, setIsIconRail] = useState(false);

  const currentPath = pathname ?? "/";
  const isAssessmentRoute = pathname === "/assessment";
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
      setIsIconRail(width < 420);
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
      "flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium transition-all duration-200 sm:gap-2.5 sm:px-4 lg:gap-2.5 lg:px-4.5 lg:py-2.5 lg:text-base",
      active
        ? "bg-brand-tint text-brand-dark shadow-sm ring-1 ring-brand/15"
        : "text-ink-secondary hover:bg-card hover:text-ink hover:shadow-sm hover:ring-1 hover:ring-border/80",
    );
  }

  function compactNavItem(href: string, label: string, icon: ReactNode, active?: boolean) {
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "border-brand/20 bg-brand-tint text-brand-dark shadow-sm"
            : "border-transparent bg-transparent text-ink-secondary hover:border-border hover:bg-card hover:text-ink",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            active ? "bg-white text-brand-dark shadow-sm" : "bg-surface text-ink-faint group-hover:text-ink",
          )}
        >
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    );
  }

  const isHomeRoute = currentPath === "/";

  if (isHomeRoute && isCompactNav) {
    const compactItems = [
      { href: "/", label: "Home", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9.5Z" /></svg>, active: isHomeRoute },
      { href: "/assessment", label: "Assessment", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 12h6M9 17h4M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /></svg>, active: isAssessmentRoute },
    ];

    const compactRailItems = (
      <>
        {compactItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center justify-center rounded-xl border p-2.5 transition-all duration-200",
              item.active
                ? "border-brand/20 bg-brand-tint text-brand-dark shadow-sm"
                : "border-transparent bg-transparent text-ink-secondary hover:border-border hover:bg-card hover:text-ink",
            )}
            aria-label={item.label}
            title={item.label}
          >
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", item.active ? "bg-white text-brand-dark shadow-sm" : "bg-surface text-ink-faint group-hover:text-ink")}>
              {item.icon}
            </span>
          </Link>
        ))}

        {!authReady ? (
          <div className="h-10 w-10 animate-pulse rounded-xl bg-card" aria-label="Loading user menu" />
        ) : user ? (
          <>
            {compactNavItem("/history", uiText.history, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, isHistoryRoute)}
            {compactNavItem("/profile", uiText.profile, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0M12 12a4 4 0 100-8 4 4 0 000 8z" /></svg>, isProfileRoute)}
            <button type="button" onClick={handleLogout} aria-label={uiText.logout} title={uiText.logout} className="group flex items-center justify-center rounded-xl border border-border bg-card p-2.5 transition-all duration-200 hover:border-brand/30 hover:bg-brand-tint hover:text-brand-dark hover:shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface text-ink-faint transition-colors group-hover:text-brand-dark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg></span>
            </button>
          </>
        ) : (
          <>
            {compactNavItem("/login", uiText.login, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5M15 12H3" /></svg>, isLoginRoute)}
            {compactNavItem("/register", uiText.signup, <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" /></svg>, isRegisterRoute)}
          </>
        )}
      </>
    );

    return (
      <aside className={cn("fixed left-0 top-0 z-40 flex h-screen flex-col items-center gap-3 border-r border-border bg-[linear-gradient(180deg,#FBF9F2_0%,#F4F7F1_100%)] px-3 py-5 shadow-[8px_0_24px_rgba(20,31,25,0.06)] backdrop-blur-xl", isIconRail ? "w-16" : "w-20")}>
        <Link href="/" className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-brand to-brand-dark text-lg text-brand-foreground shadow-sm" style={{ fontFamily: "var(--font-display)" }} aria-label="HealthGuard home" title="HealthGuard home">H</Link>
        <nav className="flex w-full flex-col items-center gap-2">{compactRailItems}</nav>
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