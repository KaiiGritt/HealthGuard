"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useMemo, useState } from "react";
import Disclaimer from "../components/Disclaimer";
import PageHeader from "../components/PageHeader";
import {
  AccessGate,
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
// Small local components. Kept in this file rather than added to primitives
// since I haven't seen that file's contents.
// ---------------------------------------------------------------------------

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
    const rows = [
      ["Barangay", "Total cases", "Urgent cases", "Follow-up cases"],
      ...stats.barangay_stats.map((item) => [item.barangay, item.total, item.urgent, item.follow_up]),
      [],
      ["Risk level", "Cases"],
      ...stats.triage_breakdown.map((item) => [item.level, item.value]),
      [],
      ["Week", "Date", "Cases"],
      ...stats.weekly_trend.map((item) => [item.label, item.date, item.count]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `healthguard-mho-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast({ message: "MHO report downloaded.", tone: "success" });
  }

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      const [summary, lexicon] = await Promise.all([getDashboardSummary(), getMhoLexicon()]);
      setStats(summary);
      setLexiconEntries(lexicon);
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
      setLexiconEntries((entries) => entries.map((entry) => entry.id === id ? reviewed : entry));
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

      {stats && stats.weekly_trend.length > 0 && (
        <Panel title="This week" subtitle="Case volume trend" badge={<TagBadge tone="neutral">7-day view</TagBadge>}>
          <TrendSparkline data={stats.weekly_trend} />
        </Panel>
      )}

      <Panel title="Lexicon review queue" subtitle="Validate terms before they are used in triage" badge={<TagBadge tone={lexiconEntries.some((entry) => !entry.reviewed) ? "staff" : "brand"}>{lexiconEntries.filter((entry) => !entry.reviewed).length} pending</TagBadge>}>
        <div className="space-y-3">
          {lexiconEntries.filter((entry) => !entry.reviewed).slice(0, 6).map((entry) => (
            <ListRow key={entry.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{entry.local_term} <span className="font-normal text-ink-muted">→ {entry.medical_term}</span></p>
                <p className="mt-1 text-xs uppercase text-ink-muted">{entry.language} · {entry.category} · severity {entry.severity_weight}</p>
              </div>
              <button type="button" onClick={() => void reviewLexiconEntry(entry.id)} disabled={reviewingLexicon === entry.id} className="rounded-sm border border-brand/30 bg-brand/10 px-3 py-2 text-sm font-medium text-brand-dark hover:bg-brand/20 disabled:opacity-50">
                {reviewingLexicon === entry.id ? "Saving..." : "Mark reviewed"}
              </button>
            </ListRow>
          ))}
          {lexiconEntries.every((entry) => entry.reviewed) ? <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">All lexicon terms have been reviewed.</p> : null}
        </div>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Needs attention"
          subtitle="Red-level cases that require follow-up now"
          badge={
            <TagBadge tone="staff">
              {redCases.length > 0 ? `${redCases.length} urgent` : "Urgent"}
            </TagBadge>
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
        </Panel>

        <Panel title="Risk distribution" subtitle="Current triage breakdown">
          <RiskBreakdownBar green={greenBreakdown} yellow={yellowBreakdown} red={redBreakdown} />
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
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
        </Panel>

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
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
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

        <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="h-max rounded-lg border border-border bg-card p-4 xl:sticky xl:top-24 xl:p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Dashboard</p>
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
                    className={`flex w-full items-center justify-between rounded-sm border px-3 py-2.5 text-left text-sm font-medium transition ${
                      active
                        ? "border-brand/30 bg-brand/10 text-brand-dark"
                        : "border-transparent bg-transparent text-ink-secondary hover:border-border hover:bg-surface"
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