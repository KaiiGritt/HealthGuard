"use client";

import { useEffect, useMemo, useState } from "react";
import Disclaimer from "../components/Disclaimer";
import PageHeader from "../components/PageHeader";
import { useDashboardText } from "../components/dashboardLanguage";
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
import { createLexiconEntry, getAdminModules, getAdminSummary, getMe, previewAdminRules, updateUserRole, updateUserStatus, type AdminRulePreview, type User } from "@/lib/api";
import { IconClipboard } from "@/app/components/ui/icons";

const adminNav = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "lexicon", label: "Lexicon" },
  { id: "rules", label: "Triage rules" },
  { id: "settings", label: "Settings" },
] as const;

const LEXICON_PAGE_SIZE = 8;
const USER_PAGE_SIZE = 4;

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
  biomedical_lexicon_active: boolean;
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
  const t = useDashboardText();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminSummary>> | null>(null);
  const [modules, setModules] = useState<AdminPageState | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [lexiconQuery, setLexiconQuery] = useState("");
  const [lexiconPage, setLexiconPage] = useState(1);
  const [rulePreview, setRulePreview] = useState("");
  const [rulePreviewResult, setRulePreviewResult] = useState<AdminRulePreview | null>(null);
  const [rulePreviewError, setRulePreviewError] = useState<string | null>(null);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);
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

  async function generateReport() {
    if (!modules) return;

    try {
      const { downloadReport } = await import("@/lib/report");
      const downloaded = downloadReport({
        title: "System Administration Report",
        subtitle: "HealthGuard admin summary",
        generatedAt: new Date().toLocaleString(),
        filename: `healthguard-admin-report-${new Date().toISOString().slice(0, 10)}`,
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
        message: t(downloaded ? "PDF report downloaded successfully." : "Could not download the report."),
        tone: downloaded ? "success" : "error",
      });
    } catch (error) {
      console.error("Could not generate the administration report.", error);
      setToast({ message: t("Could not download the report."), tone: "error" });
    }
  }

  const refreshAdminData = async () => {
    const [summary, moduleData] = await Promise.all([getAdminSummary(), getAdminModules()]);
    setStats(summary);
    setModules({
      users: moduleData.users,
      lexicon_entries: moduleData.lexicon_entries,
      biomedical_lexicon_active: moduleData.biomedical_lexicon_active,
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
            biomedical_lexicon_active: moduleData.biomedical_lexicon_active,
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
    const query = userSearch.trim().toLowerCase();
    return modules.users.filter((userItem) => {
      const matchesRole = roleFilter === "all" || userItem.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? userItem.is_active : !userItem.is_active);
      const matchesSearch =
        !query ||
        [userItem.full_name, userItem.email, userItem.role, userItem.barangay ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [modules, roleFilter, statusFilter, userSearch]);
  const userPageCount = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * USER_PAGE_SIZE,
    userPage * USER_PAGE_SIZE,
  );
  const userStart = filteredUsers.length === 0 ? 0 : (userPage - 1) * USER_PAGE_SIZE + 1;
  const userEnd = Math.min(userPage * USER_PAGE_SIZE, filteredUsers.length);

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
  const lexiconPageCount = Math.max(1, Math.ceil(filteredLexicon.length / LEXICON_PAGE_SIZE));
  const paginatedLexicon = filteredLexicon.slice(
    (lexiconPage - 1) * LEXICON_PAGE_SIZE,
    lexiconPage * LEXICON_PAGE_SIZE,
  );
  const lexiconStart = filteredLexicon.length === 0 ? 0 : (lexiconPage - 1) * LEXICON_PAGE_SIZE + 1;
  const lexiconEnd = Math.min(lexiconPage * LEXICON_PAGE_SIZE, filteredLexicon.length);

  useEffect(() => {
    setUserPage(1);
  }, [roleFilter, statusFilter, userSearch]);

  useEffect(() => {
    setUserPage((page) => Math.min(page, userPageCount));
  }, [userPageCount]);

  useEffect(() => {
    setLexiconPage(1);
  }, [lexiconQuery]);

  useEffect(() => {
    setLexiconPage((page) => Math.min(page, lexiconPageCount));
  }, [lexiconPageCount]);
  const pendingReviewCount = modules?.lexicon_entries.filter((entry) => !entry.reviewed).length ?? 0;

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
      setToast({ message: t(nextStatus ? "User activated." : "User deactivated."), tone: "success" });
    } catch {
      setToast({ message: t("Could not update user status."), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  };


  const handleRoleChange = async (userId: number, nextRole: string) => {
    setPendingAction(userId);
    try {
      await updateUserRole(userId, nextRole);
      await refreshAdminData();
      setToast({ message: t("User role updated."), tone: "success" });
    } catch {
      setToast({ message: t("Could not update user role."), tone: "error" });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRulePreview = async () => {
    const inputText = rulePreview.trim();
    if (!inputText || rulePreviewLoading) return;

    setRulePreviewLoading(true);
    setRulePreviewError(null);
    setRulePreviewResult(null);
    try {
      setRulePreviewResult(await previewAdminRules(inputText));
    } catch (error) {
      setRulePreviewError(error instanceof Error ? error.message : t("Could not run the triage preview."));
    } finally {
      setRulePreviewLoading(false);
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
      setToast({ message: t("Lexicon term added."), tone: "success" });
    } catch {
      setToast({ message: t("Could not add lexicon term."), tone: "error" });
    }
  };

  if (loading) {
    return (
      <>
        <PageMain wide>
          <div className="space-y-6" aria-busy="true" aria-label={t("Loading admin dashboard")}>
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
          tag={t(isMho ? "Admin only" : "Admin access")}
          title={t(isMho ? "Admin panel is for administrators" : "Admin access required")}
          description={
            isMho
              ? t("MHO staff should use the community dashboard to review assessments and barangay trends. System administration is limited to administrator accounts.")
              : t("Please sign in with an administrator account to open the admin panel.")
          }
          hint={isMho ? undefined : t("Restricted access for authorized administrators only")}
          actionHref={isMho ? "/dashboard" : "/login"}
          actionLabel={t(isMho ? "Go to community dashboard" : "Go to login")}
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
            eyebrow={t("For administrators")}
            title={t("Administration center")}
            subtitle={t("Oversee accounts, govern the multilingual biomedical symptom lexicon, tune rule logic, and protect platform integrity for the municipal health system.")}
            actions={
              <PrimaryButton type="button" onClick={generateReport} disabled={!modules} className="dashboard-report-button rounded-xl px-5 text-sm font-semibold">
                <IconClipboard size={17} />
                <span>{t("Generate report")}</span>
              </PrimaryButton>
            }
          />
        </div>

        <nav aria-label={t("Admin sections")} className="mt-4 grid grid-cols-5 gap-1.5 rounded-[20px] border border-[#D7E0D2] bg-[linear-gradient(180deg,#FBFCF9_0%,#F1F5EE_100%)] p-1.5 shadow-[0_10px_28px_rgba(24,38,25,0.06)] md:hidden">
          {adminNav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToSection(item.id)}
              aria-current={activeSection === item.id ? "page" : undefined}
              className={`min-w-0 rounded-[14px] px-1 py-3 text-[11px] font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-1 ${activeSection === item.id ? "bg-[linear-gradient(145deg,#367A59_0%,#22523C_100%)] text-white shadow-[0_7px_16px_rgba(31,74,54,0.22)] ring-1 ring-inset ring-white/20" : "text-ink-muted hover:bg-white/85 hover:text-brand-dark"}`}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="mt-6 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
          <aside className="relative hidden overflow-hidden rounded-[24px] border border-[#D7E0D2] bg-[linear-gradient(180deg,#FBF9F2_0%,#F2F6EE_100%)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] md:sticky md:top-24 md:block md:p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">{t("Admin")}</p>
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
                  <span>{t(item.label)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted">0{index + 1}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-6">
            <section id="admin-overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats?.summary_cards.map((card) => (
                <StatCard key={card.label} label={t(card.label)} value={card.value} hint={t(card.hint)} />
              ))}
            </section>

            <section id="admin-users" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel
                title={t("User account management")}
                subtitle={t("A clear view of every account, its access level, and status.")}
                badge={<TagBadge tone="neutral">{modules?.users.length ?? 0} {t("total accounts")}</TagBadge>}
              >
                <div className="mb-5 rounded-2xl border border-[#E3E9DF] bg-[linear-gradient(145deg,#F7FAF5_0%,#F0F5EE_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-4">
                  <label className="relative block">
                    <span className="sr-only">{t("Search accounts by name, email, role, or barangay")}</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-muted">
                      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <input
                      type="search"
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder={t("Search name, email, or barangay")}
                      className="min-h-11 w-full rounded-xl border border-[#DDE7DB] bg-white pl-10 pr-3.5 text-sm text-ink shadow-[0_4px_12px_rgba(24,38,25,0.035)] outline-none transition placeholder:text-ink-faint hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/10"
                    />
                  </label>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <PremiumSelect value={roleFilter} onChange={setRoleFilter} ariaLabel={t("Filter users by role")} options={[{ value: "all", label: t("All roles") }, { value: "resident", label: t("Resident") }, { value: "mho", label: "MHO" }, { value: "admin", label: t("Admin") }]} />
                    <PremiumSelect value={statusFilter} onChange={setStatusFilter} ariaLabel={t("Filter users by account status")} options={[{ value: "all", label: t("All statuses") }, { value: "active", label: t("Active") }, { value: "inactive", label: t("Deactivated") }]} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#DFE7DA] pt-3">
                    <p className="text-xs font-medium text-ink-muted" aria-live="polite">
                      {t("Showing")} <span className="font-semibold tabular-nums text-ink">{filteredUsers.length}</span> {t("of")} {modules?.users.length ?? 0} {t("accounts")}
                    </p>
                    {userSearch || roleFilter !== "all" || statusFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch("");
                          setRoleFilter("all");
                          setStatusFilter("all");
                        }}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-dark transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                      >
                        {t("Clear filters")}
                      </button>
                    ) : (
                      <p className="text-xs text-ink-faint">
                        <span className="font-semibold text-brand-dark">{modules?.users.filter((user) => user.is_active).length ?? 0}</span> {t("active")}
                        <span className="px-1.5 text-[#B6C2B2]">·</span>
                        <span className="font-semibold text-ink-secondary">{modules?.users.filter((user) => !user.is_active).length ?? 0}</span> {t("deactivated")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredUsers.length > 0 ? (
                    paginatedUsers.map((entry) => (
                      <ListRow key={entry.id} className="flex flex-col gap-4 border-[#E0E8DC] bg-white/80 p-4 shadow-[0_6px_18px_rgba(24,38,25,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:bg-white hover:shadow-[0_14px_28px_rgba(24,38,25,0.08)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-gradient-to-br from-[#E7F0E7] to-[#D4E5D6] font-display text-lg font-semibold text-brand-dark shadow-[0_4px_12px_rgba(31,74,54,0.12)] ring-1 ring-brand/10" aria-hidden="true">
                            {entry.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold text-ink">{entry.full_name}</p>
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${entry.is_active ? "border-[#C9E2CB] bg-[#EFF7EF] text-[#28613B]" : "border-[#E1E5DF] bg-[#F3F4F1] text-ink-muted"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${entry.is_active ? "bg-[#3F8A52]" : "bg-[#9AA39A]"}`} aria-hidden="true" />
                                {t(entry.is_active ? "Active" : "Deactivated")}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm text-ink-muted">{entry.email}</p>
                            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-ink-faint">
                              <span className="rounded-md bg-[#F0F4EF] px-2 py-0.5 font-semibold uppercase tracking-[0.06em] text-ink-secondary">{t(entry.role === "resident" ? "Resident" : entry.role === "admin" ? "Admin" : "MHO")}</span>
                              <span aria-hidden="true" className="text-[#B6C2B2]">·</span>
                              <span className="truncate">{entry.barangay ?? t("No barangay recorded")}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                          <PremiumSelect value={entry.role} onChange={(value) => void handleRoleChange(entry.id, value)} ariaLabel={`${t("Change role for")} ${entry.full_name}`} disabled={pendingAction === entry.id} className="w-full sm:w-28" options={[{ value: "resident", label: t("Resident") }, { value: "mho", label: "MHO" }, { value: "admin", label: t("Admin") }]} />
                          {entry.is_active && confirmingDeactivate === entry.id ? (
                            <div className="flex w-full items-center gap-2 sm:w-auto">
                              <button type="button" onClick={() => void handleToggleUserStatus(entry.id, false)} disabled={pendingAction === entry.id} className="min-h-10 flex-1 rounded-xl border border-red-200 bg-red-tint px-3 py-2 text-sm font-semibold text-emergency-red transition hover:bg-red-100 sm:flex-none">
                                {pendingAction === entry.id ? t("Saving...") : t("Confirm deactivate")}
                              </button>
                              <button type="button" onClick={() => setConfirmingDeactivate(null)} className="min-h-10 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-brand/30 hover:text-brand-dark">{t("Cancel")}</button>
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
                              {pendingAction === entry.id ? t("Saving...") : entry.is_active ? t("Deactivate") : t("Activate")}
                            </button>
                          )}
                        </div>
                      </ListRow>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#D7E2D4] bg-[#FAFCF9] px-5 py-8 text-center">
                      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2EADF] bg-white text-ink-muted shadow-sm" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                          <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        </svg>
                      </span>
                      <p className="mt-3 font-semibold text-ink">{t("No matching accounts")}</p>
                      <p className="mt-1 text-sm text-ink-muted">{t("Try another search or clear the selected filters.")}</p>
                    </div>
                  )}
                </div>
                {filteredUsers.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
                    <p className="text-xs text-ink-muted">{t("Showing")} {userStart}-{userEnd} {t("of")} {filteredUsers.length}</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setUserPage((page) => Math.max(1, page - 1))} disabled={userPage === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Previous")}</button>
                      <span className="min-w-16 text-center font-mono text-xs text-ink-muted">{t("Page")} {userPage} / {userPageCount}</span>
                      <button type="button" onClick={() => setUserPage((page) => Math.min(userPageCount, page + 1))} disabled={userPage === userPageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Next")}</button>
                    </div>
                  </div>
                ) : null}
              </Panel>

              <Panel title={t("System settings")} badge={<TagBadge>{t("Operational")}</TagBadge>}>
                <div className="space-y-3">
                  {modules?.system_settings.map((setting) => (
                    <ListRow key={setting.key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{t(setting.label)}</p>
                        <p className="mt-1 text-sm text-ink-muted">{setting.value}</p>
                      </div>
                      <TagBadge tone={setting.status === "Operational" || setting.status === "Compliant" ? "brand" : "neutral"}>{t(setting.status)}</TagBadge>
                    </ListRow>
                  ))}
                </div>
              </Panel>
            </section>

            <section id="admin-lexicon" className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title={t("Multilingual biomedical symptom lexicon")} badge={<TagBadge>{t("Layer 1 & 2")}</TagBadge>} className="hover:-translate-y-0.5">
                <div className="space-y-5">
                  <label className="relative block">
                    <span className="sr-only">{t("Search the symptom lexicon")}</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted">
                      <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" />
                      <path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <input
                      value={lexiconQuery}
                      onChange={(event) => setLexiconQuery(event.target.value)}
                      placeholder={t("Search English, Tagalog, Bikol, category, or language")}
                      className="min-h-12 w-full rounded-xl border border-[#DDE7DB] bg-white pl-12 pr-4 text-sm text-ink shadow-[0_6px_18px_rgba(24,38,25,0.035)] outline-none transition placeholder:text-ink-faint hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/10"
                    />
                  </label>
                  <div className="rounded-2xl border border-[#E3E9DF] bg-[linear-gradient(135deg,#F7FAF5_0%,#F0F5EE_100%)] p-4 sm:p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-ink">{t("Add a lexicon term")}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{t("Connect a local phrase to its medical meaning.")}</p>
                      </div>
                      <span className="hidden rounded-xl border border-brand/10 bg-white p-2 text-brand-dark shadow-sm sm:inline-flex" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                          <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        </svg>
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">{t("Local term")}</span>
                        <input
                          value={newLexicon.local_term}
                          onChange={(event) => setNewLexicon((prev) => ({ ...prev, local_term: event.target.value }))}
                          placeholder={t("e.g. sakit an tiyan", "hal. sakit an tiyan")}
                          className="min-h-11 w-full rounded-xl border border-[#DDE7DB] bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/10"
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">{t("Medical term")}</span>
                        <input
                          value={newLexicon.medical_term}
                          onChange={(event) => setNewLexicon((prev) => ({ ...prev, medical_term: event.target.value }))}
                          placeholder={t("e.g. chest pain", "hal. pananakit ng dibdib")}
                          className="min-h-11 w-full rounded-xl border border-[#DDE7DB] bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand focus:ring-4 focus:ring-brand/10"
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">{t("Language")}</span>
                        <PremiumSelect value={newLexicon.language} onChange={(value) => setNewLexicon((prev) => ({ ...prev, language: value }))} ariaLabel={t("Lexicon language")} className="w-full" options={[{ value: "en", label: "English" }, { value: "tl", label: "Tagalog" }, { value: "bcl", label: "Bikol" }]} />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-secondary">{t("Severity weight")}</span>
                        <input
                          type="number"
                          min={0}
                          max={6}
                          value={newLexicon.severity_weight}
                          onChange={(event) => setNewLexicon((prev) => ({ ...prev, severity_weight: Math.min(6, Number(event.target.value) || 1) }))}
                          className="min-h-11 w-full rounded-xl border border-[#DDE7DB] bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                        />
                      </label>
                      <div className="flex items-end">
                        <button type="button" onClick={() => void handleAddLexiconEntry()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#183D2D] to-[#2E6A52] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(31,74,54,0.2)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(31,74,54,0.25)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20">
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          {t("Add term")}
                        </button>
                      </div>
                    </div>
                  </div>
                  <section id="admin-custom-lexicon" className="min-w-0 overflow-hidden rounded-2xl border border-[#DDE7DB] bg-white shadow-[0_12px_30px_rgba(24,38,25,0.045)]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7ECE3] bg-[linear-gradient(135deg,#FFFFFF_0%,#F6F9F4_100%)] px-4 py-4 sm:px-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-dark" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                            <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </span>
                        <div>
                          <h3 className="font-display text-lg font-semibold text-ink sm:text-xl">{t("Custom bilingual layer")}</h3>
                          <p className="mt-0.5 text-xs text-ink-muted">{t("Terms available for review and editing")}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <TagBadge>{filteredLexicon.length} records</TagBadge>
                        {pendingReviewCount > 0 ? <TagBadge tone="staff">{pendingReviewCount} {t("pending review")}</TagBadge> : null}
                      </div>
                    </div>
                    {filteredLexicon.length > 0 ? (
                      <>
                        <div className="hidden max-h-[32rem] overflow-auto md:block">
                        <table className="w-full min-w-[560px] text-left text-sm">
                          <thead className="sticky top-0 z-10 bg-[#F7FAF5] text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                            <tr>
                              <th className="px-4 py-3 font-medium">{t("Term")}</th>
                              <th className="px-4 py-3 font-medium">{t("Normalized to")}</th>
                              <th className="px-4 py-3 font-medium">{t("Severity")}</th>
                              <th className="px-4 py-3 font-medium">{t("Review")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {paginatedLexicon.map((entry) => (
                              <tr key={entry.id} className="bg-white transition-colors hover:bg-[#F7FAF5]">
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-ink">{entry.local_term}</p>
                                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{entry.language} · {entry.category}</p>
                                </td>
                                <td className="px-4 py-3 text-ink-secondary"><span className="rounded-lg bg-[#F2F6F0] px-2.5 py-1 font-medium text-ink">{entry.medical_term}</span></td>
                                <td className="px-4 py-3"><span className="inline-flex min-w-8 justify-center rounded-lg border border-[#E2E9DF] bg-[#F8FAF7] px-2 py-1 font-mono text-xs font-semibold text-ink-secondary">{entry.severity_weight}</span></td>
                                <td className="px-4 py-3 text-xs text-ink-muted">
                                  {entry.reviewed ? <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ${entry.review_status === "rejected" ? "bg-red-tint text-emergency-red" : "bg-brand-tint text-brand-dark"}`}>{t(entry.review_status === "rejected" ? "Not approved" : "Reviewed")} · {entry.reviewed_by ?? t("reviewer")}</span> : <span className="inline-flex rounded-full bg-yellow-tint px-2.5 py-1 font-medium text-warn-amber">{t("Pending review")}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                        <div className="space-y-2 p-3 md:hidden">
                        {paginatedLexicon.map((entry) => (
                          <article key={entry.id} className="rounded-xl border border-[#E0E8DC] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAF6_100%)] p-4 shadow-[0_6px_16px_rgba(24,38,25,0.04)] transition hover:border-brand/30 hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words font-semibold text-ink">{entry.local_term}</p>
                                <p className="mt-1 break-words text-xs uppercase text-ink-muted">{entry.language} · {entry.category}</p>
                              </div>
                              <span className="shrink-0 rounded-lg bg-brand-tint px-2 py-1 font-mono text-xs font-semibold text-brand-dark">{t("Weight")} {entry.severity_weight}</span>
                            </div>
                            <p className="mt-3 break-words text-sm text-ink-secondary">{t("Normalized to:")} <span className="font-medium text-ink">{entry.medical_term}</span></p>
                            <p className="mt-2 break-words text-xs text-ink-muted">{entry.reviewed ? `${t(entry.review_status === "rejected" ? "Not approved" : "Reviewed")} ${t("by")} ${entry.reviewed_by ?? t("reviewer")}` : t("Pending review by MHO")}</p>
                          </article>
                        ))}
                        </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                        <p className="text-xs text-ink-muted">{t("Showing")} {lexiconStart}-{lexiconEnd} {t("of")} {filteredLexicon.length}</p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setLexiconPage((page) => Math.max(1, page - 1))} disabled={lexiconPage === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Previous")}</button>
                          <span className="min-w-16 text-center font-mono text-xs text-ink-muted">{t("Page")} {lexiconPage} / {lexiconPageCount}</span>
                          <button type="button" onClick={() => setLexiconPage((page) => Math.min(lexiconPageCount, page + 1))} disabled={lexiconPage === lexiconPageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Next")}</button>
                        </div>
                      </div>
                      </>
                    ) : <p className="p-5 text-sm text-ink-muted">{t("No custom entries are available.")}</p>}
                  </section>
                </div>
              </Panel>

              <Panel title={t("Triage rule configuration")} badge={<TagBadge tone="neutral">{t("Clinical logic")}</TagBadge>}>
                <div className="space-y-3">
                  {modules?.triage_rules.map((rule) => (
                    <ListRow key={rule.name}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{t(rule.name)}</p>
                        <TriageBadge level={rule.severity === "Critical" || rule.severity === "High" ? "RED" : rule.severity === "Medium" ? "YELLOW" : "GREEN"} />
                      </div>
                        <p className="mt-2 break-words text-sm text-ink-secondary">{t("Condition:")} {t(rule.condition)}</p>
                        <p className="mt-1 break-words text-sm text-ink-muted">{t("Action:")} {t(rule.action)}</p>
                    </ListRow>
                  ))}
                </div>
              </Panel>

            </section>

            <section id="admin-rules">
              <Panel
                title={t("Rule preview")}
                subtitle={t("Test the live triage engine against the current symptom lexicon.")}
                badge={<TagBadge>{t("Live engine")}</TagBadge>}
              >
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleRulePreview();
                  }}
                  className="rounded-2xl border border-[#E3E9DF] bg-[linear-gradient(145deg,#F7FAF5_0%,#F0F5EE_100%)] p-4 sm:p-5"
                >
                  <label htmlFor="rule-preview" className="block text-sm font-semibold text-ink">
                    {t("Symptom description")}
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {t("Enter a current symptom description. The preview runs real symptom matching and triage rules without saving an assessment.")}
                  </p>
                  <textarea
                    id="rule-preview"
                    name="rule-preview"
                    autoComplete="off"
                    required
                    maxLength={5000}
                    rows={3}
                    value={rulePreview}
                    disabled={rulePreviewLoading}
                    placeholder={t("For example: I have had a fever and cough for two days", "Halimbawa: nilalagnat at inuubo ako sa loob ng dalawang araw")}
                    onChange={(event) => {
                      setRulePreview(event.target.value);
                      setRulePreviewResult(null);
                      setRulePreviewError(null);
                    }}
                    className="mt-3 w-full resize-y rounded-xl border border-[#DDE7DB] bg-white px-3.5 py-3 text-sm leading-relaxed text-ink shadow-[0_4px_12px_rgba(24,38,25,0.035)] outline-none transition placeholder:text-ink-faint hover:border-brand/40 focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-wait disabled:opacity-70"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-ink-muted">{t("Up to 5,000 characters · Preview only, no record is created")}</p>
                    <button
                      type="submit"
                      disabled={!rulePreview.trim() || rulePreviewLoading}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#183D2D] to-[#2E6A52] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(31,74,54,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(31,74,54,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {rulePreviewLoading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                          {t("Running preview…")}
                        </>
                      ) : t("Run triage preview")}
                    </button>
                  </div>
                </form>

                {rulePreviewError ? (
                  <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900">
                    {rulePreviewError}
                  </p>
                ) : null}

                {rulePreviewResult ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-[#DDE7DB] bg-white p-4 shadow-[0_8px_22px_rgba(24,38,25,0.045)] sm:p-5" aria-live="polite">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{t("Engine result")}</p>
                        <p className="mt-1 font-display text-lg font-semibold text-ink">{t(rulePreviewResult.risk_level)} {t("risk")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TriageBadge level={rulePreviewResult.risk_level} />
                        <span className="rounded-lg border border-[#E3E9DF] bg-[#F7FAF5] px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-ink">
                          {t("Score")} {rulePreviewResult.score}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{t("Detected symptoms")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rulePreviewResult.detected_symptoms.map((symptom) => (
                          <span key={symptom.medical_term} className="rounded-lg border border-[#DDE7DB] bg-[#F7FAF5] px-2.5 py-1 text-sm font-medium text-ink">
                            {symptom.medical_term}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#E5EBE1] bg-[#FAFCF9] p-3.5">
                      <p className="text-sm font-semibold text-ink">{t("Why this result")}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{rulePreviewResult.reason}</p>
                      <p className="mt-3 text-sm font-semibold text-ink">{t("Recommendation")}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{rulePreviewResult.recommendation}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{t("Triggered rules")}</p>
                      {rulePreviewResult.triggered_rules.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {rulePreviewResult.triggered_rules.map((rule, index) => (
                            <li key={`${rule.name}-${index}`} className="rounded-xl border border-[#E5EBE1] bg-white p-3">
                              <p className="text-sm font-semibold text-ink">{t(rule.name.replaceAll("-", " "))}</p>
                              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{t(rule.description)}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-ink-muted">{t("No individual rule explanation was returned.")}</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </Panel>
            </section>

            <section id="admin-settings" className="rounded-md border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">{t("Data privacy and security")}</h2>
                <TagBadge>{t("RA 10173 aligned")}</TagBadge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {modules?.privacy_controls.map((control) => (
                  <ListRow key={control.title}>
                    <p className="font-medium text-ink">{t(control.title)}</p>
                    <p className="mt-2 text-sm text-ink-secondary">{t(control.detail)}</p>
                    <p className="mt-3 text-sm font-medium text-ink-faint">{t(control.status)}</p>
                  </ListRow>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Panel title={t("Recent system activity")}>
                <div className="space-y-3">
                  {stats?.recent_activity.map((item) => (
                    <ListRow key={item.title}>
                      <p className="font-medium text-ink">{t(item.title)}</p>
                      <p className="mt-1 text-sm text-ink-muted">{t(item.detail)}</p>
                    </ListRow>
                  ))}
                </div>
              </Panel>

              <Panel title={t("Admin tools")}>
                <div className="space-y-3">
                  {stats?.admin_tools.map((tool) => (
                    <ListRow key={tool.title}>
                      <h3 className="font-medium text-ink">{t(tool.title)}</h3>
                      <p className="mt-1 text-sm text-ink-secondary">{t(tool.body)}</p>
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
