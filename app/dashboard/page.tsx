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
  PremiumSelect,
  PrimaryButton,
  StatCard,
  TagBadge,
  Toast,
  TriageBadge,
} from "@/app/components/ui/primitives";
import { getDashboardSummary, getMe, getMhoLexicon, markAssessmentHandled, markLexiconReviewed, type AdminModuleLexiconEntry, type User } from "@/lib/api";
import { irosinBarangays } from "@/app/constants/irosinBarangays";
import { openReportForPrinting } from "@/lib/report";
import { IconClipboard } from "@/app/components/ui/icons";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "records", label: "Assessment records" },
  { id: "analytics", label: "Analytics" },
  { id: "reports", label: "Reports" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type UserRole = "resident" | "mho" | "admin";
type DashboardState = Awaited<ReturnType<typeof getDashboardSummary>>;

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
        "relative flex flex-col overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,#FFFFFF_0%,#F7FAF4_100%)] shadow-[0_18px_40px_rgba(17,39,28,0.05)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-[0_24px_50px_rgba(31,74,54,0.08)]",
        urgent ? "border-red-200/80" : "border-[#e3e9df]",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-5">
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
      <div className="flex-1 p-5 sm:p-6">{children}</div>
      {updated && (
        <div className="border-t border-border/60 px-5 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Updated {updated}</p>
        </div>
      )}
    </div>
  );
}

// Segmented ring chart. colorClass/dotClass must be real Tailwind classes
// already used elsewhere in this codebase (stroke-triage-*, bg-triage-*,
// stroke-brand, bg-border) — assuming your Tailwind color theme generates
// stroke-* utilities for the same tokens as bg-*/text-*, which it does by
// default when colors are defined via theme.extend.colors. Worth a quick
// visual check the first time this renders.
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
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
          {segmentLayout.map((seg) => (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
              className={cn(seg.colorClass, "transition-all duration-500")}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-xl font-semibold text-ink">{centerLabel}</p>
          {centerSub && <p className="text-[10px] text-ink-muted">{centerSub}</p>}
        </div>
      </div>
      <div className="w-full space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span className={cn("h-2.5 w-2.5 rounded-full", seg.dotClass)} />
              {seg.label}
            </span>
            <span className="font-medium text-ink">{seg.value}</span>
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
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 280;
  const h = 72;
  const padX = 8;
  const padY = 10;
  const chartW = w - padX * 2;
  const chartH = h - padY * 2;
  const step = data.length > 1 ? chartW / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = padX + i * step;
    const y = padY + chartH - (d.count / max) * chartH;
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(padY + chartH).toFixed(1)} L${points[0].x.toFixed(1)},${(padY + chartH).toFixed(1)} Z`;
  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const delta = prev ? last.count - prev.count : 0;
  const weekTotal = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Latest day</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-mono text-3xl font-semibold tabular-nums text-ink">{last.count}</p>
            <p className="text-sm text-ink-muted">cases · {last.label}</p>
          </div>
          {prev && (
            <p className={`mt-1 text-xs font-medium ${delta > 0 ? "text-emergency-red" : delta < 0 ? "text-brand-dark" : "text-ink-muted"}`}>
              {delta === 0 ? "No change vs. previous day" : `${delta > 0 ? "+" : ""}${delta} vs. previous day`}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-brand/15 bg-brand-tint/70 px-4 py-3 text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-brand-dark/70">7-day total</p>
          <p className="font-mono text-xl font-semibold text-brand-dark">{weekTotal}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E0E8DC] bg-[linear-gradient(180deg,#FAFCF8_0%,#F2F6EE_100%)] p-4">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full text-brand" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padX}
              x2={w - padX}
              y1={padY + chartH * (1 - ratio)}
              y2={padY + chartH * (1 - ratio)}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          ))}
          <path d={areaPath} fill="url(#trend-area-fill)" />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {points.map((p) => (
            <circle key={p.date} cx={p.x} cy={p.y} r={p === points[points.length - 1] ? 4 : 2.5} fill={p === points[points.length - 1] ? "currentColor" : "#ffffff"} stroke="currentColor" strokeWidth={1.5} />
          ))}
        </svg>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {data.map((d) => (
            <div key={d.date} className="text-center">
              <p className="font-mono text-[10px] font-semibold text-ink">{d.count}</p>
              <p className="text-[9px] uppercase tracking-[0.06em] text-ink-faint">{d.label}</p>
            </div>
          ))}
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

type BarangayData = DashboardState["barangay_stats"][number];

function abbreviateBarangay(name: string) {
  if (name.length <= 10) return name;
  return name.replace("San ", "S. ").replace("Santo ", "St. ");
}

function getHeatCellStyle(urgent: number, followUp: number, total: number, maxUrgent: number) {
  if (urgent > 0) {
    const intensity = 0.42 + (urgent / maxUrgent) * 0.58;
    return {
      style: { backgroundColor: `rgba(192, 67, 43, ${intensity})` },
      label: "High risk",
      tone: "text-white",
      ring: "ring-red-300/50",
    };
  }
  if (followUp > 0) {
    return {
      style: { backgroundColor: "rgba(217, 138, 43, 0.62)" },
      label: "Monitor",
      tone: "text-ink",
      ring: "ring-amber-300/50",
    };
  }
  if (total > 0) {
    return {
      style: { backgroundColor: "rgba(62, 142, 65, 0.38)" },
      label: "Stable",
      tone: "text-ink",
      ring: "ring-emerald-300/40",
    };
  }
  return {
    style: { backgroundColor: "rgba(232, 237, 228, 0.85)" },
    label: "No activity",
    tone: "text-ink-faint",
    ring: "ring-border/70",
  };
}

function BarangayHeatMap({ data }: { data: BarangayData[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const statsByName = useMemo(() => {
    const map = new Map<string, BarangayData>();
    for (const item of data) map.set(item.barangay, item);
    return map;
  }, [data]);

  const maxUrgent = Math.max(...data.map((item) => item.urgent), 1);
  const activeCount = irosinBarangays.filter((name) => (statsByName.get(name)?.total ?? 0) > 0).length;
  const criticalCount = data.filter((item) => item.urgent > 0).length;
  const hotspots = [...data].filter((item) => item.urgent > 0 || item.total > 0).sort((a, b) => b.urgent - a.urgent || b.total - a.total).slice(0, 4);
  const walkIn = statsByName.get("Unassigned / walk-in");
  const focused = selected ? statsByName.get(selected) ?? null : hotspots[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Barangays active", value: String(activeCount), hint: `of ${irosinBarangays.length} in Irosin` },
          { label: "High-risk zones", value: String(criticalCount), hint: "Urgent cases recorded" },
          { label: "Walk-in cases", value: String(walkIn?.total ?? 0), hint: "Unassigned location" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#E0E8DC] bg-[linear-gradient(135deg,#FFFFFF_0%,#F4F8F1_100%)] px-4 py-3 shadow-[0_8px_20px_rgba(24,38,25,0.04)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">{item.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-ink">{item.value}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[22px] border border-[#DDE7DB] bg-[linear-gradient(180deg,#FAFCF8_0%,#EEF4EA_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">Irosin municipality</p>
            <div className="flex flex-wrap gap-2">
              {[
                { color: "bg-triage-red", label: "Urgent" },
                { color: "bg-triage-yellow", label: "Monitor" },
                { color: "bg-triage-green", label: "Stable" },
                { color: "bg-slate-200", label: "None" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[10px] font-medium text-ink-muted">
                  <span className={`h-2 w-2 rounded-full ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {irosinBarangays.map((name) => {
              const stat = statsByName.get(name) ?? { barangay: name, total: 0, urgent: 0, follow_up: 0 };
              const heat = getHeatCellStyle(stat.urgent, stat.follow_up, stat.total, maxUrgent);
              const isSelected = selected === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelected(name)}
                  title={`${name}: ${stat.total} total, ${stat.urgent} urgent, ${stat.follow_up} follow-up`}
                  className={cn(
                    "group relative min-h-[68px] rounded-xl border px-2 py-2 text-left shadow-[0_6px_16px_rgba(24,38,25,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(24,38,25,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20",
                    heat.ring,
                    isSelected && "ring-2 ring-brand-dark/40",
                    stat.urgent > 0 && "animate-[pulse_3s_ease-in-out_infinite]",
                  )}
                  style={heat.style}
                >
                  <p className={cn("truncate text-[11px] font-semibold leading-tight", heat.tone)}>{abbreviateBarangay(name)}</p>
                  <p className={cn("mt-1 font-mono text-sm font-bold tabular-nums", heat.tone)}>{stat.total > 0 ? stat.total : "—"}</p>
                  {stat.urgent > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-[#E0E8DC] bg-white p-4 shadow-[0_10px_24px_rgba(24,38,25,0.05)]">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Selected barangay</p>
            {focused ? (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{focused.barangay}</p>
                  <p className="text-xs text-ink-muted">{getHeatCellStyle(focused.urgent, focused.follow_up, focused.total, maxUrgent).label}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                    <p className="font-mono text-lg font-semibold text-ink">{focused.total}</p>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">Total</p>
                  </div>
                  <div className="rounded-xl bg-red-50 px-2 py-2 text-center">
                    <p className="font-mono text-lg font-semibold text-emergency-red">{focused.urgent}</p>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-emergency-red/80">Urgent</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 px-2 py-2 text-center">
                    <p className="font-mono text-lg font-semibold text-amber-700">{focused.follow_up}</p>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-amber-700/80">Follow-up</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Tap a barangay tile to inspect local activity.</p>
            )}
          </div>

          <div className="rounded-[22px] border border-[#E0E8DC] bg-[linear-gradient(180deg,#FFF8F6_0%,#FFFFFF_100%)] p-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emergency-red">Priority hotspots</p>
            <div className="mt-3 space-y-2">
              {hotspots.length > 0 ? hotspots.map((item, index) => (
                <button
                  key={item.barangay}
                  type="button"
                  onClick={() => setSelected(item.barangay)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-red-100 bg-white/80 px-3 py-2.5 text-left transition hover:border-red-200 hover:bg-white"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 font-mono text-xs font-bold text-emergency-red">{index + 1}</span>
                    <span className="truncate text-sm font-medium text-ink">{item.barangay}</span>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-semibold text-emergency-red">{item.urgent} urgent</span>
                </button>
              )) : (
                <p className="text-sm text-ink-muted">No urgent barangay clusters right now.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarangayCoverageBars({ data, maxCases }: { data: BarangayData[]; maxCases: number }) {
  if (data.length === 0) {
    return <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">No barangay data available.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const otherCases = Math.max(item.total - item.urgent - item.follow_up, 0);
        const width = `${Math.max((item.total / maxCases) * 100, 6)}%`;
        return (
          <div key={item.barangay} className="rounded-2xl border border-[#E4EBDD] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7FAF4_100%)] p-4 shadow-[0_8px_20px_rgba(24,38,25,0.04)] transition duration-200 hover:border-brand/20 hover:shadow-[0_12px_28px_rgba(24,38,25,0.07)]">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-ink">{item.barangay}</span>
              <span className="shrink-0 font-mono text-xs text-ink-muted">{item.total} total</span>
            </div>
            <div
              className="mt-3 flex h-6 overflow-hidden rounded-full border border-white/80 bg-slate-100 shadow-inner transition-all duration-500"
              style={{ width }}
              aria-label={`${item.barangay}: ${item.total} total cases, ${item.urgent} urgent, ${item.follow_up} follow-up`}
            >
              {item.urgent > 0 ? <span className="h-full bg-triage-red" style={{ width: `${(item.urgent / item.total) * 100}%` }} /> : null}
              {item.follow_up > 0 ? <span className="h-full bg-triage-yellow" style={{ width: `${(item.follow_up / item.total) * 100}%` }} /> : null}
              {otherCases > 0 ? <span className="h-full bg-triage-green" style={{ width: `${(otherCases / item.total) * 100}%` }} /> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-triage-red" />{item.urgent} urgent</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-triage-yellow" />{item.follow_up} follow-up</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-triage-green" />{otherCases} routine</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statCardAccent(label: string): "brand" | "urgent" | "watch" | "neutral" {
  if (label.toLowerCase().includes("urgent")) return "urgent";
  if (label.toLowerCase().includes("week")) return "watch";
  if (label.toLowerCase().includes("today")) return "brand";
  return "neutral";
}

function statCardIcon(label: string): keyof typeof widgetIcons {
  if (label.toLowerCase().includes("urgent")) return "alert";
  if (label.toLowerCase().includes("week")) return "trend";
  if (label.toLowerCase().includes("today")) return "list";
  return "pie";
}

const SECTION_HINTS: Record<SectionId, string> = {
  overview: "Priority queue & live signals",
  records: "Search and review cases",
  analytics: "Trends & symptom patterns",
  reports: "Coverage & operational insights",
};

function SectionNav({
  activeSection,
  onSelect,
  urgentCount,
  pendingLexicon,
}: {
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
  urgentCount: number;
  pendingLexicon: number;
}) {
  return (
    <aside className="mho-section-nav relative overflow-hidden rounded-[24px] border border-[#D7E0D2] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] md:sticky md:top-24 md:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Workspace</p>
        <span className="mho-status-pill mho-status-pill--live hidden sm:inline-flex">Live</span>
      </div>
      <nav className="mt-4 space-y-2" role="tablist" aria-label="Dashboard sections">
        {SECTIONS.map((section, index) => {
          const isActive = activeSection === section.id;
          const badge = section.id === "records" ? urgentCount : section.id === "overview" ? pendingLexicon : 0;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              id={`tab-${section.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${section.id}`}
              onClick={() => onSelect(section.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition duration-200",
                isActive
                  ? "border-brand/30 bg-brand/10 text-brand-dark shadow-[inset_3px_0_0_var(--color-brand)]"
                  : "border-transparent text-ink-secondary hover:border-border hover:bg-white/70 hover:text-ink",
              )}
            >
              <span className="min-w-0">
                <span className="block">{section.label}</span>
                <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">{SECTION_HINTS[section.id]}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {badge > 0 ? (
                  <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] font-bold", section.id === "records" ? "bg-triage-red text-white" : "bg-brand/15 text-brand-dark")}>
                    {badge}
                  </span>
                ) : null}
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">0{index + 1}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
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
        className="rounded-xl border border-red-200/80 bg-[linear-gradient(180deg,#FFF8F6_0%,#FDECEA_100%)] px-3.5 py-2 text-sm font-semibold text-emergency-red shadow-[0_6px_16px_rgba(192,67,43,0.08)] transition hover:-translate-y-0.5 hover:border-red-300"
      >
        Urgent only
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-xl border border-[#DDE7DB] bg-white px-3.5 py-2 text-sm font-semibold text-ink-secondary shadow-[0_6px_16px_rgba(24,38,25,0.04)] transition hover:-translate-y-0.5 hover:border-brand/35 hover:text-brand-dark"
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
      <div className="grid gap-3 rounded-[22px] border border-[#E4EBDD] bg-[linear-gradient(180deg,#FAFCF8_0%,#F2F6EE_100%)] p-4 sm:grid-cols-3">
        <PremiumSelect value={riskFilter} onChange={setRiskFilter} ariaLabel="Filter assessments by risk level" options={[{ value: "all", label: "All risk levels" }, { value: "GREEN", label: "Green" }, { value: "YELLOW", label: "Yellow" }, { value: "RED", label: "Red" }]} />
        <PremiumSelect value={barangayFilter} onChange={setBarangayFilter} ariaLabel="Filter assessments by barangay" options={[{ value: "all", label: "All barangays" }, ...barangayOptions.map((barangay) => ({ value: barangay, label: barangay }))]} />
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <SearchIcon />
          </span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search resident or note"
            className="min-h-11 w-full rounded-xl border border-[#D8E2D3] bg-white px-3 pl-9 text-sm text-ink shadow-[0_4px_12px_rgba(24,38,25,0.04)] outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
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
  const [handlingCase, setHandlingCase] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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

    const printed = openReportForPrinting({
      title: "Community Health Report",
      subtitle: "Municipal Health Office summary",
      generatedAt: new Date().toLocaleString(),
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

    setToast({
      message: printed ? "Report ready. Choose Save as PDF in the print dialog." : "Could not open the print window.",
      tone: printed ? "success" : "error",
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

  async function markCaseHandled(id: number) {
    setHandlingCase(id);
    try {
      const updated = await markAssessmentHandled(id);
      setStats((prev) => {
        if (!prev) return prev;
        const wasActiveRed = prev.recent_assessments.some(
          (item) => item.id === id && (item.risk_level || "").toUpperCase() === "RED" && !item.handled,
        );
        const recent_assessments = prev.recent_assessments.map((item) => (item.id === id ? updated : item));
        const summary_cards = prev.summary_cards.map((card) =>
          card.label === "Urgent alerts" && wasActiveRed
            ? { ...card, value: String(Math.max(0, Number(card.value) - 1)) }
            : card,
        );
        return { ...prev, recent_assessments, summary_cards };
      });
      setToast({ message: "Case marked as handled.", tone: "success" });
    } catch {
      setToast({ message: "Could not mark case as handled.", tone: "error" });
    } finally {
      setHandlingCase(null);
    }
  }

  const redCases = useMemo(
    () => (stats?.recent_assessments ?? []).filter((item) => (item.risk_level || "").toUpperCase() === "RED"),
    [stats],
  );
  const activeRedCases = useMemo(
    () => redCases.filter((item) => !item.handled),
    [redCases],
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
  const selectedAssessment = useMemo(
    () => stats?.recent_assessments.find((item) => item.id === selectedAssessmentId) ?? stats?.recent_assessments[0] ?? null,
    [stats, selectedAssessmentId],
  );
  const barangayStats = stats?.barangay_stats ?? [];
  const maxBarangayCases = Math.max(...barangayStats.map((item) => item.total), 1);
  const pendingLexicon = lexiconEntries.filter((entry) => !entry.reviewed);
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
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            accent={statCardAccent(card.label)}
            icon={<WidgetIcon path={widgetIcons[statCardIcon(card.label)]} />}
          />
        ))}
      </section>

      {/* Primary row: the thing MHO staff need to see first (who needs
          follow-up) gets the wide, left-hand position — mirrors the
          reference's "widest card leads" pattern, but content priority is
          flipped to match what actually matters here. */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="relative flex flex-col overflow-hidden rounded-[24px] border border-[#F0D5CF] bg-[linear-gradient(180deg,#FFF8F6_0%,#FDECEA_100%)] shadow-[0_18px_40px_rgba(192,67,43,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(192,67,43,0.12)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8E2F24] via-[#C0432B] to-[#E7A08F]" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3 border-b border-red-200/80 px-5 py-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200/80 bg-white text-emergency-red shadow-sm">
                <WidgetIcon path={widgetIcons.alert} />
              </span>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emergency-red">Priority queue</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-ink lg:text-xl">{activeRedCases.length > 0 ? "Urgent cases" : "Needs attention"}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">Red-level cases that require follow-up now</p>
              </div>
            </div>
            <span className="flex min-w-10 items-center justify-center rounded-xl border border-red-200/80 bg-white px-2.5 py-1.5 font-mono text-2xl font-bold text-emergency-red shadow-sm">{activeRedCases.length}</span>
          </div>
          <div className="flex-1 space-y-3 p-5">
            {activeRedCases.length > 0 ? (
              activeRedCases.slice(0, 3).map((item, idx) => (
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
                    <button
                      type="button"
                      onClick={() => markCaseHandled(item.id)}
                      disabled={handlingCase === item.id}
                      className="mt-3 inline-flex min-h-9 items-center rounded-xl border border-brand/25 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition hover:-translate-y-0.5 hover:border-brand/45 hover:bg-brand-tint hover:shadow-[0_8px_18px_rgba(47,107,79,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {handlingCase === item.id ? "Saving..." : "Mark as handled"}
                    </button>
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
              centerLabel={String(greenBreakdown + yellowBreakdown + redBreakdown)}
              centerSub="total cases"
              segments={[
                { label: "Green", value: greenBreakdown, colorClass: "stroke-triage-green", dotClass: "bg-triage-green" },
                { label: "Yellow", value: yellowBreakdown, colorClass: "stroke-triage-yellow", dotClass: "bg-triage-yellow" },
                { label: "Red", value: redBreakdown, colorClass: "stroke-triage-red", dotClass: "bg-triage-red" },
              ]}
            />
            <div className="rounded-2xl border border-border-soft bg-gradient-to-r from-slate-50 via-white to-slate-50 p-3">
              <div className="space-y-3">
                {[
                  { label: "Red", value: redBreakdown, colorClass: "bg-triage-red", bg: "bg-red-50" },
                  { label: "Yellow", value: yellowBreakdown, colorClass: "bg-triage-yellow", bg: "bg-yellow-50" },
                  { label: "Green", value: greenBreakdown, colorClass: "bg-triage-green", bg: "bg-emerald-50" },
                ].map((row) => {
                  const total = greenBreakdown + yellowBreakdown + redBreakdown || 1;
                  const percentage = (row.value / total) * 100;
                  return (
                    <div key={row.label} className={`rounded-xl ${row.bg} p-2`}>
                      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        <span>{row.label}</span>
                        <span className="font-mono">{row.value} ({Math.round(percentage)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/60">
                        <div className={`h-full ${row.colorClass} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </WidgetCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard icon="trend" title="This week" subtitle="Case volume trend" updated={updatedLabel}>
          {stats && stats.weekly_trend.length > 0 ? (
            <TrendSparkline data={stats.weekly_trend} />
          ) : (
            <p className="text-sm text-ink-muted">No trend data available yet.</p>
          )}
        </WidgetCard>

        <WidgetCard icon="map" title="Barangay heat map" subtitle="Live urgency grid across Irosin" updated={updatedLabel}>
          <BarangayHeatMap data={barangayStats} />
        </WidgetCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard
          icon="list"
          title="Recent assessments"
          subtitle="Latest 3 records"
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
            {stats && stats.recent_assessments.length > 0 ? (
              stats.recent_assessments.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border-soft bg-gradient-to-r from-white via-slate-50 to-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{item.resident_name}</p>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">ID #{item.id}</p>
                    </div>
                    <TriageBadge level={item.risk_level} />
                  </div>
                  <p className="mb-2 text-xs leading-relaxed text-ink-secondary">{item.note}</p>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                No assessment records available.
              </p>
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
              <div key={entry.id} className="flex flex-col gap-4 rounded-2xl border border-[#e1e8dc] bg-[linear-gradient(110deg,#fbfdf9_0%,#f3f8f1_100%)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-brand/20 bg-white px-2.5 py-1 text-sm font-semibold text-ink">{entry.local_term}</span>
                    <span className="text-ink-faint" aria-hidden="true">→</span>
                    <span className="text-sm font-medium text-brand-dark">{entry.medical_term}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                    <span>{entry.language}</span>
                    <span>{entry.category}</span>
                    <span>Weight {entry.severity_weight}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void reviewLexiconEntry(entry.id)}
                  disabled={reviewingLexicon === entry.id}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-white px-3.5 text-xs font-semibold text-brand-dark outline-none transition hover:border-brand/50 hover:bg-brand-tint focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {reviewingLexicon === entry.id ? "Reviewing..." : "Mark reviewed"}
                </button>
              </div>
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
          subtitle="Live recommendations for your shift"
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stats?.insights.slice(0, 3).map((insight) => (
              <ListRow key={insight.title} className="h-full space-y-2 border-[#E0E8DC] bg-white/80">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{insight.title}</p>
                  <TagBadge tone={insight.tone === "urgent" ? "staff" : insight.tone === "watch" ? "neutral" : "brand"}>
                    {insight.tone}
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
    <div className="space-y-6">
      <WidgetCard
        icon="list"
        title="Assessment records"
        subtitle={`${filteredAssessments.length} case${filteredAssessments.length === 1 ? "" : "s"} match your filters`}
        action={<TagBadge tone="neutral">Live list</TagBadge>}
      >
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
            filteredAssessments.slice(0, 12).map((item) => (
              <ListRow
                key={item.id}
                className={cn(
                  "mho-assessment-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
                  (item.risk_level || "").toUpperCase() === "RED" && !item.handled && "border-l-4 border-l-triage-red",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-white font-display text-lg font-semibold text-brand-dark shadow-sm">
                    {item.resident_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{item.resident_name}</p>
                      <TriageBadge level={item.risk_level} />
                      {item.handled ? (
                        <span className="rounded-full border border-brand/20 bg-brand-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-brand-dark">Handled</span>
                      ) : null}
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">{item.barangay ?? "Unknown"}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.note}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                      #{item.id} · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/result/${item.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-white px-4 text-sm font-semibold text-brand-dark shadow-[0_6px_16px_rgba(24,38,25,0.05)] transition hover:border-brand/45 hover:bg-brand-tint"
                >
                  Open record
                </Link>
              </ListRow>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">No assessment records match the selected filters.</p>
          )}
        </div>
      </WidgetCard>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard icon="pie" title="Risk distribution" subtitle="Current triage breakdown" updated={updatedLabel}>
          <RiskBreakdownBar green={greenBreakdown} yellow={yellowBreakdown} red={redBreakdown} />
        </WidgetCard>
        {stats && stats.weekly_trend.length > 0 ? (
          <WidgetCard icon="trend" title="Case volume trend" subtitle="Last 7 days" updated={updatedLabel}>
            <TrendSparkline data={stats.weekly_trend} />
          </WidgetCard>
        ) : null}
      </section>
      <WidgetCard icon="list" title="Symptom frequency" subtitle="Most reported patterns" updated={updatedLabel} action={<TagBadge>Current patterns</TagBadge>}>
        <div className="space-y-4">
          {(stats?.top_symptoms.length ? stats.top_symptoms : [{ symptom: "No data available", count: 0 }]).slice(0, 8).map((item, index) => {
            const maxCount = Math.max(...(stats?.top_symptoms ?? []).map((s) => s.count), 1);
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div key={item.symptom} className="rounded-2xl border border-[#E4EBDD] bg-[linear-gradient(135deg,#FFFFFF_0%,#F7FAF4_100%)] p-4 shadow-[0_8px_20px_rgba(24,38,25,0.04)]">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-3 font-medium text-ink">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 font-mono text-xs font-bold text-brand-dark">{index + 1}</span>
                    {item.symptom}
                  </span>
                  <span className="font-mono text-sm font-semibold text-brand-dark">{item.count}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${Math.max(percentage, item.count > 0 ? 8 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </WidgetCard>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <WidgetCard icon="map" title="Barangay coverage" subtitle="Geographic distribution across Irosin" updated={updatedLabel} action={<TagBadge tone="neutral">Geographic view</TagBadge>}>
        <BarangayCoverageBars data={barangayStats} maxCases={maxBarangayCases} />
      </WidgetCard>
      <WidgetCard icon="bulb" title="Operational insights" subtitle="Recommendations for municipal health operations" updated={updatedLabel} action={<TagBadge>Live</TagBadge>}>
        <div className="grid gap-3 sm:grid-cols-2">
          {stats?.insights.map((insight) => (
            <ListRow key={insight.title} className="h-full space-y-2 bg-white/80">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{insight.title}</p>
                <TagBadge tone={insight.tone === "urgent" ? "staff" : insight.tone === "watch" ? "neutral" : "brand"}>
                  {insight.tone}
                </TagBadge>
              </div>
              <p className="text-sm leading-relaxed text-ink-secondary">{insight.detail}</p>
            </ListRow>
          ))}
        </div>
      </WidgetCard>
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
      <div className="premium-page min-h-screen">
        <PageHeader dashboardAlertCount={activeRedCases.length} />
        <div>
          <PageMain wide>
            <div className="overflow-hidden rounded-[30px] border border-[#d1d9cf] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_30%),linear-gradient(135deg,#183D2D_0%,#1F4A36_42%,#2E6A52_100%)] p-px shadow-[0_28px_60px_rgba(23,63,45,0.18)]">
              <HeroBanner
                eyebrow="Municipal Health Office · Irosin"
                title={`Welcome back, ${currentUser.full_name.split(" ")[0]}`}
                subtitle="Track incoming risk signals, prioritize urgent cases, and understand community health trends across barangays."
                meta={
                  <>
                    <span className="mho-status-pill mho-status-pill--live">Live dashboard</span>
                    {updatedLabel ? <span className="mho-status-pill">Updated {updatedLabel}</span> : null}
                    {activeRedCases.length > 0 ? (
                      <span className="mho-status-pill mho-status-pill--urgent">{activeRedCases.length} urgent case{activeRedCases.length === 1 ? "" : "s"}</span>
                    ) : null}
                    {pendingLexicon.length > 0 ? (
                      <span className="mho-status-pill">{pendingLexicon.length} lexicon pending</span>
                    ) : null}
                  </>
                }
                actions={
                  <>
                    <PrimaryButton type="button" onClick={() => void refreshSummary()} disabled={refreshing} className="rounded-xl border border-white/35 bg-white/12 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(8,35,22,0.12)] hover:bg-white/20">
                      {refreshing ? "Refreshing…" : "Refresh data"}
                    </PrimaryButton>
                    <PrimaryButton type="button" onClick={generateReport} disabled={!stats} className="dashboard-report-button rounded-xl px-5 text-sm font-semibold">
                      <IconClipboard size={17} />
                      <span>Generate report</span>
                    </PrimaryButton>
                  </>
                }
              />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
              <SectionNav
                activeSection={activeSection}
                onSelect={setActiveSection}
                urgentCount={activeRedCases.length}
                pendingLexicon={pendingLexicon.length}
              />
              <div>
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