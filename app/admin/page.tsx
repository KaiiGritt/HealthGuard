"use client";

import { useEffect, useMemo, useState } from "react";
import Disclaimer from "../components/Disclaimer";
import PageHeader from "../components/PageHeader";
import {
  AccessGate,
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
import { createLexiconEntry, getAdminModules, getAdminSummary, getMe, updateUserRole, updateUserStatus, type User } from "@/lib/api";
import { openReportForPrinting } from "@/lib/report";
import { IconClipboard } from "@/app/components/ui/icons";

const adminNav = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "lexicon", label: "Lexicon" },
  { id: "rules", label: "Triage rules" },
  { id: "settings", label: "Settings" },
] as const;

type UserRole = "resident" | "mho" | "admin";

type AdminPageState = {
  users: Array<{
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    barangay: string | null;
    created_at: string;
  }>;
  lexicon_entries: Array<{
    id: number;
    local_term: string;
    language: string;
    medical_term: string;
    severity_weight: number;
    category: string;
    reviewed: boolean;
    review_status: "pending" | "approved" | "rejected";
    reviewed_by: string | null;
    reviewed_at: string | null;
  }>;
  triage_rules: Array<{
    name: string;
    severity: string;
    condition: string;
    action: string;
  }>;
  system_settings: Array<{ key: string; label: string; value: string; status: string }>;
  privacy_controls: Array<{ title: string; detail: string; status: string }>;
};

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminSummary>> | null>(null);
  const [modules, setModules] = useState<AdminPageState | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lexiconQuery, setLexiconQuery] = useState("");
  const [rulePreview, setRulePreview] = useState("difficulty breathing and cough");
  const [pendingAction, setPendingAction] = useState<number | null>(null);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [newLexicon, setNewLexicon] = useState({ local_term: "", medical_term: "", language: "en", category: "general", severity_weight: 1 });
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  function goToSection(id: string) {
    setActiveSection(id);

    if (typeof window !== "undefined") {
      const nextUrl = `${window.location.pathname}#${id}`;
      window.history.replaceState(null, "", nextUrl);
    }

    document.getElementById(`admin-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const syncFromHash = () => {
      const hash = (window.location.hash.replace("#", "") || "overview").replace(/^admin-/, "");
      if (adminNav.some((item) => item.id === hash)) {
        setActiveSection(hash);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function generateReport() {
    if (!modules) return;

    const printed = openReportForPrinting({
      title: "System Administration Report",
      subtitle: "HealthGuard admin summary",
      generatedAt: new Date().toLocaleString(),
      sections: [
        {
          heading: "Users",
          rows: modules.users.map((item) => [item.full_name, `${item.role} • ${item.is_active ? "Active" : "Inactive"} • ${item.barangay ?? "No barangay"}`]),
        },
        {
          heading: "Lexicon",
          rows: modules.lexicon_entries.map((item) => [item.local_term, `${item.language} • ${item.medical_term} • ${item.category}`]),
        },
        {
          heading: "Triage rules",
          rows: modules.triage_rules.map((item) => [item.name, `${item.severity} • ${item.condition}`]),
        },
      ],
    });

    setToast({
      message: printed ? "Report ready. Use Save as PDF in the print dialog." : "Could not open the print window.",
      tone: printed ? "success" : "error",
    });
  }

  const refreshAdminData = async () => {
    const [summary, moduleData] = await Promise.all([getAdminSummary(), getAdminModules()]);
    setStats(summary);
    setModules({
      users: moduleData.users,
      lexicon_entries: moduleData.lexicon_entries,
      triage_rules: moduleData.triage_rules,
      system_settings: moduleData.system_settings,
      privacy_controls: moduleData.privacy_controls,
    });
  };

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const user = await getMe();
        if (!active) return;
        setCurrentUser(user);
        if (user?.role === "admin") {
          const [summary, moduleData] = await Promise.all([getAdminSummary(), getAdminModules()]);
          if (!active) return;
          setStats(summary);
          setModules({
            users: moduleData.users,
            lexicon_entries: moduleData.lexicon_entries,
            triage_rules: moduleData.triage_rules,
            system_settings: moduleData.system_settings,
            privacy_controls: moduleData.privacy_controls,
          });
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

  const filteredUsers = useMemo(() => {
    if (!modules) return [];
    return modules.users.filter((userItem) => {
      const matchesRole = roleFilter === "all" || userItem.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? userItem.is_active : !userItem.is_active);
      return matchesRole && matchesStatus;
    });
  }, [modules, roleFilter, statusFilter]);

  const filteredLexicon = useMemo(() => {
    if (!modules) return [];
    const query = lexiconQuery.trim().toLowerCase();
    return modules.lexicon_entries.filter((entry) => {
      if (!query) return true;
      return [entry.local_term, entry.medical_term, entry.category, entry.language]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [modules, lexiconQuery]);
  const pendingReviewCount = modules?.lexicon_entries.filter((entry) => !entry.reviewed).length ?? 0;

  const rulePreviewMatches = useMemo(() => {
    if (!modules) return [];
    const text = rulePreview.toLowerCase();
    return modules.triage_rules.filter((rule) => {
      const haystack = `${rule.name} ${rule.condition} ${rule.action}`.toLowerCase();
      return haystack.includes(text.split(" ").filter(Boolean)[0] ?? "") || text.includes(rule.name.toLowerCase().split(" ")[0] ?? "");
    });
  }, [modules, rulePreview]);

  const handleToggleUserStatus = async (userId: number, nextStatus: boolean) => {
    if (!nextStatus && confirmingDeactivate !== userId) {
      setConfirmingDeactivate(userId);
      return;
    }
    setConfirmingDeactivate(null);
    setPendingAction(userId);
    try {
      await updateUserStatus(userId, nextStatus);
      await refreshAdminData();
      setToast({ message: nextStatus ? "User activated." : "User deactivated.", tone: "success" });
    } catch {
      setToast({ message: "Could not update user status.", tone: "error" });
    } finally {
      setPendingAction(null);
    }
  };


  const handleRoleChange = async (userId: number, nextRole: string) => {
    setPendingAction(userId);
    try {
      await updateUserRole(userId, nextRole);
      await refreshAdminData();
      setToast({ message: "User role updated.", tone: "success" });
    } catch {
      setToast({ message: "Could not update user role.", tone: "error" });
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddLexiconEntry = async () => {
    if (!newLexicon.local_term.trim() || !newLexicon.medical_term.trim()) return;
    try {
      const created = await createLexiconEntry({
      local_term: newLexicon.local_term,
      language: newLexicon.language,
      medical_term: newLexicon.medical_term,
      severity_weight: newLexicon.severity_weight,
      category: newLexicon.category,
      });
      setModules((prev) => {
        if (!prev) return prev;
        return { ...prev, lexicon_entries: [created, ...prev.lexicon_entries] };
      });
      setNewLexicon({ local_term: "", medical_term: "", language: "en", category: "general", severity_weight: 1 });
      setToast({ message: "Lexicon term added.", tone: "success" });
    } catch {
      setToast({ message: "Could not add lexicon term.", tone: "error" });
    }
  };

  if (loading) {
    return (
      <>
        <PageMain wide>
          <div className="space-y-6" aria-busy="true" aria-label="Loading admin dashboard">
            <div className="premium-skeleton h-32 rounded-[24px]" />
            <div className="grid gap-4 md:grid-cols-4"><div className="premium-skeleton h-28 rounded-[22px]" /><div className="premium-skeleton h-28 rounded-[22px]" /><div className="premium-skeleton h-28 rounded-[22px]" /><div className="premium-skeleton h-28 rounded-[22px]" /></div>
            <div className="grid gap-6 lg:grid-cols-2"><div className="premium-skeleton h-80 rounded-[24px]" /><div className="premium-skeleton h-80 rounded-[24px]" /></div>
          </div>
        </PageMain>
      </>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    const isMho = currentUser?.role === "mho";
    return (
      <>
        <AccessGate
          tag={isMho ? "Admin only" : "Admin access"}
          title={isMho ? "Admin panel is for administrators" : "Admin access required"}
          description={
            isMho
              ? "MHO staff should use the community dashboard to review assessments and barangay trends. System administration is limited to administrator accounts."
              : "Please sign in with an administrator account to open the admin panel."
          }
          hint={isMho ? undefined : "Restricted access for authorized administrators only"}
          actionHref={isMho ? "/dashboard" : "/login"}
          actionLabel={isMho ? "Go to community dashboard" : "Go to login"}
        />
      </>
    );
  }

  return (
    <>
      <div className="premium-page min-h-screen">
        <PageHeader />
        <div>
          <PageMain wide>
        <div className="overflow-hidden rounded-[28px] border border-[#D8DED1] bg-[linear-gradient(135deg,#183D2D_0%,#1F4A36_42%,#2E6A52_100%)] p-px shadow-[0_28px_56px_rgba(23,63,45,0.18)]">
          <HeroBanner
            eyebrow="For administrators"
            title="Administration center"
            subtitle="Oversee accounts, govern the bilingual symptom lexicon, tune rule logic, and protect platform integrity for the municipal health system."
            actions={
              <PrimaryButton type="button" onClick={generateReport} disabled={!modules} className="dashboard-report-button rounded-xl px-5 text-sm font-semibold">
                <IconClipboard size={17} />
                <span>Generate report</span>
              </PrimaryButton>
            }
          />
        </div>

        <nav aria-label="Admin sections" className="mt-4 flex gap-2 overflow-x-auto rounded-2xl border border-[#D7E0D2] bg-[#F7F9F5] p-2 md:hidden">
          {adminNav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSection(item.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${activeSection === item.id ? "bg-brand text-white shadow-sm" : "text-ink-secondary hover:bg-white hover:text-brand-dark"}`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
          <aside className="relative hidden overflow-hidden rounded-[24px] border border-[#D7E0D2] bg-[linear-gradient(180deg,#FBF9F2_0%,#F2F6EE_100%)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] md:sticky md:top-24 md:block md:p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Admin</p>
            <nav className="mt-4 space-y-2">
              {adminNav.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToSection(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                    activeSection === item.id
                      ? "border-brand/30 bg-brand/10 text-brand-dark"
                      : "border-transparent bg-transparent text-ink-secondary hover:border-border hover:bg-surface"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">0{index + 1}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <section id="admin-overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats?.summary_cards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
              ))}
            </section>

            <section id="admin-users" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel
                title="User account management"
                subtitle="Review access, roles, and account status across the health system."
                badge={<TagBadge tone="neutral">{modules?.users.length ?? 0} accounts</TagBadge>}
              >
                <div className="mb-5 grid gap-3 rounded-2xl border border-[#E4EBDD] bg-[#F7F9F5] p-3 sm:grid-cols-2">
                  <PremiumSelect value={roleFilter} onChange={setRoleFilter} ariaLabel="Filter users by role" options={[{ value: "all", label: "All roles" }, { value: "resident", label: "Resident" }, { value: "mho", label: "MHO" }, { value: "admin", label: "Admin" }]} />
                  <PremiumSelect value={statusFilter} onChange={setStatusFilter} ariaLabel="Filter users by account status" options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Deactivated" }]} />
                </div>

                <div className="space-y-3">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((entry) => (
                      <ListRow key={entry.id} className="flex flex-col gap-4 border-[#E0E8DC] bg-[linear-gradient(135deg,#F8FAF6_0%,#F1F5EE_100%)] p-4 shadow-[0_8px_20px_rgba(24,38,25,0.035)] transition hover:border-brand/25 hover:shadow-[0_12px_24px_rgba(24,38,25,0.07)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-white font-display text-lg font-semibold text-brand shadow-sm" aria-hidden="true">
                            {entry.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-ink">{entry.full_name}</p>
                              <TagBadge tone={entry.is_active ? "brand" : "neutral"}>
                                {entry.is_active ? "Active" : "Deactivated"}
                              </TagBadge>
                            </div>
                            <p className="mt-1 truncate text-sm text-ink-muted">{entry.email}</p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-faint">
                              {entry.role} <span className="px-1 text-[#B6C2B2]">•</span> {entry.barangay ?? "No barangay recorded"}
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                          <PremiumSelect value={entry.role} onChange={(value) => void handleRoleChange(entry.id, value)} ariaLabel={`Change role for ${entry.full_name}`} disabled={pendingAction === entry.id} className="w-full sm:w-28" options={[{ value: "resident", label: "Resident" }, { value: "mho", label: "MHO" }, { value: "admin", label: "Admin" }]} />
                          {entry.is_active && confirmingDeactivate === entry.id ? (
                            <div className="flex w-full items-center gap-2 sm:w-auto">
                              <button type="button" onClick={() => void handleToggleUserStatus(entry.id, false)} disabled={pendingAction === entry.id} className="min-h-10 flex-1 rounded-xl border border-red-200 bg-red-tint px-3 py-2 text-sm font-semibold text-emergency-red transition hover:bg-red-100 sm:flex-none">
                                {pendingAction === entry.id ? "Saving..." : "Confirm deactivate"}
                              </button>
                              <button type="button" onClick={() => setConfirmingDeactivate(null)} className="min-h-10 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-brand/30 hover:text-brand-dark">Cancel</button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleToggleUserStatus(entry.id, !entry.is_active)}
                              disabled={pendingAction === entry.id}
                              className={`min-h-10 w-full rounded-xl border px-3 py-2 text-sm font-semibold transition sm:w-auto ${
                                entry.is_active ? "border-border bg-white text-ink-secondary" : "border-brand/30 bg-brand/10 text-brand-dark"
                              }`}
                            >
                              {pendingAction === entry.id ? "Saving..." : entry.is_active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      </ListRow>
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-border p-4 text-sm text-ink-muted">
                      No user accounts match the current filters.
                    </p>
                  )}
                </div>
              </Panel>

              <Panel title="System settings" badge={<TagBadge>Operational</TagBadge>}>
                <div className="space-y-3">
                  {modules?.system_settings.map((setting) => (
                    <ListRow key={setting.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{setting.label}</p>
                        <p className="mt-1 text-sm text-ink-muted">{setting.value}</p>
                      </div>
                      <TagBadge tone={setting.status === "Operational" || setting.status === "Compliant" ? "brand" : "neutral"}>{setting.status}</TagBadge>
                    </ListRow>
                  ))}
                </div>
              </Panel>
            </section>

            <section id="admin-lexicon" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title="Bilingual symptom lexicon" badge={<TagBadge>Layer 1 & 2</TagBadge>}>
                <div className="mb-4">
                  <input
                    value={lexiconQuery}
                    onChange={(event) => setLexiconQuery(event.target.value)}
                    placeholder="Search English, Tagalog, category, or language"
                    className="w-full rounded-sm border border-border bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-brand"
                  />
                </div>
                <div className="mb-4 grid gap-3 md:grid-cols-5">
                  <input
                    value={newLexicon.local_term}
                    onChange={(event) => setNewLexicon((prev) => ({ ...prev, local_term: event.target.value }))}
                    placeholder="Local term"
                    className="rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
                  />
                  <input
                    value={newLexicon.medical_term}
                    onChange={(event) => setNewLexicon((prev) => ({ ...prev, medical_term: event.target.value }))}
                    placeholder="Medical term"
                    className="rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
                  />
                  <PremiumSelect value={newLexicon.language} onChange={(value) => setNewLexicon((prev) => ({ ...prev, language: value }))} ariaLabel="Lexicon language" className="w-full" options={[{ value: "en", label: "English" }, { value: "tl", label: "Tagalog" }]} />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={newLexicon.severity_weight}
                    onChange={(event) => setNewLexicon((prev) => ({ ...prev, severity_weight: Number(event.target.value) || 1 }))}
                    className="rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
                  />
                  <button type="button" onClick={() => void handleAddLexiconEntry()} className="rounded-sm bg-brand px-3 py-2 text-sm font-medium text-white">
                    Add term
                  </button>
                </div>
                <div>
                  <section id="admin-custom-lexicon" className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
                      <div>
                        <h3 className="font-display text-xl text-ink">Custom bilingual layer</h3>
                        <p className="mt-1 text-xs text-ink-muted">Terms available for review and editing</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TagBadge>{filteredLexicon.length} records</TagBadge>
                        {pendingReviewCount > 0 ? <TagBadge tone="staff">{pendingReviewCount} pending review</TagBadge> : null}
                      </div>
                    </div>
                    {filteredLexicon.length > 0 ? (
                      <div className="max-h-[32rem] overflow-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-ink-muted">
                            <tr>
                              <th className="px-4 py-3 font-medium">Term</th>
                              <th className="px-4 py-3 font-medium">Normalized to</th>
                              <th className="px-4 py-3 font-medium">Severity</th>
                              <th className="px-4 py-3 font-medium">Review</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {filteredLexicon.map((entry) => (
                              <tr key={entry.id} className="bg-card hover:bg-white">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-ink">{entry.local_term}</p>
                                  <p className="mt-1 text-xs uppercase text-ink-muted">{entry.language} · {entry.category}</p>
                                </td>
                                <td className="px-4 py-3 text-ink-secondary">{entry.medical_term}</td>
                                <td className="px-4 py-3 text-ink-secondary">{entry.severity_weight}</td>
                                <td className="px-4 py-3 text-xs text-ink-muted">
                                  {entry.reviewed ? <span className={entry.review_status === "rejected" ? "text-emergency-red" : "text-brand-dark"}>{entry.review_status === "rejected" ? "Not approved" : "Reviewed"} by {entry.reviewed_by ?? "reviewer"}</span> : "Pending review by MHO"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="p-5 text-sm text-ink-muted">No custom entries are available.</p>}
                  </section>
                </div>
              </Panel>

              <Panel title="Triage rule configuration" badge={<TagBadge tone="neutral">Clinical logic</TagBadge>}>
                <div className="space-y-3">
                  {modules?.triage_rules.map((rule) => (
                    <ListRow key={rule.name}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{rule.name}</p>
                        <TriageBadge level={rule.severity === "Critical" || rule.severity === "High" ? "RED" : rule.severity === "Medium" ? "YELLOW" : "GREEN"} />
                      </div>
                      <p className="mt-2 text-sm text-ink-secondary">Condition: {rule.condition}</p>
                      <p className="mt-1 text-sm text-ink-muted">Action: {rule.action}</p>
                    </ListRow>
                  ))}
                </div>
              </Panel>
            </section>

            <section id="admin-rules" className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg text-ink">Rule preview</h2>
                <TagBadge>Transparent logic</TagBadge>
              </div>
              <div className="mt-4 rounded-md border border-border bg-surface p-4">
                <label className="block text-sm font-medium text-ink-secondary">Sample symptom phrase</label>
                <input
                  value={rulePreview}
                  onChange={(event) => setRulePreview(event.target.value)}
                  className="mt-2 w-full rounded-sm border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
                />
                <div className="mt-4 space-y-2">
                  {rulePreviewMatches.length > 0 ? (
                    rulePreviewMatches.map((rule) => (
                      <div key={rule.name} className="rounded-sm border border-border bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-ink">{rule.name}</p>
                          <TriageBadge level={rule.severity === "Critical" || rule.severity === "High" ? "RED" : rule.severity === "Medium" ? "YELLOW" : "GREEN"} />
                        </div>
                        <p className="mt-2 text-sm text-ink-secondary">{rule.condition}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-ink-muted">No active rule matches this sample phrase.</p>
                  )}
                </div>
              </div>
            </section>

            <section id="admin-settings" className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">Data privacy and security</h2>
                <TagBadge>RA 10173 aligned</TagBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {modules?.privacy_controls.map((control) => (
                  <ListRow key={control.title}>
                    <p className="font-medium text-ink">{control.title}</p>
                    <p className="mt-2 text-sm text-ink-secondary">{control.detail}</p>
                    <p className="mt-3 text-sm font-medium text-ink-faint">{control.status}</p>
                  </ListRow>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title="Recent system activity">
                <div className="space-y-3">
                  {stats?.recent_activity.map((item) => (
                    <ListRow key={item.title}>
                      <p className="font-medium text-ink">{item.title}</p>
                      <p className="mt-1 text-sm text-ink-muted">{item.detail}</p>
                    </ListRow>
                  ))}
                </div>
              </Panel>

              <Panel title="Admin tools">
                <div className="space-y-3">
                  {stats?.admin_tools.map((tool) => (
                    <ListRow key={tool.title}>
                      <h3 className="font-medium text-ink">{tool.title}</h3>
                      <p className="mt-1 text-sm text-ink-secondary">{tool.body}</p>
                    </ListRow>
                  ))}
                </div>
              </Panel>
            </section>
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
