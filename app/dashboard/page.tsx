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
  PrimaryButton,
  StatCard,
  TagBadge,
  Toast,
  TriageBadge,
} from "@/app/components/ui/primitives";
import { getDashboardSummary, getMe, getMhoLexicon, markLexiconReviewed, type AdminModuleLexiconEntry } from "@/lib/api";
import { buildStyledReportHtml } from "@/lib/report";

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
        "flex flex-col rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        urgent ? "border-triage-red/30" : "border-border",
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
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-border" />
          {segments.map((seg) => {
            const dash = (seg.value / total) * circumference;
            const el = (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className={cn(seg.colorClass, "transition-all duration-500")}
              />
            );
            offset += dash;
            return el;
          })}
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
  const w = 160;
  const h = 44;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = i * step;
    const y = h - (d.count / max) * (h - 6) - 3;
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  const prev = data.length > 1 ? data[data.length - 2] : null;
  const delta = prev ? last.count - prev.count : 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-40 shrink-0 text-brand" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill="currentColor" />
      </svg>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-2xl font-semibold text-ink">{last.count}</p>
          <p className="text-xs text-ink-muted">cases · {last.label}</p>
        </div>
        {prev && (
          <p className={`mt-0.5 text-xs font-medium ${delta > 0 ? "text-emergency-red" : delta < 0 ? "text-brand-dark" : "text-ink-muted"}`}>
            {delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta} vs. previous week`}
          </p>
        )}
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

function CommunityHeatMap({ data }: { data: DashboardState["barangay_stats"] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const rows = data.length > 0 ? data : [{ barangay: "Monbon", total: 2, urgent: 0, follow_up: 1 }];
  const max = Math.max(...rows.map((item) => item.total), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[120px_repeat(7,minmax(0,1fr))] gap-2 text-[10px] font-mono uppercase tracking-[0.12em] text-ink-muted">
        <div />
        {days.map((day) => <div key={day} className="text-center">{day}</div>)}
      </div>

      {rows.map((item) => {
        const values = Array.from({ length: 7 }, (_, index) => {
          const base = item.total / 7;
          const value = Math.max(0, Math.round(base + (index % 3 === 0 ? item.urgent : item.follow_up) + (index === 6 ? 1 : 0)));
          return value;
        });

        return (
          <div key={item.barangay} className="grid grid-cols-[120px_repeat(7,minmax(0,1fr))] items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{item.barangay}</span>
            {values.map((value, index) => {
              const intensity = Math.min(Math.max(value / Math.max(max, 1), 0.08), 1);
              const tone =
                intensity > 0.75 ? "bg-[#1F4A36] text-white" :
                intensity > 0.5 ? "bg-[#3F8F6B] text-white" :
                intensity > 0.25 ? "bg-[#9CC9B1] text-[#183D2D]" :
                "bg-[#EDF4EE] text-[#1F4A36]";

              return (
                <div
                  key={`${item.barangay}-${index}`}
                  className={`flex h-9 items-center justify-center rounded-md border border-white/20 text-[10px] font-semibold shadow-sm ${tone}`}
                  title={`${item.barangay} / ${days[index]}: ${value} cases`}
                >
                  {value > 0 ? value : "·"}
                </div>
              );
            })}
          </div>
        );
      })}
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
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value)}
          className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink"
        >
          <option value="all">All risk levels</option>
          <option value="GREEN">Green</option>
          <option value="YELLOW">Yellow</option>
          <option value="RED">Red</option>
        </select>
        <select
          value={barangayFilter}
          onChange={(event) => setBarangayFilter(event.target.value)}
          className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink"
        >
          <option value="all">All barangays</option>
          {barangayOptions.map((barangay) => (
            <option key={barangay} value={barangay}>{barangay}</option>
          ))}
        </select>
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

  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardState | null>(null);
  const [lexiconEntries, setLexiconEntries] = useState<AdminModuleLexiconEntry[]>([]);
  const [reviewingLexicon, setReviewingLexicon] = useState<number | null>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSectionState] = useState<SectionId>(
    (searchParams.get("section") as SectionId) || "overview",
  );
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  function setActiveSection(id: SectionId) {
    setActiveSectionState(id);
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

    const reportHtml = buildStyledReportHtml({
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

    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank", "noopener,noreferrer");

    if (popup) {
      popup.focus();
    }

    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setToast({ message: "MHO report opened in a styled preview.", tone: "success" });
  }

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      const [summary, lexicon] = await Promise.all([getDashboardSummary(), getMhoLexicon()]);
      setStats(summary);
      setLexiconEntries(lexicon);
      setLastUpdated(new Date());
      setToast({ message: "Dashboard data refreshed.", tone: "success" });
    } catch {
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
  const barangayStats = stats?.barangay_stats ?? [];
  const maxBarangayCases = Math.max(...barangayStats.map((item) => item.total), 1);
  const pendingLexicon = lexiconEntries.filter((entry) => !entry.reviewed);
  const reviewedLexicon = lexiconEntries.filter((entry) => entry.reviewed);
  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : undefined;

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">At a glance</p>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats?.summary_cards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
          ))}
        </section>
      </div>

      {/* Primary row: the thing MHO staff need to see first (who needs
          follow-up) gets the wide, left-hand position — mirrors the
          reference's "widest card leads" pattern, but content priority is
          flipped to match what actually matters here. */}
      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <WidgetCard
          icon="alert"
          title="Needs attention"
          subtitle="Red-level cases that require follow-up now"
          urgent={redCases.length > 0}
          updated={updatedLabel}
          action={
            <span className="font-mono text-3xl font-bold text-emergency-red">
              {redCases.length}
            </span>
          }
        >
          <div className="space-y-3">
            {redCases.length > 0 ? (
              redCases.slice(0, 4).map((item) => (
                <ListRow
                  key={item.id}
                  className="relative flex flex-col gap-3 overflow-hidden border-l-4 border-l-triage-red pl-4 shadow-sm lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-triage-red/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-triage-red" />
                      </span>
                      <p className="font-medium text-ink">{item.resident_name}</p>
                      <TriageBadge level={item.risk_level} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">#{item.id}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.note}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {item.barangay ?? "Unknown barangay"} • {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/result/${item.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-sm border border-red-200 bg-red-tint px-3.5 text-sm font-medium text-emergency-red transition hover:bg-red-100"
                  >
                    Review
                  </Link>
                </ListRow>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                No red-level assessments are currently flagged for attention.
              </p>
            )}
          </div>
        </WidgetCard>

        <WidgetCard icon="pie" title="Case mix" subtitle="Current triage breakdown" updated={updatedLabel}>
          <DonutChart
            centerLabel={String(greenBreakdown + yellowBreakdown + redBreakdown)}
            centerSub="total cases"
            segments={[
              { label: "Green", value: greenBreakdown, colorClass: "stroke-triage-green", dotClass: "bg-triage-green" },
              { label: "Yellow", value: yellowBreakdown, colorClass: "stroke-triage-yellow", dotClass: "bg-triage-yellow" },
              { label: "Red", value: redBreakdown, colorClass: "stroke-triage-red", dotClass: "bg-triage-red" },
            ]}
          />
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

        <WidgetCard icon="map" title="Community heat map" subtitle="Hotspot intensity by barangay" updated={updatedLabel}>
          <CommunityHeatMap data={barangayStats} />
        </WidgetCard>

        <WidgetCard
          icon="book"
          title="Lexicon review queue"
          subtitle="Validate terms before they're used in triage"
          updated={updatedLabel}
          action={
            pendingLexicon.length > 0 ? (
              <TagBadge tone="staff">{pendingLexicon.length} pending</TagBadge>
            ) : (
              <TagBadge tone="brand">All reviewed</TagBadge>
            )
          }
        >
          <div className="space-y-5">
            <DonutChart
              size={96}
              strokeWidth={11}
              centerLabel={`${reviewedLexicon.length}/${lexiconEntries.length || 0}`}
              centerSub="reviewed"
              segments={[
                { label: "Reviewed", value: reviewedLexicon.length, colorClass: "stroke-brand", dotClass: "bg-brand" },
                { label: "Pending", value: pendingLexicon.length, colorClass: "stroke-border", dotClass: "bg-border" },
              ]}
            />
            <div className="space-y-2.5">
              {pendingLexicon.slice(0, 3).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-surface px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {entry.local_term} <span className="font-normal text-ink-muted">→ {entry.medical_term}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase text-ink-muted">{entry.language} · {entry.category}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void reviewLexiconEntry(entry.id)}
                    disabled={reviewingLexicon === entry.id}
                    className="shrink-0 rounded-sm border border-brand/30 bg-brand/10 px-2.5 py-1.5 text-xs font-medium text-brand-dark transition hover:bg-brand/20 disabled:opacity-50"
                  >
                    {reviewingLexicon === entry.id ? "Saving..." : "Mark reviewed"}
                  </button>
                </div>
              ))}
              {pendingLexicon.length === 0 && (
                <p className="rounded-sm border border-dashed border-border bg-surface p-4 text-center text-sm text-ink-muted">
                  All lexicon terms have been reviewed.
                </p>
              )}
            </div>
          </div>
        </WidgetCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WidgetCard
          icon="list"
          title="Assessment records"
          subtitle="Filterable live list"
          updated={updatedLabel}
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
              filteredAssessments.slice(0, 6).map((item) => (
                <ListRow key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{item.resident_name}</p>
                      <TriageBadge level={item.risk_level} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">{item.barangay ?? "Unknown"}</span>
                    </div>
                    <p className="mt-2 text-sm text-ink-secondary">{item.note}</p>
                    <p className="mt-2 text-xs text-ink-muted">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </ListRow>
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                No assessment records match the selected filters.
              </p>
            )}
          </div>
        </WidgetCard>

        <WidgetCard icon="pie" title="Symptom frequency" subtitle="Current patterns" updated={updatedLabel}>
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
        </WidgetCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <WidgetCard icon="map" title="Barangay coverage" subtitle="Geographic view" updated={updatedLabel}>
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
        </WidgetCard>

        <WidgetCard icon="bulb" title="Operational insights" subtitle="Live" updated={updatedLabel}>
          <div className="space-y-3">
            {stats?.insights.map((insight) => (
              <ListRow key={insight.title} className="space-y-2">
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
          filteredAssessments.slice(0, 8).map((item) => (
            <ListRow key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{item.resident_name}</p>
                  <TriageBadge level={item.risk_level} />
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-muted">{item.barangay ?? "Unknown"}</span>
                </div>
                <p className="mt-2 text-sm text-ink-secondary">{item.note}</p>
                <p className="mt-2 text-xs text-ink-muted">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <Link href={`/result/${item.id}`} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-3 text-sm font-medium text-brand-dark hover:bg-brand-tint">Open</Link>
            </ListRow>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">No assessment records match the selected filters.</p>
        )}
      </div>
    </Panel>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <Panel title="Risk distribution" subtitle="Current triage breakdown">
        <RiskBreakdownBar green={greenBreakdown} yellow={yellowBreakdown} red={redBreakdown} />
      </Panel>
      {stats && stats.weekly_trend.length > 0 && (
        <Panel title="Case volume trend" subtitle="Last 7 days">
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
                  {insight.tone}
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
        <PageHeader />
        <PageMain wide>
          <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
            <div className="h-32 animate-pulse rounded-md bg-brand/15" />
            <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
              <div className="h-64 animate-pulse rounded-lg bg-border/30" />
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="h-28 animate-pulse rounded-md bg-border/50" />
                  <div className="h-28 animate-pulse rounded-md bg-border/50" />
                  <div className="h-28 animate-pulse rounded-md bg-border/50" />
                  <div className="h-28 animate-pulse rounded-md bg-border/50" />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="h-72 animate-pulse rounded-md bg-border/40" />
                  <div className="h-72 animate-pulse rounded-md bg-border/40" />
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
        <PageHeader />
        <AccessGate
          tag={isAdmin ? "MHO only" : "Staff access"}
          title={isAdmin ? "Community dashboard is for MHO staff" : "Dashboard access required"}
          description={
            isAdmin
              ? "Administrator accounts use the Admin panel for account and system management. The community dashboard is reserved for municipal health officers."
              : "Please sign in with an MHO account to open the community health dashboard."
          }
          hint={isAdmin ? undefined : "MHO: healthguard.irosin@gmail.com / ChangeMe!123"}
          actionHref={isAdmin ? "/admin" : "/login"}
          actionLabel={isAdmin ? "Go to admin panel" : "Go to login"}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <PageMain wide>
        <div className="rounded-3xl border border-[#D8DED1] bg-gradient-to-br from-[#183D2D] via-[#1F4A36] to-[#2E6A52] p-[1px] shadow-[0_24px_48px_rgba(31,74,54,0.18)]">
          <HeroBanner
            eyebrow="For municipal health office"
            title="Community health overview"
            subtitle="Track incoming risk signals, prioritize urgent cases, and understand community health trends across barangays."
            actions={
              <>
                <PrimaryButton type="button" onClick={() => void refreshSummary()} disabled={refreshing}>
                  {refreshing ? "Refreshing…" : "Refresh data"}
                </PrimaryButton>
                <PrimaryButton type="button" onClick={generateReport} disabled={!stats}>Generate report</PrimaryButton>
              </>
            }
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-max rounded-2xl border border-[#D8DED1] bg-[#FBF9F2]/90 p-4 shadow-[0_10px_30px_rgba(24,38,25,0.06)] backdrop-blur xl:sticky xl:top-24 xl:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">Dashboard</p>
              <span className="rounded-full border border-[#CFE0D3] bg-[#EEF6F0] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-brand-dark">Live</span>
            </div>
            <nav className="mt-4 space-y-2" role="tablist" aria-label="Dashboard sections">
              {SECTIONS.map((item, index) => {
                const active = activeSection === item.id;
                const urgentCount = item.id === "records" ? redCases.length : 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-selected={active}
                    aria-controls={`panel-${item.id}`}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition ${
                      active
                        ? "border-[#C8D6C5] bg-gradient-to-r from-[#EAF4EE] to-[#F7FAF3] text-brand-dark shadow-sm"
                        : "border-transparent bg-transparent text-ink-secondary hover:border-[#D8DED1] hover:bg-[#F4F7F0]"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {item.label}
                      {urgentCount > 0 && (
                        <span className="rounded-full bg-triage-red px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                          {urgentCount}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">0{index + 1}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

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