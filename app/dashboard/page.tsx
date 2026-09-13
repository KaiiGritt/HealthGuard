"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import Disclaimer from "../components/Disclaimer";
import PageHeader from "../components/PageHeader";
import {
  AccessGate,
  cn,
  HeroBanner,
  ListRow,
  PageMain,
  Panel,
  PremiumSelect,
  PrimaryButton,
  StatCard,
  TagBadge,
  Toast,
  TriageBadge,
} from "@/app/components/ui/primitives";
import { formatAssessmentRecordNumber, getDashboardSummary, getMe, getMhoLexicon, markLexiconReviewed, rejectLexiconEntry, type AdminModuleLexiconEntry, type User } from "@/lib/api";
import { downloadReport } from "@/lib/report";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "records", label: "Assessment records" },
  { id: "analytics", label: "Analytics" },
  { id: "reports", label: "Reports" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type UserRole = "resident" | "mho" | "admin";
type DashboardState = Awaited<ReturnType<typeof getDashboardSummary>>;
type InsightTone = "neutral" | "positive" | "watch" | "urgent";

const ASSESSMENT_PAGE_SIZE = 5;
const RECENT_ASSESSMENT_PAGE_SIZE = 3;

function insightToneLabel(tone: InsightTone) {
  const labels: Record<InsightTone, string> = {
    neutral: "Operational update",
    positive: "Positive indicator",
    watch: "Follow-up required",
    urgent: "Urgent action",
  };
  return labels[tone];
}

// ---------------------------------------------------------------------------
// Widget system — new for this pass. Local to this file since I don't have
// components/icons.tsx or the internals of Panel/StatCard to extend instead.
// If you like this direction, these are good candidates to promote into
// shared components (WidgetCard and DonutChart especially — both are
// generic enough to reuse on the Admin dashboard too).
// ---------------------------------------------------------------------------

function WidgetIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

const widgetIcons = {
  alert: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
  pie: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  trend: "M22 7 13.5 15.5l-5-5L2 18M22 7h-6M22 7v6",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z",
  map: "M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3Zm0 0V7m6 13V7",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  bulb: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.75V17h8v-2.25A7 7 0 0 0 12 2Z",
} as const;

// Generic card shell: icon + title + optional right-side control, a content
// area, and an optional "Updated ..." footer. Every Overview widget below
// uses this instead of Panel, so the tab reads as one coherent system.
function WidgetCard({
  icon,
  title,
  subtitle,
  action,
  updated,
  urgent,
  children,
}: {
  icon: keyof typeof widgetIcons;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  updated?: string;
  urgent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[24px] border border-[#e1e7dc] bg-white/95 shadow-[0_18px_40px_rgba(17,39,28,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(17,39,28,0.08)]",
        urgent ? "border-red-200/80" : "border-[#e3e9df]",
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              urgent ? "bg-triage-red/10 text-emergency-red" : "bg-brand/10 text-brand-dark",
            )}
          >
            <WidgetIcon path={widgetIcons[icon]} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-ink lg:text-lg">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
      {updated && (
        <div className="border-t border-border/60 px-5 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Updated {updated}</p>
        </div>
      )}
    </div>
  );
}

function DonutChart({
  segments,
  centerLabel,
  centerSub,
  size = 128,
  strokeWidth = 14,
}: {
  segments: { value: number; label: string; colorClass: string; dotClass: string }[];
  centerLabel: string;
  centerSub?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const total = Math.max(segments.reduce((sum, s) => sum + s.value, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLayout = segments.reduce(
    (acc, seg) => {
      const dash = (seg.value / total) * circumference;
      const offset = acc.current;
      acc.current += dash;
      acc.items.push({ ...seg, dash, offset });
      return acc;
    },
    { current: 0, items: [] as Array<{ label: string; value: number; colorClass: string; dotClass: string; dash: number; offset: number }> },
  ).items;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
      <div className="relative shrink-0 rounded-full bg-[radial-gradient(circle,#ffffff_55%,#edf5eb_100%)] p-1 shadow-[0_14px_32px_rgba(24,38,25,0.12)] ring-1 ring-brand/10" style={{ width: size, height: size }}>
        <div className="absolute inset-[25px] rounded-full bg-[radial-gradient(circle_at_35%_25%,#ffffff_0%,#f4f9f2_72%,#e7f0e5_100%)] shadow-[inset_0_1px_4px_rgba(24,38,25,0.1),0_0_0_1px_rgba(47,107,79,0.08)]" aria-hidden="true" />
        <svg viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" role="img" aria-label={`${centerLabel} total cases by triage risk`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
          {segmentLayout.map((seg) => (
            <circle key={seg.label} cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeDasharray={`${seg.dash} ${circumference - seg.dash}`} strokeDashoffset={-seg.offset} className={cn(seg.colorClass, "transition-all duration-500")} />
          ))}
        </svg>
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
          <p className="font-mono text-2xl font-semibold tracking-tight text-ink">{centerLabel}</p>
          {centerSub && <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-muted">{centerSub}</p>}
        </div>
      </div>
      <div className="w-full space-y-2 sm:max-w-[220px]">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between gap-3 rounded-xl border border-border-soft bg-surface-alt/70 px-3 py-2 text-sm transition-colors hover:bg-brand-tint/40">
            <span className="flex items-center gap-2 font-medium text-ink-secondary"><span className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.7)]", seg.dotClass)} />{seg.label}</span>
            <span className="font-mono text-sm font-semibold text-ink">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function TrendSparkline({ data }: { data: DashboardState["weekly_trend"] }) {
  const [timeframe, setTimeframe] = useState<"4" | "8" | "all">("all");
  if (!data || data.length === 0) return null;
  const trendData = timeframe === "4" ? data.slice(-4) : timeframe === "8" ? data.slice(-8) : data;
  const max = Math.max(...trendData.map((d) => d.count), 1);
  const w = 320;
  const h = 100;
  const step = trendData.length > 1 ? w / (trendData.length - 1) : 0;
  const points = trendData.map((d, i) => {
    const x = i * step;
    const y = h - (d.count / max) * (h - 20) - 10;
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
  const last = trendData[trendData.length - 1];
  const prev = trendData.length > 1 ? trendData[trendData.length - 2] : null;
  const delta = prev ? last.count - prev.count : 0;
  const totalCases = trendData.reduce((sum, week) => sum + week.count, 0);
  const averageCases = totalCases / trendData.length;
  const peakWeek = trendData.reduce((peak, week) => week.count > peak.count ? week : peak, trendData[0]);
  const direction = delta > 0 ? "Rising" : delta < 0 ? "Cooling" : "Stable";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand/15 bg-[radial-gradient(circle_at_top_right,_rgba(244,213,141,0.16),_transparent_32%),linear-gradient(145deg,#f8fbf6_0%,#ffffff_58%,#f1f7ef_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(31,74,54,0.05)]">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-dark">Eight-week momentum</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-mono text-3xl font-semibold tracking-tight text-ink">{last.count}</p>
              <p className="text-xs text-ink-muted">cases this week</p>
            </div>
          </div>
          {prev && <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${delta > 0 ? "border-red-200 bg-red-50 text-emergency-red" : delta < 0 ? "border-brand/20 bg-brand-tint text-brand-dark" : "border-border-soft bg-white text-ink-muted"}`}>{delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} vs last week`}</span>}
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full overflow-visible text-brand" preserveAspectRatio="none" role="img" aria-label="Eight-week assessment trend">
          <defs>
            <linearGradient id="trendAreaFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
            <filter id="trendGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {[25, 50, 75].map((line) => <line key={line} x1="0" x2={w} y1={line} y2={line} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />)}
          <path d={areaPath} fill="url(#trendAreaFill)" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#trendGlow)" />
          {points.map((point, index) => <circle key={trendData[index].date} cx={point.x} cy={point.y} r={index === points.length - 1 ? 5 : 2.5} fill="white" stroke="currentColor" strokeWidth={index === points.length - 1 ? 2.5 : 1.5} vectorEffect="non-scaling-stroke" />)}
        </svg>
      </div>
      <div className="border-t border-border-soft pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">View timeframe</p>
          <div className="flex rounded-xl border border-border-soft bg-surface/70 p-1" role="group" aria-label="Case volume timeframe">
            {([{ value: "4", label: "4 weeks" }, { value: "8", label: "8 weeks" }, { value: "all", label: "All data" }] as const).map((option) => <button key={option.value} type="button" onClick={() => setTimeframe(option.value)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${timeframe === option.value ? "bg-brand text-brand-foreground shadow-sm" : "text-ink-muted hover:bg-white hover:text-ink"}`}>{option.label}</button>)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-brand/15 bg-brand-tint/55 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">Total cases</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{totalCases}</p></div>
          <div className="rounded-xl border border-border-soft bg-surface/60 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">Weekly average</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{averageCases.toFixed(1)}</p></div>
          <div className="rounded-xl border border-border-soft bg-surface/60 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">Peak week</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{peakWeek.count}</p></div>
          <div className={`rounded-xl border px-3 py-2.5 ${direction === "Rising" ? "border-red-200 bg-red-50" : direction === "Cooling" ? "border-brand/15 bg-brand-tint/50" : "border-border-soft bg-surface/60"}`}><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">Direction</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{direction}</p></div>
        </div>
      </div>
    </div>
  );
}

function RiskBreakdownBar({
  green,
  yellow,
  red,
}: {
  green: number;
  yellow: number;
  red: number;
}) {
  const total = Math.max(green + yellow + red, 1);
  const rows = [
    { label: "Green", value: green, color: "bg-triage-green", dot: "bg-triage-green" },
    { label: "Yellow", value: yellow, color: "bg-triage-yellow", dot: "bg-triage-yellow" },
    { label: "Red", value: red, color: "bg-triage-red", dot: "bg-triage-red" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex h-3 overflow-hidden rounded-full bg-surface">
        {rows.map((row) => (
          <span
            key={row.label}
            className={`${row.color} h-full transition-all duration-500`}
            style={{ width: `${(row.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span className={`h-2 w-2 rounded-full ${row.dot}`} />
              {row.label}
            </span>
            <span className="font-medium text-ink">
              {row.value} <span className="text-ink-muted">({Math.round((row.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarangayRanking({ data }: { data: DashboardState["barangay_stats"] }) {
  const sorted = [...data].sort((a, b) => b.urgent - a.urgent || b.total - a.total);
  const max = Math.max(...sorted.map((item) => item.total), 1);
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visibleRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  const getSeverity = (urgent: number, total: number) => {
    if (urgent > 0 && total > 0) {
      return { label: "High risk", tone: "text-emergency-red border-red-200 bg-red-50", bar: "bg-triage-red" };
    }
    if (total > 0) {
      return { label: "Monitor", tone: "text-amber-700 border-yellow-200 bg-yellow-50", bar: "bg-triage-yellow" };
    }
    return { label: "Stable", tone: "text-emerald-700 border-emerald-200 bg-emerald-50", bar: "bg-triage-green" };
  };

  return (
    <div className="space-y-3">
      {visibleRows.map((item, index) => {
        const percentage = (item.total / max) * 100;
        const severity = getSeverity(item.urgent, item.total);
        const rank = (page - 1) * pageSize + index + 1;

        return (
          <div
            key={item.barangay}
            className="group relative overflow-hidden rounded-[22px] border border-[#e4e9df] bg-[linear-gradient(180deg,#ffffff_0%,#f9faf5_100%)] p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_34px_rgba(31,74,54,0.1)]"
          >
            <span className="pointer-events-none absolute -right-10 -top-12 h-28 w-20 rotate-[-28deg] bg-white/70 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border font-mono text-xs font-bold shadow-sm", rank === 1 ? "border-[#ead79b] bg-[#fff8dc] text-[#927324]" : "border-brand/10 bg-brand/10 text-brand-dark")}>
                  {rank}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{item.barangay}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    {item.total} total • {item.follow_up} follow-up
                  </p>
                </div>
              </div>

              <span className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm ${severity.tone}`}>
                {severity.label}
              </span>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                <span>Coverage</span>
                <span>{Math.round(percentage)}%</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full border border-white bg-slate-100 shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent" />
                <div
                  className={`relative h-full rounded-full shadow-[0_1px_4px_rgba(24,38,25,0.16)] ${severity.bar} transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, 8)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2">
                <div className="font-mono text-base font-semibold text-ink">{item.total}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">Total</div>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/80 px-2 py-2">
                <div className="font-mono text-base font-semibold text-emergency-red">{item.urgent}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-emergency-red/80">Urgent</div>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-2 py-2">
                <div className="font-mono text-base font-semibold text-amber-700">{item.follow_up}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-amber-700/80">Follow-up</div>
              </div>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-soft bg-surface/60 p-5 text-sm text-ink-muted">No barangay data available.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} disabled={page === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="min-w-14 text-center font-mono text-[10px] text-ink-muted">{page} / {pageCount}</span>
            <button type="button" onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))} disabled={page === pageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChips({
  onUrgentOnly,
  onClear,
}: {
  onUrgentOnly: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onUrgentOnly}
        className="rounded-sm border border-red-200 bg-red-tint px-3 py-2 text-sm font-medium text-emergency-red transition hover:bg-red-100"
      >
        Urgent only
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-sm border border-border bg-white px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark"
      >
        Clear filters
      </button>
    </div>
  );
}

function FilterToolbar({
  riskFilter,
  setRiskFilter,
  barangayFilter,
  setBarangayFilter,
  barangayOptions,
  searchTerm,
  setSearchTerm,
  onUrgentOnly,
  onClear,
}: {
  riskFilter: string;
  setRiskFilter: (v: string) => void;
  barangayFilter: string;
  setBarangayFilter: (v: string) => void;
  barangayOptions: string[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onUrgentOnly: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <PremiumSelect
          value={riskFilter}
          onChange={setRiskFilter}
          ariaLabel="Filter assessment records by risk level"
          options={[
            { value: "all", label: "All risk levels" },
            { value: "GREEN", label: "Green" },
            { value: "YELLOW", label: "Yellow" },
            { value: "RED", label: "Red" },
          ]}
        />
        <PremiumSelect
          value={barangayFilter}
          onChange={setBarangayFilter}
          ariaLabel="Filter assessment records by barangay"
          options={[
            { value: "all", label: "All barangays" },
            ...barangayOptions.map((barangay) => ({ value: barangay, label: barangay })),
          ]}
        />
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <SearchIcon />
          </span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search resident or note"
            className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 pl-9 text-sm text-ink outline-none transition focus:border-brand"
          />
        </div>
      </div>
      <FilterChips onUrgentOnly={onUrgentOnly} onClear={onClear} />
    </div>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardState | null>(null);
  const [lexiconEntries, setLexiconEntries] = useState<AdminModuleLexiconEntry[]>([]);
  const [reviewingLexicon, setReviewingLexicon] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [assessmentPage, setAssessmentPage] = useState(1);
  const [recentAssessmentPage, setRecentAssessmentPage] = useState(1);
  const requestedSection = searchParams.get("section") as SectionId | null;
  const activeSection: SectionId = requestedSection && SECTIONS.some((section) => section.id === requestedSection)
    ? requestedSection
    : "overview";
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  function setActiveSection(id: SectionId) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "overview") {
      params.delete("section");
    } else {
      params.set("section", id);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function generateReport() {
    if (!stats) return;

    let downloaded: "downloaded" | "opened" | false = false;
    try {
      downloaded = downloadReport({
        title: "Community Health Report",
        subtitle: "Municipal Health Office summary",
        generatedAt: new Date().toLocaleString(),
        filename: `healthguard-community-report-${new Date().toISOString().slice(0, 10)}`,
        sections: [
          {
            heading: "Barangay summary",
            rows: stats.barangay_stats.map((item) => [item.barangay, `${item.total} total (${item.urgent} urgent, ${item.follow_up} follow-up)`]),
          },
          {
            heading: "Risk distribution",
            rows: stats.triage_breakdown.map((item) => [item.level, String(item.value)]),
          },
          {
            heading: "Weekly trend",
            rows: stats.weekly_trend.map((item) => [item.label, `${item.date} • ${item.count} cases`]),
          },
        ],
      });
    } catch {
      downloaded = false;
    }

    setToast({
      message: downloaded === "downloaded" ? "PDF report downloaded successfully." : downloaded === "opened" ? "Report opened in a new tab. Use your browser's Share or Save option." : "Could not create the report.",
      tone: downloaded ? "success" : "error",
    });
  }

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      const [summary, lexicon] = await Promise.all([getDashboardSummary(), getMhoLexicon()]);
      setStats(summary);
      setLexiconEntries(lexicon);
      setLastUpdated(new Date());
      setRefreshError(null);
      setToast({ message: "Dashboard data refreshed.", tone: "success" });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setRefreshError(errorMsg);
      setToast({ message: "Could not refresh dashboard data.", tone: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = await getMe();
        if (!active) return;
        setCurrentUser(user);
        if (user?.role === "mho") {
          const [summary, lexicon] = await Promise.all([getDashboardSummary(), getMhoLexicon()]);
          if (!active) return;
          setStats(summary);
          setLexiconEntries(lexicon);
          setLastUpdated(new Date());
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function reviewLexiconEntry(id: number) {
    setReviewingLexicon(id);
    try {
      const reviewed = await markLexiconReviewed(id);
      setLexiconEntries((entries) => entries.map((entry) => (entry.id === id ? reviewed : entry)));
      setToast({ message: "Lexicon term reviewed.", tone: "success" });
    } catch {
      setToast({ message: "Could not update lexicon review status.", tone: "error" });
    } finally {
      setReviewingLexicon(null);
    }
  }

  async function rejectLexiconEntryForReview(id: number) {
    setReviewingLexicon(id);
    try {
      const rejected = await rejectLexiconEntry(id);
      setLexiconEntries((entries) => entries.map((entry) => (entry.id === id ? rejected : entry)));
      setToast({ message: "Lexicon term not approved and removed from matching.", tone: "success" });
    } catch {
      setToast({ message: "Could not update lexicon review status.", tone: "error" });
    } finally {
      setReviewingLexicon(null);
    }
  }

  const redCases = useMemo(
    () => (stats?.recent_assessments ?? []).filter((item) => (item.risk_level || "").toUpperCase() === "RED"),
    [stats],
  );
  const barangayOptions = useMemo(
    () => Array.from(new Set((stats?.recent_assessments ?? []).map((item) => item.barangay).filter(Boolean))) as string[],
    [stats],
  );

  const filteredAssessments = useMemo(() => {
    if (!stats) return [];
    return stats.recent_assessments.filter((item) => {
      const matchesRisk = riskFilter === "all" || item.risk_level.toUpperCase() === riskFilter;
      const matchesBarangay = barangayFilter === "all" || item.barangay === barangayFilter;
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !search ||
        item.resident_name.toLowerCase().includes(search) ||
        item.note.toLowerCase().includes(search) ||
        (item.barangay ?? "").toLowerCase().includes(search);

      return matchesRisk && matchesBarangay && matchesSearch;
    });
  }, [stats, riskFilter, barangayFilter, searchTerm]);

  const assessmentPageCount = Math.max(1, Math.ceil(filteredAssessments.length / ASSESSMENT_PAGE_SIZE));
  const paginatedAssessments = filteredAssessments.slice(
    (assessmentPage - 1) * ASSESSMENT_PAGE_SIZE,
    assessmentPage * ASSESSMENT_PAGE_SIZE,
  );
  const assessmentStart = filteredAssessments.length === 0 ? 0 : (assessmentPage - 1) * ASSESSMENT_PAGE_SIZE + 1;
  const assessmentEnd = Math.min(assessmentPage * ASSESSMENT_PAGE_SIZE, filteredAssessments.length);
  const recentAssessments = stats?.recent_assessments ?? [];
  const recentAssessmentPageCount = Math.max(1, Math.ceil(recentAssessments.length / RECENT_ASSESSMENT_PAGE_SIZE));
  const visibleRecentAssessments = recentAssessments.slice(
    (recentAssessmentPage - 1) * RECENT_ASSESSMENT_PAGE_SIZE,
    recentAssessmentPage * RECENT_ASSESSMENT_PAGE_SIZE,
  );

  useEffect(() => {
    setAssessmentPage(1);
  }, [riskFilter, barangayFilter, searchTerm]);

  useEffect(() => {
    setAssessmentPage((page) => Math.min(page, assessmentPageCount));
  }, [assessmentPageCount]);

  useEffect(() => {
    setRecentAssessmentPage((page) => Math.min(page, recentAssessmentPageCount));
  }, [recentAssessmentPageCount]);

  function applyUrgentOnly() {
    setRiskFilter("RED");
    setBarangayFilter("all");
    setSearchTerm("");
  }
  function clearFilters() {
    setRiskFilter("all");
    setBarangayFilter("all");
    setSearchTerm("");
  }

  const redBreakdown = stats?.triage_breakdown.find((item) => (item.level || "").toLowerCase() === "red")?.value ?? 0;
  const yellowBreakdown = stats?.triage_breakdown.find((item) => (item.level || "").toLowerCase() === "yellow")?.value ?? 0;
  const greenBreakdown = stats?.triage_breakdown.find((item) => (item.level || "").toLowerCase() === "green")?.value ?? 0;
  const caseMixTotal = greenBreakdown + yellowBreakdown + redBreakdown;
  const yellowShare = caseMixTotal > 0 ? Math.round((yellowBreakdown / caseMixTotal) * 100) : 0;
  const caseMixRead = redBreakdown > 0
    ? "Urgent cases need immediate review."
    : yellowBreakdown > greenBreakdown
      ? "Consultation cases are driving the current workload."
      : "Most cases are currently in the routine monitoring band.";
  const selectedAssessment = useMemo(
    () => stats?.recent_assessments.find((item) => item.id === selectedAssessmentId) ?? stats?.recent_assessments[0] ?? null,
    [stats, selectedAssessmentId],
  );
  const barangayStats = stats?.barangay_stats ?? [];
  const maxBarangayCases = Math.max(...barangayStats.map((item) => item.total), 1);
  const pendingLexicon = lexiconEntries.filter((entry) => entry.review_status === "pending");
  const reviewedLexicon = lexiconEntries.filter((entry) => entry.reviewed);
  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : undefined;

  const renderOverview = () => (
    <div className="space-y-6">
      {refreshError && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-800">Showing cached data</p>
          <p className="mt-1 text-sm text-orange-700">{refreshError}</p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats?.summary_cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </section>

      {/* Primary row: the thing MHO staff need to see first (who needs
          follow-up) gets the wide, left-hand position — mirrors the
          reference's "widest card leads" pattern, but content priority is
          flipped to match what actually matters here. */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="flex flex-col rounded-xl border-0 bg-red-tint shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-3 border-b border-red-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-triage-red/10 text-emergency-red">
                <WidgetIcon path={widgetIcons.alert} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-emergency-red lg:text-xl">{redCases.length > 0 ? "Urgent Cases Requiring Attention" : "Needs attention"}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">Red-level cases that require follow-up now</p>
              </div>
            </div>
            <span className="font-mono text-3xl font-bold text-emergency-red">
              {redCases.length}
            </span>
          </div>
          <div className="flex-1 space-y-3 p-5">
            {redCases.length > 0 ? (
              redCases.slice(0, 3).map((item, idx) => (
                <ListRow
                  key={item.id}
                  className="relative flex flex-col gap-3 overflow-hidden border-l-4 border-l-triage-red pl-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  {idx === 0 && (
                    <span className="absolute right-3 top-3 flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-triage-red/60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-triage-red" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{item.resident_name}</p>
                      <TriageBadge level={item.risk_level} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">#{item.id}</span>
                    </div>

                    <div className="mt-3 grid gap-2 rounded-md border border-red-200 bg-white/60 p-3 text-sm text-ink-secondary sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">Resident</p>
                        <p className="mt-1 font-medium text-ink">{item.resident_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">Barangay</p>
                        <p className="mt-1 font-medium text-ink">{item.barangay ?? "Unknown barangay"}</p>
                      </div>
                      {item.phone_number && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">Contact</p>
                          <a href={`tel:${item.phone_number}`} className="mt-1 font-medium text-brand-dark hover:text-brand transition">
                            {item.phone_number}
                          </a>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">Assessment details</p>
                        <p className="mt-1 leading-relaxed text-ink-secondary">{item.note}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-ink-muted">
                      Recorded {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </ListRow>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                No red-level assessments are currently flagged for attention.
              </p>
            )}
          </div>
        </div>

        <WidgetCard icon="pie" title="Case mix" subtitle="Current triage breakdown" updated={updatedLabel}>
          <div className="space-y-6">
            <DonutChart
              centerLabel={String(caseMixTotal)}
              centerSub="total cases"
              size={148}
              segments={[
                { label: "Green", value: greenBreakdown, colorClass: "stroke-triage-green", dotClass: "bg-triage-green" },
                { label: "Yellow", value: yellowBreakdown, colorClass: "stroke-triage-yellow", dotClass: "bg-triage-yellow" },
                { label: "Red", value: redBreakdown, colorClass: "stroke-triage-red", dotClass: "bg-triage-red" },
              ]}
            />
            <div className="rounded-2xl border border-border-soft bg-[linear-gradient(145deg,#f7faf5_0%,#ffffff_52%,#f1f6ef_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">Distribution by risk</p>
                <span className="rounded-full border border-brand/15 bg-white/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">Live</span>
              </div>
              <div className="mb-3 flex h-2.5 overflow-hidden rounded-full border border-white bg-white/70 shadow-inner" aria-label={`Risk mix: ${redBreakdown} red, ${yellowBreakdown} yellow, ${greenBreakdown} green`}>
                <span className="bg-triage-red transition-all duration-500" style={{ width: `${(redBreakdown / (caseMixTotal || 1)) * 100}%` }} />
                <span className="bg-triage-yellow transition-all duration-500" style={{ width: `${(yellowBreakdown / (caseMixTotal || 1)) * 100}%` }} />
                <span className="bg-triage-green transition-all duration-500" style={{ width: `${(greenBreakdown / (caseMixTotal || 1)) * 100}%` }} />
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Red", value: redBreakdown, colorClass: "bg-triage-red", bg: "bg-red-50" },
                  { label: "Yellow", value: yellowBreakdown, colorClass: "bg-triage-yellow", bg: "bg-yellow-50" },
                  { label: "Green", value: greenBreakdown, colorClass: "bg-triage-green", bg: "bg-emerald-50" },
                ].map((row) => {
                  const total = greenBreakdown + yellowBreakdown + redBreakdown || 1;
                  const percentage = (row.value / total) * 100;
                  return (
                    <div key={row.label} className={`rounded-xl border border-white/80 ${row.bg} p-2.5 shadow-[0_3px_10px_rgba(24,38,25,0.025)]`}>
                      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        <span>{row.label}</span>
                        <span className="font-mono">{row.value} ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full border border-white/80 bg-white/60 shadow-inner">
                        <div className={`h-full rounded-full shadow-[0_1px_4px_rgba(24,38,25,0.14)] ${row.colorClass} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-brand/15 bg-brand-tint/45 px-3 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">Readout</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-secondary">{caseMixRead}</p>
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50/70 px-3 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700">Follow-up pressure</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-secondary">{yellowShare}% of cases may need consultation.</p>
              </div>
              <div className={`rounded-xl border px-3 py-3 ${redBreakdown > 0 ? "border-red-200 bg-red-50/70" : "border-emerald-200 bg-emerald-50/70"}`}>
                <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${redBreakdown > 0 ? "text-emergency-red" : "text-emerald-700"}`}>Urgency</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-secondary">{redBreakdown > 0 ? `${redBreakdown} urgent case${redBreakdown === 1 ? "" : "s"} to review.` : "No urgent cases in this view."}</p>
              </div>
            </div>
          </div>
        </WidgetCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard icon="trend" title="Previous weeks" subtitle="Eight-week case volume trend" updated={updatedLabel}>
          {stats && stats.weekly_trend.length > 0 ? (
            <TrendSparkline data={stats.weekly_trend} />
          ) : (
            <p className="text-sm text-ink-muted">No trend data available yet.</p>
          )}
        </WidgetCard>

        <WidgetCard icon="map" title="Barangay risk overview" subtitle="Case distribution by location" updated={updatedLabel}>
          <BarangayRanking data={barangayStats} />
        </WidgetCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard
          icon="list"
          title="Recent assessments"
          subtitle={`${recentAssessments.length} recent records`}
          updated={updatedLabel}
          action={
            <Link
              href="?section=records"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("records");
              }}
              className="text-xs font-medium text-brand-dark hover:text-brand transition"
            >
              View all →
            </Link>
          }
        >
          <div className="space-y-3">
            {recentAssessments.length > 0 ? (
              visibleRecentAssessments.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border-soft bg-gradient-to-r from-white via-slate-50 to-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{item.resident_name}</p>
                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">Record no. {formatAssessmentRecordNumber(item.id)}</p>
                      </div>
                      <TriageBadge level={item.risk_level} />
                    </div>
                    <div className="mt-3 grid gap-2 border-y border-border-soft/80 py-3 text-xs sm:grid-cols-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Location</p>
                        <p className="mt-0.5 font-medium text-ink-secondary">{item.barangay ?? "Not provided"}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Mobile number</p>
                        <p className="mt-0.5 font-medium text-ink-secondary">{item.phone_number ?? "Not provided"}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Symptoms recognized</p>
                        <p className="mt-0.5 font-medium capitalize text-ink-secondary">{item.detected_symptoms?.length ? item.detected_symptoms.join(", ") : "Not recorded"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Submitted details</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{item.note}</p>
                    </div>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                      Submitted {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                No assessment records available.
              </p>
            )}
            {recentAssessments.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  Showing {(recentAssessmentPage - 1) * RECENT_ASSESSMENT_PAGE_SIZE + 1}-{Math.min(recentAssessmentPage * RECENT_ASSESSMENT_PAGE_SIZE, recentAssessments.length)} of {recentAssessments.length}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setRecentAssessmentPage((page) => Math.max(1, page - 1))} disabled={recentAssessmentPage === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                  <span className="min-w-14 text-center font-mono text-[10px] text-ink-muted">{recentAssessmentPage} / {recentAssessmentPageCount}</span>
                  <button type="button" onClick={() => setRecentAssessmentPage((page) => Math.min(recentAssessmentPageCount, page + 1))} disabled={recentAssessmentPage === recentAssessmentPageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </WidgetCard>

        <WidgetCard 
          icon="pie" 
          title="Top symptoms" 
          subtitle="Most common patterns"
          updated={updatedLabel}
          action={
            <Link
              href="?section=analytics"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("analytics");
              }}
              className="text-xs font-medium text-brand-dark hover:text-brand transition"
            >
              View all →
            </Link>
          }
        >
          <div className="space-y-3">
            {(stats?.top_symptoms.length ? stats.top_symptoms.slice(0, 3) : []).map((item, index) => {
              const maxCount = Math.max(...(stats?.top_symptoms ?? []).map(s => s.count), 1);
              const percentage = (item.count / maxCount) * 100;
              
              return (
                <div
                  key={item.symptom}
                  className="rounded-2xl border border-border-soft bg-gradient-to-r from-white via-slate-50 to-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 font-mono text-xs font-bold text-brand-dark">
                        {index + 1}
                      </div>
                      <p className="truncate font-medium text-ink">{item.symptom}</p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full bg-brand/10 px-2.5 py-1 font-mono text-xs font-semibold text-brand-dark">
                      {item.count}
                    </span>
                  </div>
                  
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent" />
                    <div
                      className="relative h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats || stats.top_symptoms.length === 0) && (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                No symptom data available.
              </p>
            )}
          </div>
        </WidgetCard>
      </section>

      <WidgetCard
        icon="book"
        title="Lexicon review queue"
        subtitle="Keep community language mappings accurate"
        updated={updatedLabel}
        action={<TagBadge tone={pendingLexicon.length > 0 ? "staff" : "neutral"}>{pendingLexicon.length} pending</TagBadge>}
      >
        {pendingLexicon.length > 0 ? (
          <div className="space-y-3">
            {pendingLexicon.slice(0, 4).map((entry) => (
              <article key={entry.id} className="relative overflow-hidden rounded-[22px] border border-[#dbe6d8] bg-[linear-gradient(135deg,#ffffff_0%,#f4f8f1_100%)] p-4 shadow-[0_12px_28px_rgba(24,38,25,0.045)] transition-shadow hover:shadow-[0_16px_34px_rgba(24,38,25,0.08)] sm:p-5">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand to-[#c7b37a]" aria-hidden="true" />
                <div className="flex flex-col gap-5 pl-2 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Community phrase</span>
                      <span className="rounded-full border border-[#e7d7aa] bg-[#fffaf0] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#806326]">Pending review</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-[0_3px_10px_rgba(24,38,25,0.04)]">{entry.local_term}</span>
                      <span className="font-mono text-xs text-ink-faint" aria-hidden="true">maps to</span>
                      <span className="rounded-xl border border-[#cfe0cf] bg-[#f3f8f0] px-3 py-2 text-sm font-semibold text-brand-dark">{entry.medical_term}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      <span>{entry.language === "tl" ? "Tagalog" : "English"}</span>
                      <span>{entry.category}</span>
                      <span>Draft weight {entry.severity_weight}</span>
                    </div>
                  </div>
                  <div className="w-full shrink-0 rounded-2xl border border-[#e3ebdf] bg-white/70 p-2.5 lg:w-auto">
                    <p className="mb-2 px-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Review decision</p>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                      <button type="button" onClick={() => void reviewLexiconEntry(entry.id)} disabled={reviewingLexicon === entry.id} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-light px-4 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(47,107,79,0.16)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(47,107,79,0.2)] focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-wait disabled:opacity-60">
                        {reviewingLexicon === entry.id ? "Reviewing..." : "Mark reviewed"}
                      </button>
                      <button type="button" onClick={() => void rejectLexiconEntryForReview(entry.id)} disabled={reviewingLexicon === entry.id} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#e6b2a8] bg-[#fff6f3] px-4 text-xs font-semibold text-emergency-red outline-none transition hover:-translate-y-0.5 hover:bg-[#ffebe7] hover:shadow-[0_8px_16px_rgba(192,67,43,0.1)] focus-visible:ring-4 focus-visible:ring-emergency-red/20 disabled:cursor-wait disabled:opacity-60">
                        Not approved
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {pendingLexicon.length > 4 && (
              <p className="pt-1 text-center text-xs text-ink-muted">+{pendingLexicon.length - 4} more terms waiting for review</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/25 bg-brand-tint/60 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">✓</span>
            <div>
              <p className="text-sm font-semibold text-brand-dark">All terms are reviewed</p>
              <p className="mt-0.5 text-xs text-ink-muted">The symptom language library is currently up to date.</p>
            </div>
          </div>
        )}
      </WidgetCard>

      <section className="grid gap-6">
        <WidgetCard 
          icon="bulb" 
          title="Operational insights" 
          subtitle="Top 2 live insights"
          updated={updatedLabel}
          action={
            <Link
              href="?section=reports"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection("reports");
              }}
              className="text-xs font-medium text-brand-dark hover:text-brand transition"
            >
              View all →
            </Link>
          }
        >
          <div className="space-y-3">
            {stats?.insights.slice(0, 2).map((insight) => (
              <ListRow key={insight.title} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{insight.title}</p>
                  <TagBadge tone={insight.tone === "urgent" ? "staff" : insight.tone === "watch" ? "neutral" : "brand"}>
                    {insightToneLabel(insight.tone)}
                  </TagBadge>
                </div>
                <p className="text-sm leading-relaxed text-ink-secondary">{insight.detail}</p>
              </ListRow>
            ))}
          </div>
        </WidgetCard>
      </section>
    </div>
  );

  const renderAssessmentRecords = () => (
    <Panel title="Assessment records" badge={<TagBadge tone="neutral">Live list</TagBadge>}>
      <FilterToolbar
        riskFilter={riskFilter}
        setRiskFilter={setRiskFilter}
        barangayFilter={barangayFilter}
        setBarangayFilter={setBarangayFilter}
        barangayOptions={barangayOptions}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onUrgentOnly={applyUrgentOnly}
        onClear={clearFilters}
      />
      <div className="space-y-3">
        {filteredAssessments.length > 0 ? (
          paginatedAssessments.map((item) => (
            <ListRow key={item.id} className="block">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{item.resident_name}</p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-faint">Record no. {formatAssessmentRecordNumber(item.id)}</p>
                  </div>
                  <TriageBadge level={item.risk_level} />
                </div>
                <div className="mt-3 grid gap-3 border-y border-border-soft/80 py-3 text-xs sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Location</p>
                    <p className="mt-0.5 font-medium text-ink-secondary">{item.barangay ?? "Not provided"}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Mobile number</p>
                    <p className="mt-0.5 font-medium text-ink-secondary">{item.phone_number ?? "Not provided"}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Symptoms recognized</p>
                    <p className="mt-0.5 font-medium capitalize text-ink-secondary">{item.detected_symptoms?.length ? item.detected_symptoms.join(", ") : "Not recorded"}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">Submitted details</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">{item.note}</p>
                </div>
                <p className="mt-3 text-xs text-ink-muted">Submitted {new Date(item.created_at).toLocaleString()}</p>
              </div>
            </ListRow>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">No assessment records match the selected filters.</p>
        )}
      </div>
      {filteredAssessments.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
          <p className="text-xs text-ink-muted">Showing {assessmentStart}-{assessmentEnd} of {filteredAssessments.length}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAssessmentPage((page) => Math.max(1, page - 1))} disabled={assessmentPage === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="min-w-16 text-center font-mono text-xs text-ink-muted">Page {assessmentPage} / {assessmentPageCount}</span>
            <button type="button" onClick={() => setAssessmentPage((page) => Math.min(assessmentPageCount, page + 1))} disabled={assessmentPage === assessmentPageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}
    </Panel>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <Panel title="Risk distribution" subtitle="Current triage breakdown">
        <RiskBreakdownBar green={greenBreakdown} yellow={yellowBreakdown} red={redBreakdown} />
      </Panel>
      {stats && stats.weekly_trend.length > 0 && (
        <Panel title="Case volume trend" subtitle="Current week and previous 7 weeks">
          <TrendSparkline data={stats.weekly_trend} />
        </Panel>
      )}
      <Panel title="Symptom frequency" badge={<TagBadge>Current patterns</TagBadge>}>
        <div className="space-y-4">
          {(stats?.top_symptoms.length ? stats.top_symptoms : [{ symptom: "No data available", count: 0 }]).slice(0, 5).map((item) => (
            <div key={item.symptom}>
              <div className="mb-1.5 flex items-center justify-between text-sm text-ink-secondary">
                <span>{item.symptom}</span>
                <span className="font-medium text-ink">{item.count}</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface">
                <div
                  className="h-2.5 rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${Math.min(Math.max((item.count || 0) * 18, 10), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <Panel title="Barangay coverage" badge={<TagBadge tone="neutral">Geographic view</TagBadge>}>
        <div className="space-y-5">
          {barangayStats.length > 0 ? barangayStats.map((item) => {
            const otherCases = Math.max(item.total - item.urgent - item.follow_up, 0);
            const width = `${Math.max((item.total / maxBarangayCases) * 100, 4)}%`;
            return (
              <div key={item.barangay}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-ink">{item.barangay}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-muted">{item.total} total</span>
                </div>
                <div
                  className="mt-2 h-5 overflow-hidden rounded-sm bg-surface transition-all duration-500"
                  style={{ width }}
                  aria-label={`${item.barangay}: ${item.total} total cases, ${item.urgent} urgent, ${item.follow_up} follow-up`}
                >
                  {item.urgent > 0 ? <span className="inline-block h-full bg-triage-red" style={{ width: `${(item.urgent / item.total) * 100}%` }} /> : null}
                  {item.follow_up > 0 ? <span className="inline-block h-full bg-triage-yellow" style={{ width: `${(item.follow_up / item.total) * 100}%` }} /> : null}
                  {otherCases > 0 ? <span className="inline-block h-full bg-triage-green" style={{ width: `${(otherCases / item.total) * 100}%` }} /> : null}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                  <span>{item.urgent} urgent</span>
                  <span>{item.follow_up} follow-up</span>
                  <span>{otherCases} routine</span>
                </div>
              </div>
            );
          }) : <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">No barangay data available.</p>}
        </div>
      </Panel>
      <Panel title="Operational insights" badge={<TagBadge>Live</TagBadge>}>
        <div className="space-y-3">
          {stats?.insights.map((insight) => (
            <ListRow key={insight.title} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{insight.title}</p>
                <TagBadge tone={insight.tone === "urgent" ? "staff" : insight.tone === "watch" ? "neutral" : "brand"}>
                  {insightToneLabel(insight.tone)}
                </TagBadge>
              </div>
              <p className="text-sm leading-relaxed text-ink-secondary">{insight.detail}</p>
            </ListRow>
          ))}
        </div>
      </Panel>
    </div>
  );

  if (loading) {
    return (
      <>
        <PageMain wide>
          <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
            <div className="premium-skeleton h-32 rounded-[24px]" />
            <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="premium-skeleton h-64 rounded-[24px]" />
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="premium-skeleton h-28 rounded-[22px]" />
                  <div className="premium-skeleton h-28 rounded-[22px]" />
                  <div className="premium-skeleton h-28 rounded-[22px]" />
                  <div className="premium-skeleton h-28 rounded-[22px]" />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="premium-skeleton h-72 rounded-[24px]" />
                  <div className="premium-skeleton h-72 rounded-[24px]" />
                </div>
              </div>
            </div>
          </div>
        </PageMain>
      </>
    );
  }

  if (!currentUser || currentUser.role !== "mho") {
    const isAdmin = currentUser?.role === "admin";
    return (
      <>
        <AccessGate
          tag={isAdmin ? "MHO only" : "Staff access"}
          title={isAdmin ? "Community dashboard is for MHO staff" : "Dashboard access required"}
          description={
            isAdmin
              ? "Administrator accounts use the Admin panel for account and system management. The community dashboard is reserved for municipal health officers."
              : "Please sign in with an MHO account to open the community health dashboard."
          }
          hint={isAdmin ? undefined : "Restricted access for authorized MHO staff only"}
          actionHref={isAdmin ? "/admin" : "/login"}
          actionLabel={isAdmin ? "Go to admin panel" : "Go to login"}
        />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-surface">
        <PageHeader dashboardAlertCount={redCases.length} />
        <div>
          <PageMain wide>
            <div className="overflow-hidden rounded-[30px] border border-[#d1d9cf] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_30%),linear-gradient(135deg,#183D2D_0%,#1F4A36_42%,#2E6A52_100%)] p-px shadow-[0_28px_60px_rgba(23,63,45,0.18)]">
              <HeroBanner
                eyebrow="For municipal health office"
                title="Community health overview"
                subtitle="Track incoming risk signals, prioritize urgent cases, and understand community health trends across barangays."
                actions={
                  <>
                    <PrimaryButton type="button" onClick={() => void refreshSummary()} disabled={refreshing} className="rounded-xl border border-white/35 bg-white/12 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(8,35,22,0.12)] hover:bg-white/20">
                      {refreshing ? "Refreshing…" : "Refresh data"}
                    </PrimaryButton>
                    <PrimaryButton type="button" onClick={generateReport} disabled={!stats} className="dashboard-report-button w-full rounded-xl px-5 text-sm font-semibold sm:w-auto">
                      Generate report
                    </PrimaryButton>
                  </>
                }
              />
            </div>

            <div className="mt-6 hidden md:block">
              <nav aria-label="Dashboard sections" className="mb-4 flex flex-wrap gap-2 rounded-full border border-[#d7e0d2] bg-[linear-gradient(180deg,#fbf9f2_0%,#f2f6ee_100%)] p-1.5 shadow-[0_8px_20px_rgba(20,31,25,0.04)]">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                      activeSection === section.id
                        ? "bg-brand text-brand-foreground shadow-[0_8px_20px_rgba(47,107,79,0.18)]"
                        : "text-ink-secondary hover:bg-white hover:text-ink",
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-6">
              <div
                id={`panel-${activeSection}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeSection}`}
              >
                {activeSection === "overview" && renderOverview()}
                {activeSection === "records" && renderAssessmentRecords()}
                {activeSection === "analytics" && renderAnalytics()}
                {activeSection === "reports" && renderReports()}
              </div>
            </div>

            <div className="mt-6">
              <Disclaimer />
            </div>
          </PageMain>
        </div>
      </div>
      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" aria-busy="true" aria-label="Loading dashboard" />}>
      <DashboardPageContent />
    </Suspense>
  );
}
