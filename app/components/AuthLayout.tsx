import Link from "next/link";
import type { ReactNode } from "react";
import { IconShield } from "@/app/components/ui/icons";
import Sidebar from "./Sidebar";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  /** Optional step label shown above the form title, e.g. "Step 2 of 2" */
  step?: string;
};

export default function AuthLayout({ children, title, subtitle, footer, step }: AuthLayoutProps) {
  return (
    <div className="auth-pro-shell premium-page flex min-h-screen">
      <div className="xl:hidden">
        <Sidebar user={null} showOnTablet />
      </div>
      {/* Brand panel — left on desktop */}
      <aside className="auth-pro-brand relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden lg:flex xl:w-[42%]">
        <div className="auth-pro-brand-grid pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative z-10 p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-3 transition hover:opacity-90">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 font-mono text-xl font-semibold text-white ring-1 ring-white/20">
              H
            </span>
            <span className="font-display text-2xl font-semibold text-white">
              HealthGuard <span className="text-brand-muted"></span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 xl:px-14">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-brand-muted">
            Irosin, Sorsogon · Rural health decision support
          </p>
          <h1 className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.15] text-white xl:text-[2.75rem]">
            Clear guidance when symptoms are hard to read
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/70 xl:text-lg">
            Bilingual assessments for residents and health workers — green, yellow, or red, with one plain next step.
          </p>

          <div className="mt-12 grid max-w-sm grid-cols-3 gap-6 border-t border-white/10 pt-10">
            {[
              { value: "2 min", label: "Average check-in" },
              { value: "EN / TL", label: "Languages" },
              { value: "24/7", label: "Self-service" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-mono text-xl font-semibold tabular-nums text-white">{stat.value}</p>
                <p className="mt-1 text-xs leading-snug text-white/55">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 px-10 pb-10 text-sm text-white/50 xl:px-14 xl:pb-14">
          <IconShield size={15} className="shrink-0 text-brand-muted" />
          <span>Encrypted sessions · Data used only for your assessments</span>
        </div>
      </aside>

      {/* Form panel — right on desktop, full width on mobile */}
      <main className="auth-pro-form flex flex-1 flex-col bg-white/25">
        <div className="relative flex items-center justify-between overflow-hidden border-b border-[#D8E2D3] bg-white/70 px-5 py-4 shadow-[0_8px_20px_rgba(24,38,25,0.04)] backdrop-blur-md lg:hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark font-mono text-lg font-semibold text-brand-foreground shadow-[0_6px_14px_rgba(47,107,79,0.2)]">
              H
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              HealthGuard
            </span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-16">
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-[#dfe8dc] bg-white/85 p-4 shadow-[0_24px_56px_rgba(21,36,28,0.09)] backdrop-blur-sm sm:p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
            {step ? (
              <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">{step}</p>
            ) : null}
            <h2 className={`font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] ${step ? "mt-2" : ""}`}>
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{subtitle}</p>

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-8 border-t border-border pt-6 text-center text-sm text-ink-muted">{footer}</div> : null}
          </div>
        </div>

        <footer className="hidden border-t border-border px-8 py-4 text-center text-xs text-ink-faint lg:block">
          HealthGuard is a decision-support tool — not a substitute for professional medical care.
        </footer>
      </main>
    </div>
  );
}
