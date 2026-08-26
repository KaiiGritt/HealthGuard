"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    const frame = window.requestAnimationFrame(() => setMobileMenuOpen(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  // Active-state helper: a small addition on top of the original — the tab
  // you're on now gets the tag-green tint instead of every link looking the
  // same regardless of where you are.
  function linkClass(href: string) {
    const active = pathname === href;
    return [
      "flex items-center gap-2 rounded-[3px] px-3.5 py-2.5 text-sm font-medium transition sm:gap-2.5 sm:px-4 lg:gap-2.5 lg:px-4.5 lg:py-2.5 lg:text-base",
      active
        ? "bg-[#2F6B4F]/10 text-[#1F4A36]"
        : "text-[#3F4A3B] hover:bg-[#F1F4EC] hover:text-[#1F4A36]",
    ].join(" ");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#D8DED1] bg-[#FBF9F2]/95 backdrop-blur">
      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-8 sm:py-5 lg:px-12 lg:py-5 2xl:px-16">
        <Link href="/" className="justify-self-start flex items-center gap-2.5 lg:gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-[#2F6B4F] text-lg text-[#F1F4EC] lg:h-11 lg:w-11 lg:text-xl"
            style={{ fontFamily: "var(--font-tag)" }}
          >
            H
          </span>
          <span className="text-lg font-medium text-[#182619] lg:text-xl" style={{ fontFamily: "var(--font-display)" }}>
            HealthGuard <em className="not-italic text-[#2F6B4F]">AI</em>
          </span>
        </Link>

        <div className="col-start-3 justify-self-end flex items-center gap-3 lg:gap-4">
          <nav className="hidden items-center gap-1.5 md:flex lg:gap-2">
            {pathname !== "/" && user?.role === "resident" && <Link href="/assessment" className={linkClass("/assessment")}>
              <IconWrapper>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l4 4h5a2 2 0 012 2v10a2 2 0 01-2 2z" />
                </svg>
              </IconWrapper>
              Assessment
            </Link>}
            {pathname !== "/" && user?.role === "resident" && <Link href="/history" className={linkClass("/history")}>
              <IconWrapper>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </IconWrapper>
              History
            </Link>}

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

            {loaded && user ? (
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
                  className="rounded-[3px] border border-[#D8DED1] px-3 py-2 text-sm font-medium text-[#3F4A3B] transition hover:border-[#2F6B4F]/50 hover:text-[#1F4A36] lg:px-4 lg:py-2.5 lg:text-base"
                >
                  Log out
                </button>
              </>
            ) : loaded ? (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h12" />
                    </svg>
                  </IconWrapper>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-[3px] bg-[#2F6B4F] px-3 py-2 text-sm font-medium text-[#F1F4EC] transition hover:bg-[#1F4A36] lg:gap-2.5 lg:px-5 lg:py-2.5 lg:text-base"
                >
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </IconWrapper>
                  Sign up
                </Link>
              </>
            ) : null}
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[3px] border border-[#D8DED1] text-[#3F4A3B] md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-[#D8DED1] bg-[#FBF9F2] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {user?.role === "resident" && <Link href="/assessment" className={linkClass("/assessment")}>
              <IconWrapper>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V6a2 2 0 012-2h5l4 4h5a2 2 0 012 2v10a2 2 0 01-2 2z" />
                </svg>
              </IconWrapper>
              Assessment
            </Link>}
            {user?.role === "resident" && <Link href="/history" className={linkClass("/history")}>
              <IconWrapper>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </IconWrapper>
              History
            </Link>}
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
            {loaded && user ? (
              <>
                <Link href="/profile" className={linkClass("/profile")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0114 0M12 12a4 4 0 100-8 4 4 0 000 8z" />
                    </svg>
                  </IconWrapper>
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-[3px] border border-[#D8DED1] px-3 py-2 text-left text-sm font-medium text-[#3F4A3B]"
                >
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5m0 0l-5-5m5 5H9" />
                    </svg>
                  </IconWrapper>
                  Log out
                </button>
              </>
            ) : loaded ? (
              <>
                <Link href="/login" className={linkClass("/login")}>
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h12" />
                    </svg>
                  </IconWrapper>
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-[3px] bg-[#2F6B4F] px-3 py-2 text-sm font-medium text-[#F1F4EC]"
                >
                  <IconWrapper>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 lg:h-5 lg:w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                    </svg>
                  </IconWrapper>
                  Sign up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
