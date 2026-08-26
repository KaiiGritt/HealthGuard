"use client";

import Link from "next/link";
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
  PrimaryLink,
  StatCard,
  TagBadge,
  TriageBadge,
} from "@/app/components/ui/primitives";
import { getDashboardSummary, getMe } from "@/lib/api";

const dashboardNav = ["Overview", "Assessment records", "Analytics", "Reports"];

type UserRole = "resident" | "mho" | "admin";

type DashboardState = Awaited<ReturnType<typeof getDashboardSummary>>;

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardState | null>(null);
  const [riskFilter, setRiskFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState("Overview");

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      const summary = await getDashboardSummary();
      setStats(summary);
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
          const summary = await getDashboardSummary();
          if (!active) return;
          setStats(summary);
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

  const redBreakdown = stats?.triage_breakdown.find((item) => (item.level || "").toLowerCase() === "red") ?? { level: "Red", value: 0 };
  const yellowBreakdown = stats?.triage_breakdown.find((item) => (item.level || "").toLowerCase() === "yellow") ?? { level: "Yellow", value: 0 };
  const greenBreakdown = stats?.triage_breakdown.find((item) => (item.level || "").toLowerCase() === "green") ?? { level: "Green", value: 0 };
  const barangayStats = stats?.barangay_stats ?? [];
  const maxBarangayCases = Math.max(...barangayStats.map((item) => item.total), 1);

  const renderOverview = () => (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats?.summary_cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Needs attention" subtitle="Red-level cases that require follow-up now" badge={<TagBadge tone="staff">Urgent</TagBadge>}>
          <div className="space-y-3">
            {redCases.length > 0 ? (
              redCases.slice(0, 4).map((item) => (
                <ListRow key={item.id} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
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
          <div className="space-y-5">
            {[
              { label: "Green", value: greenBreakdown.value, color: "bg-triage-green" },
              { label: "Yellow", value: yellowBreakdown.value, color: "bg-triage-yellow" },
              { label: "Red", value: redBreakdown.value, color: "bg-triage-red" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm text-ink-secondary">
                  <span>{item.label}</span>
                  <span className="font-medium text-ink">{item.value}</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface">
                  <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${Math.min(Math.max(item.value * 12, 10), 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Assessment records" badge={<TagBadge tone="neutral">Live list</TagBadge>}>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink">
              <option value="all">All risk levels</option>
              <option value="GREEN">Green</option>
              <option value="YELLOW">Yellow</option>
              <option value="RED">Red</option>
            </select>
            <select value={barangayFilter} onChange={(event) => setBarangayFilter(event.target.value)} className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink">
              <option value="all">All barangays</option>
              {barangayOptions.map((barangay) => (
                <option key={barangay} value={barangay}>{barangay}</option>
              ))}
            </select>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search resident or note"
              className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
            />
          </div>
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
                  <div className="h-2.5 rounded-full bg-brand" style={{ width: `${Math.min(Math.max((item.count || 0) * 18, 10), 100)}%` }} />
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
                  <div className="mt-2 h-5 overflow-hidden rounded-sm bg-surface" style={{ width }} aria-label={`${item.barangay}: ${item.total} total cases, ${item.urgent} urgent, ${item.follow_up} follow-up`}>
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
    </>
  );

  const renderAssessmentRecords = () => (
    <Panel title="Assessment records" badge={<TagBadge tone="neutral">Live list</TagBadge>}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink">
          <option value="all">All risk levels</option>
          <option value="GREEN">Green</option>
          <option value="YELLOW">Yellow</option>
          <option value="RED">Red</option>
        </select>
        <select value={barangayFilter} onChange={(event) => setBarangayFilter(event.target.value)} className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink">
          <option value="all">All barangays</option>
          {barangayOptions.map((barangay) => (
            <option key={barangay} value={barangay}>{barangay}</option>
          ))}
        </select>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search resident or note"
          className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => { setRiskFilter("RED"); setBarangayFilter("all"); setSearchTerm(""); }} className="rounded-sm border border-red-200 bg-red-tint px-3 py-2 text-sm font-medium text-emergency-red">Urgent only</button>
        <button type="button" onClick={() => { setRiskFilter("all"); setBarangayFilter("all"); setSearchTerm(""); }} className="rounded-sm border border-border bg-white px-3 py-2 text-sm font-medium text-ink-secondary">Clear filters</button>
      </div>
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
    <>
      <Panel title="Risk distribution" subtitle="Current triage breakdown">
        <div className="space-y-5">
          {[
            { label: "Green", value: greenBreakdown.value, color: "bg-triage-green" },
            { label: "Yellow", value: yellowBreakdown.value, color: "bg-triage-yellow" },
            { label: "Red", value: redBreakdown.value, color: "bg-triage-red" },
          ].map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm text-ink-secondary">
                <span>{item.label}</span>
                <span className="font-medium text-ink">{item.value}</span>
              </div>
              <div className="h-2.5 rounded-full bg-surface">
                <div className={`${item.color} h-2.5 rounded-full`} style={{ width: `${Math.min(Math.max(item.value * 12, 10), 100)}%` }} />
              </div>
            </div>
          ))}
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
                <div className="h-2.5 rounded-full bg-brand" style={{ width: `${Math.min(Math.max((item.count || 0) * 18, 10), 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );

  const renderReports = () => (
    <>
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
                <div className="mt-2 h-5 overflow-hidden rounded-sm bg-surface" style={{ width }} aria-label={`${item.barangay}: ${item.total} total cases, ${item.urgent} urgent, ${item.follow_up} follow-up`}>
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
    </>
  );

  if (loading) {
    return (
      <>
        <PageHeader />
        <PageMain wide>
          <div className="rounded-md border border-border bg-card p-10 text-center text-ink-muted">Loading dashboard…</div>
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
              <PrimaryLink href="/assessment">Launch assessment</PrimaryLink>
              <Link
                href="/history"
                className="inline-flex min-h-14 items-center justify-center rounded-sm border border-border bg-transparent px-7 text-base font-medium text-brand-dark transition hover:border-brand/50 hover:bg-brand-tint"
              >
                Review latest history
              </Link>
            </>
          }
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-border bg-card p-4 xl:p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Dashboard</p>
            <nav className="mt-4 space-y-2">
              {dashboardNav.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveSection(item)}
                  className={`flex w-full items-center justify-between rounded-sm border px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeSection === item
                      ? "border-brand/30 bg-brand/10 text-brand-dark"
                      : "border-transparent bg-transparent text-ink-secondary hover:border-border hover:bg-surface"
                  }`}
                >
                  <span>{item}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">0{index + 1}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            {activeSection === "Overview" && renderOverview()}
            {activeSection === "Assessment records" && renderAssessmentRecords()}
            {activeSection === "Analytics" && renderAnalytics()}
            {activeSection === "Reports" && renderReports()}
          </div>
        </div>

        <div className="mt-6">
          <Disclaimer />
        </div>
      </PageMain>
    </>
  );
}
