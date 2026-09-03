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
import { getDashboardSummary, getMe, getMhoLexicon, markLexiconReviewed, rejectLexiconEntry, type AdminModuleLexiconEntry, type User } from "@/lib/api";
import { openReportForPrinting } from "@/lib/report";

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

function BarangayRanking({ data }: { data: DashboardState["barangay_stats"] }) {
  const sorted = [...data].sort((a, b) => b.urgent - a.urgent || b.total - a.total);
  const max = Math.max(...sorted.map((item) => item.total), 1);

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
      {sorted.map((item, index) => {
        const percentage = (item.total / max) * 100;
        const severity = getSeverity(item.urgent, item.total);

        return (
          <div
            key={item.barangay}
            className="rounded-[20px] border border-[#e4e9df] bg-[linear-gradient(180deg,#ffffff_0%,#f9faf5_100%)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 font-mono text-xs font-bold text-brand-dark">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{item.barangay}</p>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                    {item.total} total • {item.follow_up} follow-up
                  </p>
                </div>
              </div>

              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${severity.tone}`}>
                {severity.label}
              </span>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                <span>Coverage</span>
                <span>{Math.round(percentage)}%</span>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-brand/5 to-transparent" />
                <div
                  className={`relative h-full rounded-full ${severity.bar} transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, 8)}%` }}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 px-2 py-2">
                <div className="font-mono text-base font-semibold text-ink">{item.total}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">Total</div>
              </div>
              <div className="rounded-xl bg-red-50 px-2 py-2">
                <div className="font-mono text-base font-semibold text-emergency-red">{item.urgent}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-emergency-red/80">Urgent</div>
              </div>
              <div className="rounded-xl bg-amber-50 px-2 py-2">
                <div className="font-mono text-base font-semibold text-amber-700">{item.follow_up}</div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-amber-700/80">Follow-up</div>
              </div>
            </div>
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

        <WidgetCard icon="map" title="Barangay heat map" subtitle="Urgency snapshot by location" updated={updatedLabel}>
          <BarangayRanking data={barangayStats} />
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
                    <PrimaryButton type="button" onClick={generateReport} disabled={!stats} className="dashboard-report-button rounded-xl px-5 text-sm font-semibold">
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