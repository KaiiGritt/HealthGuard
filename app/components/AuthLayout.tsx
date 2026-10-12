import Link from "next/link";
import type { ReactNode } from "react";
import { IconShield } from "@/app/components/ui/icons";
import { BrandLogo } from "./BrandLogo";
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
        <Sidebar user={null} />
      </div>
      {/* Brand panel — left on desktop */}
      <aside className="auth-pro-brand relative hidden w-[44%] shrink-0 flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(72,240,208,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(119,90,244,0.18),_transparent_28%),linear-gradient(135deg,#061b2d_0%,#0c2138_42%,#111d3e_100%)] lg:flex xl:w-[42%]">
        <div className="auth-pro-brand-grid pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative z-10 p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-3 transition hover:opacity-90">
            <BrandLogo compact dark />
            <span className="brand-wordmark brand-wordmark--tight text-2xl text-white">
              <span className="text-white">Health</span>
              <span className="text-brand-muted">Guard</span>
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
        <div className="lg:hidden" aria-hidden="true">
          <div className="sr-only">Mobile brand bar hidden</div>
        </div>

        <div className="flex flex-1 flex-col items-center px-4 py-6 sm:justify-center sm:px-8 sm:py-10 lg:px-12 xl:px-16">
          <div className="relative w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#dfe8dc] bg-white/85 p-4 shadow-[0_24px_56px_rgba(21,36,28,0.09)] backdrop-blur-sm sm:rounded-[28px] sm:p-6 xl:max-w-[560px]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
            {step ? (
              <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-brand">{step}</p>
            ) : null}
            <h2 className={`font-display text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem] ${step ? "mt-2" : ""}`}>
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{subtitle}</p>

            <div className="mt-6 sm:mt-8">{children}</div>

            {footer ? <div className="mt-6 border-t border-border pt-5 text-center text-sm text-ink-muted sm:mt-8 sm:pt-6">{footer}</div> : null}
          </div>
        </div>

        <footer className="hidden border-t border-border px-8 py-4 text-center text-xs text-ink-faint lg:block">
          HealthGuard is a decision-support tool — not a substitute for professional medical care.
        </footer>
      </main>
    </div>
  );
}
