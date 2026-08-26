import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

/* Shared class strings — one source of truth for form and layout styling */

export const inputClass =
  "min-h-[56px] w-full rounded-lg border-2 border-border bg-card px-5 py-3.5 text-lg text-ink outline-none transition focus:border-brand";

export const selectClass =
  "min-h-[56px] w-full cursor-pointer appearance-none rounded-xl border border-border bg-card px-5 py-3.5 pr-12 text-lg text-ink shadow-[0_2px_8px_rgba(15,23,42,0.04)] outline-none transition hover:border-brand/60 hover:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10";

export const labelClass = "text-base font-semibold leading-snug text-ink";

export const labelHintClass = "font-normal text-ink-muted";

export const formStackClass = "space-y-5";

export const submitButtonClass =
  "flex min-h-[58px] w-full items-center justify-center rounded-sm bg-brand px-6 font-mono text-sm uppercase tracking-[0.04em] font-semibold text-brand-foreground transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60";

/** Shared max-width shell — use the full available space on large screens for better readability */
export const contentShellClass = "mx-auto w-full max-w-[1600px] xl:max-w-[1728px] 2xl:max-w-[1800px]";

export const contentPadClass = "px-5 sm:px-7 lg:px-10 xl:px-14 2xl:px-20";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PageMain({
  children,
  className,
  narrow,
  wide,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  wide?: boolean;
}) {
  return (
    <main
      className={cn(
        contentShellClass,
        contentPadClass,
        "flex-1 py-10 sm:py-12 lg:py-14 xl:py-16",
        narrow && "max-w-5xl xl:max-w-[72rem]",
        wide && "2xl:max-w-[1760px]",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-md border border-border bg-card p-7 sm:p-9 lg:p-11 xl:p-12", className)}>
      {children}
    </section>
  );
}

export function RecordCard({ children, tab, className }: { children: ReactNode; tab: string; className?: string }) {
  return (
    <section
      className={cn(
        "relative rounded-xl border border-border-soft bg-card p-7 pl-11 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-9 sm:pl-12 lg:p-10 lg:pl-14",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute bottom-8 left-4 top-8 w-2 rounded-full sm:left-5"
        style={{
          backgroundImage: "radial-gradient(circle, var(--color-surface-alt) 3px, transparent 3.2px)",
          backgroundSize: "8px 26px",
          backgroundRepeat: "repeat-y",
          boxShadow: "0 0 0 1px var(--color-border) inset",
        }}
      />
      <div className="absolute -top-3 left-10 rounded-t-lg border border-b-0 border-record-tab-border bg-record-tab px-4 py-2 font-mono text-xs uppercase tracking-[0.08em] text-record-tab-text sm:left-11">
        {tab}
      </div>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted xl:text-sm">{children}</p>
  );
}

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl xl:text-[3.25rem]">{children}</h1>
      {subtitle ? (
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-secondary lg:text-xl xl:max-w-4xl xl:text-[1.35rem]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export function HeroBanner({ eyebrow, title, subtitle, actions }: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-md border border-brand-dark bg-brand p-7 text-brand-foreground sm:p-9 xl:p-10 2xl:flex 2xl:items-end 2xl:justify-between 2xl:gap-12">
      <div className="min-w-0 flex-1">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl xl:text-[2.75rem]">{title}</h1>
        {subtitle ? (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-brand-muted sm:text-lg xl:max-w-4xl xl:text-xl">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="mt-6 flex flex-wrap gap-4 2xl:mt-0 2xl:shrink-0">{actions}</div> : null}
    </section>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-14 items-center justify-center rounded-sm bg-brand px-7 text-base font-medium text-brand-foreground transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-14 items-center justify-center rounded-sm bg-brand px-7 text-base font-medium text-brand-foreground transition hover:bg-brand-dark",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-14 items-center justify-center rounded-sm border border-border px-7 text-base font-medium text-ink-secondary transition hover:border-brand/50 hover:bg-brand-tint hover:text-brand-dark",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TagBadge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "neutral" | "staff" }) {
  const tones = {
    brand: "border-brand/30 bg-brand/10 text-brand-dark",
    neutral: "border-border bg-brand-tint text-ink-secondary",
    staff: "bg-ink text-brand-foreground",
  };
  return (
    <span className={cn("inline-flex rounded-sm px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.06em]", tones[tone])}>
      {children}
    </span>
  );
}

export function Toast({ message, tone = "success", onDismiss }: { message: string; tone?: "success" | "error"; onDismiss: () => void }) {
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-4 rounded-md border px-4 py-3 text-sm shadow-lg ${tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-brand/30 bg-brand text-white"}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 font-mono text-xs uppercase tracking-wide opacity-80 hover:opacity-100" aria-label="Dismiss notification">
        Close
      </button>
    </div>
  );
}

export function TriageBadge({ level }: { level: "GREEN" | "YELLOW" | "RED" | string }) {
  const tone =
    level === "RED" || level === "Red"
      ? "bg-triage-red text-[#F9E9E5]"
      : level === "YELLOW" || level === "Yellow"
        ? "bg-triage-yellow text-[#3A2603]"
        : "bg-triage-green text-[#EAF3E2]";

  return (
    <span className={cn("rounded-sm px-3 py-1.5 font-mono text-sm font-medium tracking-wide", tone)}>
      {level}
    </span>
  );
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-emergency-red/30 bg-red-tint px-5 py-4 text-base leading-relaxed text-emergency-red">
      {children}
    </p>
  );
}

export function SuccessAlert({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-brand/30 bg-brand-tint px-5 py-4 text-base leading-relaxed text-brand">{children}</p>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: "brand" | "urgent" | "watch" | "neutral";
}) {
  const accents = {
    brand: "bg-brand/10 text-brand",
    urgent: "bg-red-tint text-emergency-red",
    watch: "bg-yellow-tint text-warn-amber",
    neutral: "bg-surface text-ink-muted",
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition hover:border-brand/30 hover:shadow-[0_8px_24px_rgba(47,107,79,0.08)] xl:p-7 2xl:p-8">
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-sm font-semibold uppercase tracking-wide text-ink-muted xl:text-base">{label}</p>
        {icon ? (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", accents[accent ?? "brand"])}>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-mono text-4xl font-semibold tabular-nums text-ink xl:text-5xl 2xl:text-[3.25rem]">{value}</p>
      {hint ? <p className="mt-3 text-base leading-relaxed text-ink-muted xl:text-lg">{hint}</p> : null}
    </div>
  );
}

export function Panel({ title, subtitle, badge, children, className }: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-6 xl:p-7 2xl:p-8", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl xl:text-[1.65rem]">{title}</h2>
          {subtitle ? <p className="mt-1.5 text-base leading-relaxed text-ink-muted xl:text-lg">{subtitle}</p> : null}
        </div>
        {badge}
      </div>
      <div className="mt-5 xl:mt-6">{children}</div>
    </div>
  );
}

export function ListRow({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-surface p-5 xl:p-6", className)} style={style}>
      {children}
    </div>
  );
}

export function GreenAside({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <aside className="rounded-xl bg-gradient-to-br from-brand-dark to-brand p-7 text-brand-foreground sm:p-9 lg:p-10 xl:p-12">
      <h2 className="font-display text-2xl font-semibold leading-tight xl:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-base leading-relaxed text-brand-muted sm:text-lg xl:text-xl">{subtitle}</p> : null}
      {children}
    </aside>
  );
}

export function AccessGate({
  tag,
  title,
  description,
  hint,
  actionHref,
  actionLabel,
}: {
  tag: string;
  title: string;
  description: string;
  hint?: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <PageMain narrow className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-md border border-border bg-card p-9 text-center">
        <TagBadge tone="staff">{tag}</TagBadge>
        <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-ink xl:text-4xl">{title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-secondary">{description}</p>
        {hint ? <p className="mt-3 font-mono text-base text-ink-muted">{hint}</p> : null}
        <PrimaryLink href={actionHref} className="mt-8">
          {actionLabel}
        </PrimaryLink>
      </div>
    </PageMain>
  );
}

export function IconCircle({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-brand/30 text-brand lg:h-12 lg:w-12">
      {children}
    </span>
  );
}


export function stubBorderStyle(color: string) {
  return { borderLeft: `4px solid ${color}` };
}

export function triageColor(level: string) {
  if (level === "RED" || level === "Red") return "#C0432B";
  if (level === "YELLOW" || level === "Yellow") return "#D98A2B";
  return "#3E8E41";
}

export function AuthField({
  id,
  label,
  hint,
  icon,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  children?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {hint ? <span className={labelHintClass}> {hint}</span> : null}
      </label>
      <div className="relative mt-2">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-faint">{icon}</span>
        ) : null}
        {children ?? (
          <input
            id={id}
            type={type}
            autoComplete={autoComplete}
            required={required}
            value={value}
            onChange={onChange}
            className={cn(inputClass, icon ? "pl-12" : undefined)}
          />
        )}
      </div>
    </div>
  );
}

export function AuthCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-8 shadow-[0_4px_24px_rgba(24,38,25,0.06)] sm:p-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Compact professional inputs for auth split-layout pages */
export const authLabelClass = "block text-sm font-medium text-ink-secondary";

export const authInputClass =
  "h-12 w-full rounded-xl border border-border bg-white/90 px-3.75 text-[0.9375rem] text-ink shadow-[0_1px_2px_rgba(15,23,42,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-ink-faint hover:border-brand/50 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10";

export const authSelectClass =
  "h-12 w-full cursor-pointer appearance-none rounded-xl border border-border bg-white/90 px-3.75 pr-10 text-[0.9375rem] text-ink shadow-[0_1px_2px_rgba(15,23,42,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition hover:border-brand/50 hover:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10";

export const authFormStackClass = "space-y-5";

export const authSubmitClass =
  "flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-dark px-4 text-sm font-semibold text-brand-foreground shadow-[0_12px_24px_rgba(47,107,79,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(47,107,79,0.22)] disabled:cursor-not-allowed disabled:opacity-60";

export function AuthProField({
  id,
  label,
  hint,
  type = "text",
  value,
  onChange,
  autoComplete,
  required,
  placeholder,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={authLabelClass}>
        {label}
        {hint ? <span className="ml-1 font-normal text-ink-faint">{hint}</span> : null}
      </label>
      <div className="relative mt-2">
        {children ?? (
          <input
            id={id}
            type={type}
            autoComplete={autoComplete}
            required={required}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={cn(authInputClass, "bg-gradient-to-r from-white to-surface/80")}
          />
        )}
      </div>
    </div>
  );
}
