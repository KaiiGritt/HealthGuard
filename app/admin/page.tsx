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
  PrimaryButton,
  StatCard,
  TagBadge,
  TriageBadge,
} from "@/app/components/ui/primitives";
import { createLexiconEntry, getAdminModules, getAdminSummary, getMe, updateUserRole, updateUserStatus } from "@/lib/api";

const adminNav = ["Overview", "Users", "Lexicon", "Triage rules", "Settings"];

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
  const [currentUser, setCurrentUser] = useState<{ role: UserRole } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminSummary>> | null>(null);
  const [modules, setModules] = useState<AdminPageState | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lexiconQuery, setLexiconQuery] = useState("");
  const [rulePreview, setRulePreview] = useState("difficulty breathing and cough");
  const [pendingAction, setPendingAction] = useState<number | null>(null);
  const [newLexicon, setNewLexicon] = useState({ local_term: "", medical_term: "", language: "en", category: "general", severity_weight: 1 });

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

  const rulePreviewMatches = useMemo(() => {
    if (!modules) return [];
    const text = rulePreview.toLowerCase();
    return modules.triage_rules.filter((rule) => {
      const haystack = `${rule.name} ${rule.condition} ${rule.action}`.toLowerCase();
      return haystack.includes(text.split(" ").filter(Boolean)[0] ?? "") || text.includes(rule.name.toLowerCase().split(" ")[0] ?? "");
    });
  }, [modules, rulePreview]);

  const handleToggleUserStatus = async (userId: number, nextStatus: boolean) => {
    setPendingAction(userId);
    try {
      await updateUserStatus(userId, nextStatus);
      await refreshAdminData();
    } finally {
      setPendingAction(null);
    }
  };

  const handleRoleChange = async (userId: number, nextRole: string) => {
    setPendingAction(userId);
    try {
      await updateUserRole(userId, nextRole);
      await refreshAdminData();
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddLexiconEntry = async () => {
    if (!newLexicon.local_term.trim() || !newLexicon.medical_term.trim()) return;
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
  };

  if (loading) {
    return (
      <>
        <PageHeader />
        <PageMain wide>
          <div className="rounded-md border border-border bg-card p-10 text-center text-ink-muted">Loading admin dashboard…</div>
        </PageMain>
      </>
    );
  }

  if (!currentUser || currentUser.role !== "admin") {
    const isMho = currentUser?.role === "mho";
    return (
      <>
        <PageHeader />
        <AccessGate
          tag={isMho ? "Admin only" : "Admin access"}
          title={isMho ? "Admin panel is for administrators" : "Admin access required"}
          description={
            isMho
              ? "MHO staff should use the community dashboard to review assessments and barangay trends. System administration is limited to administrator accounts."
              : "Please sign in with an administrator account to open the admin panel."
          }
          hint={isMho ? undefined : "acefin24@gmail.com / ChangeMe!123"}
          actionHref={isMho ? "/dashboard" : "/login"}
          actionLabel={isMho ? "Go to community dashboard" : "Go to login"}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader />
      <PageMain wide>
        <HeroBanner
          eyebrow="For administrators"
          title="Administration center"
          subtitle="Oversee accounts, govern the bilingual symptom lexicon, tune rule logic, and protect platform integrity for the municipal health system."
          actions={
            <PrimaryButton type="button">Generate report</PrimaryButton>
          }
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-border bg-card p-4 xl:p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted">Admin</p>
            <nav className="mt-4 space-y-2">
              {adminNav.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-sm border px-3 py-2.5 text-left text-sm font-medium transition ${
                    index === 0
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
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats?.summary_cards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} />
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title="User account management" badge={<TagBadge tone="neutral">Admins and staff</TagBadge>}>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink">
                    <option value="all">All roles</option>
                    <option value="resident">Resident</option>
                    <option value="mho">MHO</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-sm border border-border bg-surface px-3 text-sm text-ink">
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Deactivated</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((entry) => (
                      <ListRow key={entry.id} className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-ink">{entry.full_name}</p>
                              <p className="text-sm text-ink-muted">{entry.email}</p>
                            </div>
                            <TagBadge tone={entry.is_active ? "brand" : "neutral"}>
                              {entry.is_active ? "Active" : "Deactivated"}
                            </TagBadge>
                          </div>
                          <p className="mt-2 text-sm text-ink-muted">
                            {entry.role} • {entry.barangay ?? "No barangay recorded"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={entry.role}
                            onChange={(event) => void handleRoleChange(entry.id, event.target.value)}
                            className="rounded-sm border border-border bg-white px-2 py-2 text-xs text-ink"
                            disabled={pendingAction === entry.id}
                          >
                            <option value="resident">Resident</option>
                            <option value="mho">MHO</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => void handleToggleUserStatus(entry.id, !entry.is_active)}
                            disabled={pendingAction === entry.id}
                            className={`rounded-sm border px-3 py-2 font-medium ${
                              entry.is_active ? "border-border bg-white text-ink-secondary" : "border-brand/30 bg-brand/10 text-brand-dark"
                            }`}
                          >
                            {pendingAction === entry.id ? "Saving..." : entry.is_active ? "Deactivate" : "Activate"}
                          </button>
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

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                  <select
                    value={newLexicon.language}
                    onChange={(event) => setNewLexicon((prev) => ({ ...prev, language: event.target.value }))}
                    className="rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
                  >
                    <option value="en">English</option>
                    <option value="tl">Tagalog</option>
                  </select>
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
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border border-brand/30 bg-brand/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl text-ink">SPECIALIST</h3>
                      <TagBadge tone="neutral">Reference</TagBadge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {filteredLexicon.length > 0 ? (
                        filteredLexicon.slice(0, 3).map((entry) => (
                          <div key={entry.id} className="rounded-sm border border-border bg-white p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-ink">{entry.medical_term}</p>
                              <TagBadge tone="neutral">{entry.language}</TagBadge>
                            </div>
                            <p className="mt-1 text-sm text-ink-muted">Normalized to: {entry.local_term}</p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-sm border border-dashed border-border bg-white/60 p-4 text-sm text-ink-muted">
                          No specialist entries match this search.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl text-ink">Custom bilingual layer</h3>
                      <TagBadge>Editable</TagBadge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {filteredLexicon.length > 0 ? (
                        filteredLexicon.slice(0, 3).map((entry) => (
                          <div key={entry.id} className="rounded-sm border border-border bg-card p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-ink">{entry.local_term}</p>
                              <TagBadge tone={entry.category === "pending" ? "neutral" : "brand"}>{entry.category}</TagBadge>
                            </div>
                            <p className="mt-1 text-sm text-ink-muted">→ {entry.medical_term}</p>
                            <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                              <span>Severity {entry.severity_weight}</span>
                              <span>{entry.language === "en" ? "Reviewed by MHO" : "Pending review"}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-sm border border-dashed border-border bg-white/60 p-4 text-sm text-ink-muted">
                          No custom entries are available.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Triage rule configuration" badge={<TagBadge tone="neutral">Clinical logic</TagBadge>}>
                <div className="space-y-3">
                  {modules?.triage_rules.map((rule) => (
                    <ListRow key={rule.name}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{rule.name}</p>
                        <TriageBadge level={rule.severity.includes("Red") ? "RED" : rule.severity.includes("Yellow") ? "YELLOW" : "GREEN"} />
                      </div>
                      <p className="mt-2 text-sm text-ink-secondary">Condition: {rule.condition}</p>
                      <p className="mt-1 text-sm text-ink-muted">Action: {rule.action}</p>
                    </ListRow>
                  ))}
                </div>
              </Panel>
            </section>

            <section className="rounded-md border border-border bg-card p-5">
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
                          <TriageBadge level={rule.severity.includes("Red") ? "RED" : rule.severity.includes("Yellow") ? "YELLOW" : "GREEN"} />
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

            <section className="rounded-md border border-border bg-card p-5">
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
    </>
  );
}
