"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Disclaimer from "../components/Disclaimer";
import MedicalTermLabel from "../components/MedicalTermLabel";
import PageHeader from "../components/PageHeader";
import { useDashboardText } from "../components/dashboardLanguage";
import { useInterfaceLanguage } from "../components/LanguageProvider";
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
import { addAssessmentCaseActivity, formatAssessmentRecordNumber, getDashboardSummary, getMe, getMhoLexicon, markLexiconReviewed, rejectLexiconEntry, type AdminModuleLexiconEntry, type DashboardAssessmentItem, type User } from "@/lib/api";
import { generateCommunityHealthReport } from "@/lib/communityHealthReport";
import { getReportedSymptomClassifications } from "@/lib/coughClassifications";
import { getMedicalTerm } from "../assessment/medicalTerms";

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
const SCORING_RULE_NAMES = new Set([
  "duration-score",
  "weighted-symptom-score",
  "symptom-combination-score",
  "high-severity-score",
  "moderate-severity-score",
  "mild-severity-score",
]);

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
  const t = useDashboardText();
  return (
    <div
      className={cn(
        "@container flex flex-col rounded-[24px] border border-[#e1e7dc] bg-white/95 shadow-[0_18px_40px_rgba(17,39,28,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(17,39,28,0.08)]",
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
            <h3 className="font-display text-base font-semibold text-ink lg:text-lg">{t(title)}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{t(subtitle)}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
      {updated && (
        <div className="border-t border-border/60 px-5 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{t("Updated")} {updated}</p>
        </div>
      )}
    </div>
  );
}

function formatSubmittedAgo(value: string, t: (phrase: string) => string) {
  const submittedAt = new Date(value).getTime();
  if (!Number.isFinite(submittedAt)) return t("Submitted date unavailable");

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - submittedAt) / 60_000));
  if (elapsedMinutes < 1) return t("Submitted just now");
  if (elapsedMinutes < 60) return `${t("Submitted")} ${elapsedMinutes} ${t("minutes ago")}`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${t("Submitted")} ${elapsedHours} ${t("hours ago")}`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${t("Submitted")} ${elapsedDays} ${t("days ago")}`;
}

function formatAbsoluteDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatBarangay(value: string) {
  const name = value.trim().replace(/^barangay\s+/i, "").replace(/^brgy\.?\s*/i, "");
  return name ? `Brgy. ${name}` : value;
}

function AssessmentCaseCard({
  item,
  asOf,
  onContactLogged,
}: {
  item: DashboardState["recent_assessments"][number];
  asOf: string;
  onContactLogged: (item: DashboardAssessmentItem) => void;
}) {
  const t = useDashboardText();
  const [loggingContact, setLoggingContact] = useState(false);
  const [contactLogError, setContactLogError] = useState<string | null>(null);
  const riskLevel = item.risk_level.toUpperCase();
  const caseType = riskLevel === "RED"
    ? t("Flagged", "Minarkahan")
    : riskLevel === "YELLOW"
      ? t("Follow-up")
      : riskLevel === "GREEN"
        ? t("Routine")
        : t("Needs info", "Kailangan ng impormasyon");
  const residentInitial = item.resident_name.trim().charAt(0).toUpperCase() || "?";
  const accent = riskLevel === "RED"
    ? "from-[#a93627] via-[#d2614d] to-[#f0c2b5]"
    : riskLevel === "YELLOW"
      ? "from-[#9a6b13] via-[#d39b35] to-[#f2dfb6]"
      : riskLevel === "GREEN"
        ? "from-[#286447] via-[#4d8c68] to-[#c3deca]"
        : "from-slate-400 via-slate-300 to-slate-100";
  const lastContact = item.case_activities?.find((activity) => activity.kind === "contacted" || activity.kind === "contact_attempt");
  const lastFollowUp = item.case_activities?.find((activity) => activity.kind === "follow_up");
  const hasContactAttempt = Boolean(lastContact);
  const overdue = riskLevel === "RED"
    && !hasContactAttempt
    && new Date(asOf).getTime() - new Date(item.created_at).getTime() >= 24 * 60 * 60 * 1000;
  const urgencyTerms = item.case_summary.urgency_reasons.map((reason) => reason.toLocaleLowerCase());
  const isUrgencySymptom = (symptom: string) => {
    const normalized = symptom.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return urgencyTerms.some((reason) => {
      const normalizedReason = reason.replace(/[^a-z0-9]+/g, " ").trim();
      return normalizedReason.includes(normalized) || normalized.includes(normalizedReason);
    });
  };
  const explanationRules = item.triggered_rules
    ?.filter((rule) => rule.description.trim() && !SCORING_RULE_NAMES.has(rule.name))
    .slice(0, 2) ?? [];

  async function logCaseActivity(kind: "contacted" | "follow_up") {
    setLoggingContact(true);
    setContactLogError(null);
    try {
      const updated = await addAssessmentCaseActivity(item.id, {
        kind,
        details: kind === "contacted"
          ? "Resident contacted from the dashboard."
          : "Resident follow-up completed from the dashboard.",
      });
      onContactLogged(updated);
    } catch (error) {
      console.error(`Could not record resident ${kind === "contacted" ? "contact" : "follow-up"}.`, error);
      setContactLogError(error instanceof Error ? error.message : "Could not update case activity.");
    } finally {
      setLoggingContact(false);
    }
  }

  return (
    <article className="group relative @container overflow-hidden rounded-[24px] border border-[#dce5d8] bg-white shadow-[0_8px_24px_rgba(24,38,25,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_18px_38px_rgba(24,38,25,0.11)]">
      <div className={cn("h-1 bg-gradient-to-r", accent)} aria-hidden="true" />
      <div className={cn(
        "flex items-start justify-between gap-4 border-b border-[#e8ede5] px-5 py-5 sm:px-6",
        riskLevel === "RED"
          ? "bg-gradient-to-br from-[#fff8f6] via-white to-white"
          : riskLevel === "YELLOW"
            ? "bg-gradient-to-br from-[#fffcf5] via-white to-white"
            : "bg-gradient-to-br from-[#f7faf6] via-white to-white",
      )}>
        <div className="flex min-w-0 items-center gap-3.5">
          <span className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold shadow-sm",
            riskLevel === "RED"
              ? "border-[#f0d7d1] bg-[#fff0ec] text-[#9e392b]"
              : riskLevel === "YELLOW"
                ? "border-[#efe2c7] bg-[#fff8e9] text-[#886014]"
                : riskLevel === "GREEN"
                  ? "border-[#d7e7d9] bg-[#eef7ef] text-[#286447]"
                  : "border-slate-200 bg-slate-50 text-slate-600",
          )} aria-hidden="true">
            {residentInitial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-snug tracking-[-0.02em] text-[#182619] sm:text-xl">{item.resident_name}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-md border border-[#e2e8de] bg-white/80 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.1em] text-[#52604f] shadow-sm">
                {formatAssessmentRecordNumber(item.id)}
              </span>
              <span className="text-xs font-medium text-[#687566]">{caseType}</span>
              {overdue && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#efc5bb] bg-[#fff0ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#a33c2c]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bd4935]" aria-hidden="true" />
                  {t("Overdue", "Lampas sa takdang oras")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <TriageBadge level={item.risk_level} />
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="rounded-2xl border border-[#e5ebe2] bg-[linear-gradient(145deg,#fbfcfa_0%,#f6f9f4_100%)] px-4 py-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#758171]">{t("Reported symptoms", "Mga naiulat na sintomas")}</p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {item.detected_symptoms?.length ? item.detected_symptoms.map((symptom) => {
              const isUrgent = isUrgencySymptom(symptom);
              const reportedTypes = getReportedSymptomClassifications(symptom, item.note);
              const medicalTerm = getMedicalTerm(symptom);
              return (
                <div
                  key={symptom}
                  className={cn(
                    "min-w-0 rounded-2xl border px-3 py-3 shadow-[0_3px_10px_rgba(24,38,25,0.025)] transition-colors duration-200",
                    isUrgent
                      ? "border-[#efd5ce] bg-[linear-gradient(145deg,#fffdfa_0%,#fff5f1_100%)]"
                      : "border-[#e1e8de] bg-[linear-gradient(145deg,#ffffff_0%,#f8faf6_100%)]",
                  )}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={cn(
                      "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                      isUrgent ? "bg-[#bd5542] ring-4 ring-[#f8e6e1]" : "bg-[#548064] ring-4 ring-[#eaf1e7]",
                    )} aria-hidden="true" />
                    <span className={cn(
                      "min-w-0 break-words text-sm font-semibold leading-snug",
                      isUrgent ? "text-[#87382d]" : "text-[#344536]",
                    )}>
                      {t(symptom)}
                    </span>
                  </div>
                  {medicalTerm && (
                    <div className="mt-2.5 border-t border-[#e7ece4] pt-2">
                      <MedicalTermLabel term={medicalTerm} />
                    </div>
                  )}
                  {reportedTypes.length > 0 && (
                    <ul className="mt-2.5 space-y-2 border-t border-[#e8ede5] pt-2.5">
                      {reportedTypes.map((type) => {
                        const typeMedicalTerm = getMedicalTerm(type.en);
                        return (
                          <li key={type.en} className="min-w-0">
                            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#758171]">{type.categoryLabel}</p>
                            <p className="mt-0.5 text-xs font-semibold text-[#344536]">{type.en}</p>
                            {typeMedicalTerm && <div className="mt-1.5"><MedicalTermLabel term={typeMedicalTerm} /></div>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            }) : (
              <span className="text-sm font-medium text-[#687566]">{t("Symptoms not recorded", "Walang naitalang sintomas")}</span>
            )}
          </div>
          <div className="mt-3 flex items-start gap-2 border-t border-[#e4eae0] pt-3 text-sm leading-relaxed text-[#52604f]">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#758171]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
            </svg>
            <span><span className="font-medium text-[#687566]">{t("Onset", "Pagsisimula")}</span><span className="mx-1.5 text-[#b3bdb0]">·</span><span className="font-semibold text-[#344536]">{item.case_summary.onset_display}</span></span>
          </div>
        </div>

        {riskLevel === "RED" && (
          <div className="mt-4 rounded-xl border border-[#efddd7] bg-[#fffaf8] px-4 py-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d5146]">{t("Why RED?", "Bakit PULA?")}</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#573b36]">
              {item.reason || `${item.detected_symptoms.join(", ") || item.case_summary.chief_complaint_summary}; onset: ${item.case_summary.onset_display}.`}
            </p>
            {explanationRules.length > 0 && (
              <ul className="mt-2 space-y-1 border-t border-[#efddd7] pt-2 text-xs leading-relaxed text-[#76564e]">
                {explanationRules.map((rule) => <li key={rule.name}>{rule.description}</li>)}
              </ul>
            )}
          </div>
        )}

        {item.recommendation && (
          <div className="mt-3 rounded-xl border border-[#dbe8dc] bg-[#f3f8f2] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#5a765c]">{t("Suggested next step", "Iminungkahing susunod na hakbang")}</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-[#2e4c36]">{item.recommendation}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {item.age != null && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#e2e9df] bg-white px-3 py-2 text-sm font-semibold text-[#354638] shadow-[0_2px_8px_rgba(24,38,25,0.035)]">
              <svg className="h-4 w-4 text-[#71816d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="12" cy="8" r="3.25" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20v-1.4a6.5 6.5 0 0 1 13 0V20z" />
              </svg>
              {t("Age")} {item.age}
            </span>
          )}
          {item.barangay && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-[#e2e9df] bg-white px-3 py-2 text-sm font-semibold text-[#354638] shadow-[0_2px_8px_rgba(24,38,25,0.035)]">
              <svg className="h-4 w-4 text-[#71816d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10.2c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              {formatBarangay(item.barangay)}
            </span>
          )}
          {item.age == null && !item.barangay && (
            <span className="text-sm font-medium text-[#687566]">{t("Resident details unavailable")}</span>
          )}
        </div>

        {item.case_summary.urgency_reasons.length > 0 && (
          <p className="mt-4 rounded-xl border border-[#f1d6d0] bg-[#fff6f3] px-3.5 py-3 text-sm font-medium leading-relaxed text-[#852d21]">
            <span className="font-bold">{t("Urgency flags:")}</span> {item.case_summary.urgency_reasons.map((reason) => t(reason)).join(" · ")}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8ede5] pt-4 text-sm @md:flex-nowrap">
          <div className="flex flex-col gap-1">
            <time dateTime={item.created_at} title={new Date(item.created_at).toLocaleString()} className="inline-flex items-center gap-2 font-medium text-[#687566]">
              <svg className="h-4 w-4 text-[#84917f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
              </svg>
              {formatSubmittedAgo(item.created_at, t)}
            </time>
            <span className="pl-6 text-xs text-[#879184]">{formatAbsoluteDate(item.created_at)}</span>
          </div>
          {item.phone_number && (
            <div className="flex flex-wrap items-center gap-2">
              <a href={`tel:${item.phone_number}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dce7dc] bg-[#f5f9f4] px-3.5 font-semibold text-[#285d43] shadow-sm transition hover:border-[#b8ceb9] hover:bg-[#edf5eb] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.1 3.8 9.5 3l2.1 5-2.2 1.5a15 15 0 0 0 5.1 5.1l1.5-2.2 5 2.1-.8 2.4a3 3 0 0 1-3.3 2.1A17 17 0 0 1 5 7.1a3 3 0 0 1 2.1-3.3Z" />
                </svg>
                {item.phone_number}
              </a>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e8ede5] bg-[#fafbf9] px-3.5 py-2.5 text-xs text-[#687566]">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#84917f]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v5.5c0 4.4 3.2 7.6 7.5 9.5 4.3-1.9 7.5-5.1 7.5-9.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
          </svg>
          {lastContact ? (
            <span>
              {t(lastContact.kind === "contacted" ? "Last marked contacted" : "Last contact attempt")} · <span className="font-semibold text-[#445443]">{lastContact.actor_name || t("Staff")}</span>
              {" · "}{formatSubmittedAgo(lastContact.created_at, t).replace(`${t("Submitted")} `, "")}
              {lastContact.details ? <span className="block pt-0.5 text-[#849184]">{lastContact.details}</span> : null}
            </span>
          ) : (
            <span className={cn(overdue ? "font-semibold text-[#9e392b]" : "font-medium")}>
              {t(overdue ? "No contact yet · RED case overdue (24-hour contact target)" : "No contact yet")}
            </span>
          )}
        </div>
        {lastFollowUp && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#dbe8dc] bg-[#f3f8f2] px-3.5 py-2.5 text-xs text-[#52604f]">
            <span className="font-semibold text-[#2e4c36]">{t("Follow-up completed")}</span>
            <span>· {lastFollowUp.actor_name || t("Staff")} · {formatSubmittedAgo(lastFollowUp.created_at, t).replace(`${t("Submitted")} `, "")}</span>
          </div>
        )}
        {riskLevel === "RED" && (
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => void logCaseActivity("contacted")} disabled={loggingContact} className="inline-flex min-h-9 items-center rounded-lg border border-[#dce7dc] bg-white px-3 text-xs font-semibold text-[#285d43] transition hover:bg-[#f5f9f4] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15">
              {loggingContact ? t("Saving…") : t("Mark contacted")}
            </button>
            <button type="button" onClick={() => void logCaseActivity("follow_up")} disabled={loggingContact} className="inline-flex min-h-9 items-center rounded-lg border border-[#dce7dc] bg-[#f3f8f2] px-3 text-xs font-semibold text-[#285d43] transition hover:bg-[#eaf3e9] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15">
              {loggingContact ? t("Saving…") : t("Mark followed up")}
            </button>
          </div>
        )}
        {contactLogError && <p role="alert" className="mt-2 text-xs text-[#9e392b]">{contactLogError}</p>}
      </div>
    </article>
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

function WeeklySeverityChart({ data }: { data: DashboardState["weekly_trend"] }) {
  const t = useDashboardText();
  const [timeframe, setTimeframe] = useState<"4" | "8" | "all">("all");
  const patternId = `current-week-${useId().replace(/:/g, "")}`;
  if (!data || data.length === 0) return null;
  const trendData = timeframe === "4" ? data.slice(-4) : timeframe === "8" ? data.slice(-8) : data;
  const last = trendData[trendData.length - 1];
  const totalCases = trendData.reduce((sum, week) => sum + week.count, 0);
  const averageCases = totalCases / trendData.length;
  const peakWeek = trendData.reduce((peak, week) => week.count > peak.count ? week : peak, trendData[0]);
  const maxCount = Math.max(...trendData.map((week) => week.count), 0);
  const chartMax = Math.max(1, Math.ceil(Math.max(maxCount, averageCases) * 1.25));
  const width = 520;
  const height = 222;
  const plot = { left: 24, right: 496, top: 22, bottom: 154 };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;
  const slotWidth = plotWidth / trendData.length;
  const barWidth = Math.min(40, slotWidth * 0.58);
  const averageY = plot.bottom - (averageCases / chartMax) * plotHeight;
  const formatWeek = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const severityLegend = [
    { key: "green", label: t("Green"), color: "#73977c" },
    { key: "yellow", label: t("Yellow"), color: "#d5a843" },
    { key: "red", label: t("Red"), color: "#bd4935" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[22px] border border-[#dce7dc] bg-[radial-gradient(circle_at_85%_0%,rgba(199,179,122,0.16),transparent_32%),linear-gradient(145deg,#f7faf6_0%,#ffffff_54%,#f1f7ef_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_32px_rgba(31,74,54,0.07)] sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-dark">
              {t(last.label === "This week" ? "Week to date" : "Latest completed week")}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-display text-3xl font-semibold tracking-tight text-ink tabular-nums sm:text-4xl">{last.count}</p>
              <p className="text-xs text-ink-muted">
                {last.label === "This week"
                  ? `${last.count} ${t(last.count === 1 ? "case" : "cases")} ${t("so far this week")}`
                  : `${last.count} ${t(last.count === 1 ? "case" : "cases")} ${t("in the latest week")}`}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#dce7dc] bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-ink-secondary shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#286447]" aria-hidden="true" />
            {totalCases} {t("cases in view")}
          </span>
        </div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-ink-muted">{t("Weekly assessments by triage severity")}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label={t("Severity legend")}>
            {severityLegend.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-secondary">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: item.color }} aria-hidden="true" />
                {item.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-secondary">
              <span className="w-4 border-t border-dashed border-[#526b5a]" aria-hidden="true" />
              {t("Avg")} {averageCases.toFixed(1)}
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full sm:h-60" preserveAspectRatio="none" role="img" aria-label={`Weekly stacked assessment counts by severity. Average ${averageCases.toFixed(1)} cases per week. ${trendData.map((week) => `${week.label}: ${week.count} total, ${week.green} green, ${week.yellow} yellow, ${week.red} red`).join("; ")}`}>
          <title>{t("Weekly assessments by triage severity")}</title>
          <desc>{t("Green, yellow, and red cases.")} {t("Empty weeks have a baseline tick.")} {t("Week to date")}. {t("A dashed line marks the weekly average.")}</desc>
          <defs>
            <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#ffffff" fillOpacity="0.42" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeOpacity="0.78" strokeWidth="2" />
            </pattern>
          </defs>
          <line x1={plot.left} x2={plot.right} y1={plot.bottom} y2={plot.bottom} stroke="#708070" strokeOpacity="0.3" vectorEffect="non-scaling-stroke" />
          {trendData.map((week, index) => {
            const centerX = plot.left + slotWidth * (index + 0.5);
            const x = centerX - barWidth / 2;
            const isCurrentWeek = index === trendData.length - 1 && week.label === "This week";
            let segmentBottom = plot.bottom;
            const segments = [
              { value: week.green, color: "#73977c" },
              { value: week.yellow, color: "#d5a843" },
              { value: week.red, color: "#bd4935" },
            ];
            return (
              <g key={week.date} tabIndex={0} role="img" aria-label={`${week.label}${isCurrentWeek ? ", week to date" : ""}: ${week.count} total, ${week.green} green, ${week.yellow} yellow, ${week.red} red cases`}>
                <title>{`${isCurrentWeek ? t("Week to date") : formatWeek(week.date)}: ${week.count} ${t(week.count === 1 ? "case" : "cases")} (${t("Green")} ${week.green}, ${t("Yellow")} ${week.yellow}, ${t("Red")} ${week.red})`}</title>
                {week.count === 0 ? (
                  <line x1={centerX} x2={centerX} y1={plot.bottom - 5} y2={plot.bottom + 1} stroke="#9eaa9d" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                ) : (
                  <>
                    {segments.map((segment) => {
                      if (segment.value === 0) return null;
                      const segmentHeight = (segment.value / chartMax) * plotHeight;
                      const y = segmentBottom - segmentHeight;
                      segmentBottom = y;
                      return (
                        <rect
                          key={segment.color}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={segmentHeight}
                          fill={segment.color}
                          opacity={isCurrentWeek ? 0.62 : 1}
                          rx={2}
                        />
                      );
                    })}
                    {isCurrentWeek && (
                      <rect x={x} y={segmentBottom} width={barWidth} height={plot.bottom - segmentBottom} fill={`url(#${patternId})`} rx={2} />
                    )}
                    <text x={centerX} y={segmentBottom - 7} textAnchor="middle" className="fill-[#263629] font-mono text-[11px] font-semibold">
                      {week.count}
                    </text>
                  </>
                )}
                <text x={centerX} y={plot.bottom + 20} textAnchor="middle" className={`font-mono text-[9px] ${isCurrentWeek ? "fill-[#286447] font-semibold" : "fill-[#788575]"}`}>
                  {isCurrentWeek ? t("Week to date") : formatWeek(week.date)}
                </text>
              </g>
            );
          })}
          <line x1={plot.left} x2={plot.right} y1={averageY} y2={averageY} stroke="#526b5a" strokeOpacity="0.85" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        </svg>
        <p className="mt-1 text-center font-mono text-[9px] uppercase tracking-[0.08em] text-ink-faint">{t("Week starting · current week is partial")}</p>
      </div>
      <div className="border-t border-border-soft pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">{t("View timeframe")}</p>
          <div className="flex rounded-xl border border-[#dce7dc] bg-[#f6f9f5] p-1 shadow-inner" role="group" aria-label={t("Case volume timeframe")}>
            {([{ value: "4", label: "4 weeks" }, { value: "8", label: "8 weeks" }, { value: "all", label: "All data" }] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeframe(option.value)}
                aria-pressed={timeframe === option.value}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 ${timeframe === option.value ? "bg-white text-brand-dark shadow-sm ring-1 ring-brand/10" : "text-ink-muted hover:bg-white/70 hover:text-ink"}`}
              >
                {t(option.label)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-brand/15 bg-brand-tint/55 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">{t("Total cases")}</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{totalCases}</p></div>
          <div className="rounded-xl border border-border-soft bg-surface/60 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">{t("Weekly average")}</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{averageCases.toFixed(1)}</p></div>
          <div className="rounded-xl border border-border-soft bg-surface/60 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">{t("Peak week")}</p><p className="mt-1 font-mono text-lg font-semibold text-ink">{peakWeek.count}</p></div>
          <div className="rounded-xl border border-border-soft bg-surface/60 px-3 py-2.5"><p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint">{t("Urgent cases")}</p><p className="mt-1 font-mono text-lg font-semibold text-emergency-red">{trendData.reduce((sum, week) => sum + week.red, 0)}</p></div>
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
  const t = useDashboardText();
  const total = Math.max(green + yellow + red, 1);
  const rows = [
    {
      label: "Green",
      value: green,
      color: "bg-triage-green",
      dot: "bg-triage-green",
      surface: "border-[#dce9dd] bg-[#f5faf5]",
      text: "text-[#286447]",
    },
    {
      label: "Yellow",
      value: yellow,
      color: "bg-triage-yellow",
      dot: "bg-triage-yellow",
      surface: "border-[#eee5cf] bg-[#fcf9f0]",
      text: "text-[#8a681d]",
    },
    {
      label: "Red",
      value: red,
      color: "bg-triage-red",
      dot: "bg-triage-red",
      surface: "border-[#eedbd6] bg-[#fdf6f4]",
      text: "text-[#a54234]",
    },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex h-4 overflow-hidden rounded-full border border-white bg-[#edf1ea] p-0.5 shadow-[inset_0_1px_3px_rgba(24,38,25,0.12)]"
        role="img"
        aria-label={`${t("Risk distribution")}: ${green} ${t("Green")}, ${yellow} ${t("Yellow")}, ${red} ${t("Red")}`}
      >
        {rows.map((row) => (
          <span
            key={row.label}
            className={`${row.color} h-full transition-[width] duration-700 ease-out first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(row.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className={`rounded-2xl border px-3 py-3.5 shadow-[0_3px_10px_rgba(24,38,25,0.025)] ${row.surface}`}>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white/80 ${row.dot}`} aria-hidden="true" />
              <span className="text-xs font-semibold text-ink-secondary">{t(row.label)}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-1">
              <span className={`font-display text-2xl font-semibold tracking-tight ${row.text}`}>{row.value}</span>
              <span className="font-mono text-[11px] font-semibold text-ink-muted">{Math.round((row.value / total) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarangayRanking({ data }: { data: DashboardState["barangay_stats"] }) {
  const t = useDashboardText();
  const sorted = [...data].sort((a, b) => b.urgent - a.urgent || b.total - a.total);
  const max = Math.max(...sorted.map((item) => item.total), 1);
  const totalAssessments = sorted.reduce((sum, item) => sum + item.total, 0);
  const urgentAssessments = sorted.reduce((sum, item) => sum + item.urgent, 0);
  const followUpAssessments = sorted.reduce((sum, item) => sum + item.follow_up, 0);
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visibleRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  const getSeverity = (urgent: number, followUp: number, total: number) => {
    if (urgent > 0 && total > 0) {
      return { label: "Urgent follow-up", tone: "border-[#efc5bb] bg-[#fff0ec] text-[#9e392b]" };
    }
    if (followUp > 0) {
      return { label: "Follow-up", tone: "border-[#eee2bd] bg-[#fff8e6] text-[#80631b]" };
    }
    return { label: total > 0 ? "Recorded" : "No activity", tone: "border-[#d7e5d8] bg-[#f2f8f2] text-[#385c43]" };
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#dce7dc] bg-[linear-gradient(145deg,#f7faf6,#ffffff)] px-3 py-3 shadow-[0_5px_16px_rgba(24,38,25,0.035)]">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{t("Barangays")}</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular-nums text-ink">{sorted.length}</p>
        </div>
        <div className="rounded-2xl border border-[#dce7dc] bg-[linear-gradient(145deg,#f7faf6,#ffffff)] px-3 py-3 shadow-[0_5px_16px_rgba(24,38,25,0.035)]">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{t("Assessments")}</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular-nums text-ink">{totalAssessments}</p>
        </div>
        <div className="rounded-2xl border border-[#eee2bd] bg-[linear-gradient(145deg,#fffaf0,#ffffff)] px-3 py-3 shadow-[0_5px_16px_rgba(24,38,25,0.035)]">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#80631b]">{t("Yellow follow-up")}</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular-nums text-[#80631b]">{followUpAssessments}</p>
        </div>
        <div className="rounded-2xl border border-[#efdbd5] bg-[linear-gradient(145deg,#fff7f4,#ffffff)] px-3 py-3 shadow-[0_5px_16px_rgba(24,38,25,0.035)]">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9e392b]">{t("Open urgent")}</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular-nums text-[#9e392b]">{urgentAssessments}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e4ebe1] bg-[#f7faf6] px-3.5 py-2.5">
        <p className="text-xs font-semibold text-[#405342]">{t("Barangay assessment volume")}</p>
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-ink-faint">{t("Bars scaled to highest")}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1" aria-label={t("Barangay chart legend")}>
        {[
          { label: "Other", color: "bg-[#dce7dc]" },
          { label: "Follow-up", color: "bg-[#d5a843]" },
          { label: "Open urgent", color: "bg-[#bd4935]" },
        ].map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-muted">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${item.color}`} aria-hidden="true" />
            {t(item.label)}
          </span>
        ))}
      </div>
      {visibleRows.map((item, index) => {
        const totalWidth = (item.total / max) * 100;
        const urgent = Math.min(item.urgent, item.total);
        const followUp = Math.min(item.follow_up, Math.max(item.total - urgent, 0));
        const other = Math.max(item.total - urgent - followUp, 0);
        const severity = getSeverity(item.urgent, item.follow_up, item.total);
        const rank = (page - 1) * pageSize + index + 1;

        return (
          <div
            key={item.barangay}
            className="group relative overflow-hidden rounded-[20px] border border-[#e3e9df] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcf9_100%)] p-3.5 shadow-[0_8px_22px_rgba(24,38,25,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_16px_30px_rgba(31,74,54,0.085)] sm:p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border font-mono text-[11px] font-bold", rank === 1 ? "border-[#ead79b] bg-[#fff8dc] text-[#927324]" : "border-[#e1e9df] bg-[#f5f8f3] text-[#66736a]")}>
                  {String(rank).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.barangay}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted">{item.total} {t(item.total === 1 ? "assessment" : "assessments")}</p>
                </div>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] ${severity.tone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${item.urgent > 0 ? "bg-[#bd4935]" : item.follow_up > 0 ? "bg-[#d5a843]" : "bg-[#73977c]"}`} aria-hidden="true" />
                {t(severity.label)}
              </span>
            </div>

            <div className="mt-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
                <span className="font-medium text-ink-muted">{t("Volume vs. highest barangay")}</span>
                <span className="font-mono font-semibold tabular-nums text-ink-secondary">{Math.round(totalWidth)}%</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-[#edf1eb] shadow-inner"
                role="img"
                aria-label={`${item.barangay}: ${item.total} ${t("total")}; ${urgent} ${t("open urgent")}; ${followUp} ${t("Follow-up")}; ${other} ${t("other assessments")}`}
              >
                <div className="flex h-full overflow-hidden rounded-full transition-[width] duration-500" style={{ width: `${Math.max(totalWidth, item.total > 0 ? 2 : 0)}%` }}>
                  {other > 0 && <span className="h-full bg-[#b9cbb9]" style={{ width: `${(other / item.total) * 100}%` }} />}
                  {followUp > 0 && <span className="h-full bg-[#d5a843]" style={{ width: `${(followUp / item.total) * 100}%` }} />}
                  {urgent > 0 && <span className="h-full bg-[#bd4935]" style={{ width: `${(urgent / item.total) * 100}%` }} />}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#edf0eb] pt-2.5 text-[10px]">
              <span className="font-medium text-ink-secondary"><span className="font-mono font-semibold text-[#9e392b]">{item.urgent}</span> {t("open urgent")}</span>
              <span className="font-medium text-ink-secondary"><span className="font-mono font-semibold text-[#80631b]">{item.follow_up}</span> {t("Follow-up")}</span>
              <span className="ml-auto font-mono text-ink-faint">{item.total} {t("total")}</span>
            </div>
          </div>
        );
      })}
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-soft bg-surface/60 p-5 text-sm text-ink-muted">{t("No barangay data available.")}</p>
      ) : (
        <>
          <p className="px-1 text-[10px] leading-relaxed text-ink-faint">
            {t("Other includes assessments outside the open-urgent and Yellow follow-up counts; it is not a separate risk classification.")}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
              {t("Showing")} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} {t("of")} {sorted.length}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} disabled={page === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Previous")}</button>
              <span className="min-w-14 text-center font-mono text-[10px] text-ink-muted">{page} / {pageCount}</span>
              <button type="button" onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))} disabled={page === pageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Next")}</button>
            </div>
          </div>
        </>
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
  const t = useDashboardText();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onUrgentOnly}
        className="rounded-sm border border-red-200 bg-red-tint px-3 py-2 text-sm font-medium text-emergency-red transition hover:bg-red-100"
      >
        {t("Urgent only")}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-sm border border-border bg-white px-3 py-2 text-sm font-medium text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark"
      >
        {t("Clear filters")}
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
  const t = useDashboardText();
  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <PremiumSelect
          value={riskFilter}
          onChange={setRiskFilter}
          ariaLabel={t("Filter assessment records by risk level")}
          options={[
            { value: "all", label: t("All risk levels") },
            { value: "GREEN", label: t("Green") },
            { value: "YELLOW", label: t("Yellow") },
            { value: "RED", label: t("Red") },
          ]}
        />
        <PremiumSelect
          value={barangayFilter}
          onChange={setBarangayFilter}
          ariaLabel={t("Filter assessment records by barangay")}
          options={[
            { value: "all", label: t("All barangays") },
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
            placeholder={t("Search resident or note")}
            className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 pl-9 text-sm text-ink outline-none transition focus:border-brand"
          />
        </div>
      </div>
      <FilterChips onUrgentOnly={onUrgentOnly} onClear={onClear} />
    </div>
  );
}

function DashboardPageContent() {
  const t = useDashboardText();
  const { language } = useInterfaceLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardState | null>(null);
  const topSymptoms = stats?.top_symptoms ?? [];
  const maxSymptomCount = Math.max(...topSymptoms.map((item) => item.count), 1);

  function updateAssessmentActivity(updated: DashboardAssessmentItem) {
    setStats((current) => current
      ? {
          ...current,
          recent_assessments: current.recent_assessments.map((assessment) =>
            assessment.id === updated.id ? updated : assessment,
          ),
        }
      : current);
  }

  const communityReport = useMemo(
    () => stats ? generateCommunityHealthReport(stats, new Date(stats.generated_at), language) : null,
    [stats, language],
  );
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

  async function generateReport() {
    if (!communityReport) return;

    let downloaded: "downloaded" | "opened" | false = false;
    try {
      const { downloadReport } = await import("@/lib/report");
      downloaded = downloadReport({
        title: t("Community health report"),
        subtitle: communityReport.report_period,
        generatedAt: new Date().toLocaleString(),
        filename: `healthguard-community-report-${new Date().toISOString().slice(0, 10)}`,
        sections: [
          {
            heading: t("Executive summary"),
            rows: [[t("Main findings"), communityReport.executive_summary]],
          },
          {
            heading: t("Key metrics"),
            rows: communityReport.key_metrics.map((item) => [item.label, `${item.value} — ${item.context}`]),
          },
          {
            heading: t("Urgent cases"),
            rows: [
              [t("Count"), String(communityReport.urgent_cases_summary.count)],
              [t("Summary"), communityReport.urgent_cases_summary.narrative],
              [t("Barangays"), communityReport.urgent_cases_summary.barangays_involved.join(", ") || t("None identified")],
            ],
          },
          {
            heading: t("Barangay breakdown"),
            rows: communityReport.barangay_breakdown.map((item) => [item.barangay, item.narrative]),
          },
          {
            heading: t("Weekly trend"),
            rows: [[t("Trend"), communityReport.trend_narrative]],
          },
          {
            heading: t("Reported symptoms"),
            rows: [
              [t("Summary"), communityReport.top_symptoms_narrative],
              ...communityReport.top_symptoms.map((item) => [
                `${item.symptom} (${item.count})`,
                item.icd10_code
                  ? `${item.icd10_code.code} — ${item.icd10_code.description} (${item.icd10_code.coding_system}; source: ${item.icd10_code.source ?? item.icd10_code.coding_system}; ${item.icd10_code.source_url ?? ""})`
                  : item.icd10_uncoded?.reason ?? t("No unambiguous ICD-10 mapping"),
              ] as [string, string]),
              [t("Coding note"), t("ICD-10 references label reported symptoms only; they are not diagnoses.")],
            ],
          },
          {
            heading: t("Recommended actions"),
            rows: communityReport.recommended_actions.map((action, index) => [`${t("Priority")} ${index + 1}`, action]),
          },
        ],
      });
    } catch (error) {
      console.error("Could not generate the community health report.", error);
      downloaded = false;
    }

    setToast({
      message: t(downloaded === "downloaded" ? "PDF report downloaded successfully." : downloaded === "opened" ? "Report opened in a new tab. Use your browser's Share or Save option." : "Could not create the report."),
      tone: downloaded ? "success" : "error",
    });
  }

  function downloadReportJson() {
    if (!communityReport) return;

    try {
      const file = new Blob([JSON.stringify(communityReport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `healthguard-community-report-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast({ message: t("Community health report JSON downloaded."), tone: "success" });
    } catch {
      setToast({ message: t("Could not download the report JSON."), tone: "error" });
    }
  }

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      const [summary, lexicon] = await Promise.all([getDashboardSummary(), getMhoLexicon()]);
      setStats(summary);
      setLexiconEntries(lexicon);
      setLastUpdated(new Date());
      setRefreshError(null);
      setToast({ message: t("Dashboard data refreshed."), tone: "success" });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setRefreshError(errorMsg);
      setToast({ message: t("Could not refresh dashboard data."), tone: "error" });
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
      setToast({ message: t("Lexicon term reviewed."), tone: "success" });
    } catch {
      setToast({ message: t("Could not update lexicon review status."), tone: "error" });
    } finally {
      setReviewingLexicon(null);
    }
  }

  async function rejectLexiconEntryForReview(id: number) {
    setReviewingLexicon(id);
    try {
      const rejected = await rejectLexiconEntry(id);
      setLexiconEntries((entries) => entries.map((entry) => (entry.id === id ? rejected : entry)));
      setToast({ message: t("Lexicon term not approved and removed from matching."), tone: "success" });
    } catch {
      setToast({ message: t("Could not update lexicon review status."), tone: "error" });
    } finally {
      setReviewingLexicon(null);
    }
  }

  const redCases = useMemo(
    () => (stats?.recent_assessments ?? []).filter((item) => (
      (item.risk_level || "").toUpperCase() === "RED"
      && item.case_status !== "Resolved"
      && !item.handled
      && !item.case_activities?.some((activity) => activity.kind === "follow_up")
    )),
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
          <p className="text-sm font-medium text-orange-800">{t("Showing cached data")}</p>
          <p className="mt-1 text-sm text-orange-700">{refreshError}</p>
        </div>
      )}

      <section aria-labelledby="dashboard-at-a-glance">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <h2 id="dashboard-at-a-glance" className="font-display text-xl font-semibold text-ink sm:text-2xl">{t("At a glance")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t("A snapshot of local screening activity")}</p>
          </div>
          {updatedLabel && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dce6da] bg-white/80 px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              {t("Updated")} {updatedLabel}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {stats?.summary_cards.map((card) => {
            const label = card.label.toLowerCase();
            const isUrgent = label.includes("urgent");
            const icon = isUrgent
              ? widgetIcons.alert
              : label.includes("today") || label.includes("week")
                ? widgetIcons.trend
                : widgetIcons.book;
            return (
              <StatCard
                key={card.label}
                label={t(card.label)}
                value={card.value}
                hint={t(card.hint)}
                accent={isUrgent ? "urgent" : "brand"}
                compact
                icon={<span aria-hidden="true"><WidgetIcon path={icon} /></span>}
              />
            );
          })}
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-2 2xl:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-1 2xl:col-span-7">
          <div className="relative flex max-h-[70vh] flex-col overflow-y-auto rounded-xl border-0 bg-red-tint shadow-sm transition-shadow hover:shadow-md">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-red-200 bg-red-tint/95 px-5 py-4 backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-triage-red/10 text-emergency-red">
                <WidgetIcon path={widgetIcons.alert} />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-emergency-red lg:text-xl">{redCases.length > 0 ? t("Urgent Cases Requiring Attention") : t("Needs attention")}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">{t("Red-level cases that require follow-up now")}</p>
              </div>
            </div>
            <span className="font-mono text-3xl font-bold text-emergency-red">
              {redCases.length}
            </span>
          </div>
          <div className="grid flex-1 gap-3 p-5 2xl:grid-cols-2">
            {redCases.length > 0 ? (
              redCases.map((item) => (
                <AssessmentCaseCard key={item.id} item={item} asOf={stats?.generated_at ?? item.created_at} onContactLogged={updateAssessmentActivity} />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                {t("No red-level assessments are currently flagged for attention.")}
              </p>
            )}
          </div>
        </div>

        <WidgetCard
          icon="list"
          title="Recent assessments"
          subtitle={`${recentAssessments.length} ${t("recent records")}`}
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
              {t("View all →")}
            </Link>
          }
        >
          <div className="space-y-3">
            {recentAssessments.length > 0 ? (
              visibleRecentAssessments.map((item) => (
                <AssessmentCaseCard key={item.id} item={item} asOf={stats?.generated_at ?? item.created_at} onContactLogged={updateAssessmentActivity} />
              ))
            ) : (
              <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">
                {t("No assessment records available.")}
              </p>
            )}
            {recentAssessments.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  {t("Showing")} {(recentAssessmentPage - 1) * RECENT_ASSESSMENT_PAGE_SIZE + 1}-{Math.min(recentAssessmentPage * RECENT_ASSESSMENT_PAGE_SIZE, recentAssessments.length)} {t("of")} {recentAssessments.length}
                </p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setRecentAssessmentPage((page) => Math.max(1, page - 1))} disabled={recentAssessmentPage === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Previous")}</button>
                  <span className="min-w-14 text-center font-mono text-[10px] text-ink-muted">{recentAssessmentPage} / {recentAssessmentPageCount}</span>
                  <button type="button" onClick={() => setRecentAssessmentPage((page) => Math.min(recentAssessmentPageCount, page + 1))} disabled={recentAssessmentPage === recentAssessmentPageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Next")}</button>
                </div>
              </div>
            )}
          </div>
        </WidgetCard>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-4 lg:col-span-1 lg:self-start 2xl:col-span-5">
        <WidgetCard icon="trend" title="Overall severity mix" subtitle="All recorded assessments · all-time snapshot" updated={updatedLabel}>
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2 rounded-2xl border border-[#dce7dc] bg-[linear-gradient(145deg,#f7faf5_0%,#ffffff_58%,#f1f6ef_100%)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">{t("All recorded assessments")}</p>
                  <p className="mt-1 text-xs text-ink-muted">{t("Counts grouped by final triage level")}</p>
              </div>
              <p className="font-mono text-2xl font-semibold tabular-nums text-ink">{caseMixTotal}<span className="ml-1.5 text-xs font-medium text-ink-muted"> {t("total")}</span></p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Green", detail: "Routine", value: greenBreakdown, color: "#73977c", tone: "border-[#d7e5d8] bg-[#f2f8f2]", text: "text-[#385c43]" },
                { label: "Yellow", detail: "Follow-up", value: yellowBreakdown, color: "#d5a843", tone: "border-[#eee2bd] bg-[#fffaf0]", text: "text-[#80631b]" },
                { label: "Red", detail: "Urgent", value: redBreakdown, color: "#bd4935", tone: "border-[#efdbd5] bg-[#fff6f3]", text: "text-[#9e392b]" },
              ].map((item) => {
                const percentage = caseMixTotal > 0 ? (item.value / caseMixTotal) * 100 : 0;
                return (
                  <div key={item.label} className={`rounded-2xl border p-3.5 shadow-[0_6px_18px_rgba(24,38,25,0.035)] ${item.tone}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.08em] ${item.text}`}>{item.label}</p>
                        <p className="mt-0.5 text-[11px] text-ink-muted">{item.detail}</p>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-ink-secondary">{Math.round(percentage)}%</span>
                    </div>
                    <p className={`mt-3 font-display text-3xl font-semibold leading-none tabular-nums ${item.text}`}>{item.value}</p>
                    <p className="mt-1 text-[10px] text-ink-muted">{item.value === 1 ? "assessment" : "assessments"}</p>
                    <div
                      className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 shadow-inner"
                      role="progressbar"
                      aria-label={`${item.label} share of all recorded assessments`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(percentage)}
                    >
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="px-1 text-[11px] leading-relaxed text-ink-muted">
              {t("Unlike the weekly severity chart, this is a cumulative snapshot; it does not show when cases were recorded.")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-brand/15 bg-brand-tint/45 px-3 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-brand-dark">{t("Readout")}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-secondary">{caseMixRead}</p>
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50/70 px-3 py-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700">{t("Follow-up pressure")}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-secondary">{yellowShare}% {t("of cases may need consultation.")}</p>
              </div>
              <div className={`rounded-xl border px-3 py-3 ${redBreakdown > 0 ? "border-red-200 bg-red-50/70" : "border-emerald-200 bg-emerald-50/70"}`}>
                <p className={`font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${redBreakdown > 0 ? "text-emergency-red" : "text-emerald-700"}`}>{t("Urgency")}</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-ink-secondary">{redBreakdown > 0 ? `${redBreakdown} ${t("RED")} ${t(redBreakdown === 1 ? "assessment" : "assessments")} ${t("recorded overall.")}` : t("No RED assessments recorded overall.")}</p>
              </div>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard icon="trend" title="Weekly severity trend" subtitle="Severity changes over time · current week to date" updated={updatedLabel}>
          {stats && stats.weekly_trend.length > 0 ? (
            <WeeklySeverityChart data={stats.weekly_trend} />
          ) : (
            <p className="text-sm text-ink-muted">{t("No trend data available yet.")}</p>
          )}
        </WidgetCard>

        <WidgetCard icon="map" title="Barangay risk overview" subtitle="Case distribution by location" updated={updatedLabel}>
          <BarangayRanking data={barangayStats} />
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
              {t("View all →")}
            </Link>
          }
        >
          <div className="space-y-4">
            {topSymptoms.length > 0 ? (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#e4ebe1] bg-[#f7faf6] px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#405342]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-brand-dark shadow-sm ring-1 ring-[#e2e9df]">
                      <WidgetIcon path={widgetIcons.trend} />
                    </span>
                    {t("Ranked by reported frequency")}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#788575]">
                    {t("Top")} {Math.min(topSymptoms.length, 3)}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {topSymptoms.slice(0, 3).map((item, index) => {
                    const percentage = Math.min((item.count / maxSymptomCount) * 100, 100);
                    const rankTone = index === 0
                      ? {
                          badge: "border-[#d4e4d6] bg-[#edf6ee] text-[#286447]",
                          bar: "from-[#286447] to-[#70a47a]",
                          track: "bg-[#eaf1e9]",
                        }
                      : index === 1
                        ? {
                            badge: "border-[#e8e1cf] bg-[#f8f5eb] text-[#79643a]",
                            bar: "from-[#8c7950] to-[#c2ad78]",
                            track: "bg-[#f1eee5]",
                          }
                        : {
                            badge: "border-[#dfe5e0] bg-[#f2f5f2] text-[#66736a]",
                            bar: "from-[#66786c] to-[#a9b7aa]",
                            track: "bg-[#edf1ed]",
                          };

                    return (
                      <div
                        key={item.symptom}
                        className="group/metric rounded-2xl border border-[#e7ece4] bg-white px-3.5 py-3 transition duration-200 hover:border-[#cbdacb] hover:bg-[#fcfdfb] hover:shadow-[0_8px_20px_rgba(24,38,25,0.045)] sm:px-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-bold shadow-sm",
                            rankTone.badge,
                          )}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#263629]">{t(item.symptom)}</p>
                            <div
                              className={cn("mt-2 h-1.5 overflow-hidden rounded-full", rankTone.track)}
                              role="progressbar"
                              aria-label={`${t(item.symptom)} ${t("relative to the most reported symptom")}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(percentage)}
                            >
                              <div
                                className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-500", rankTone.bar)}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="flex min-w-[68px] shrink-0 flex-col items-end">
                            <span className="font-display text-lg font-semibold leading-none tracking-tight text-[#233328]">{item.count}</span>
                            <span className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-[#899386]">
                              {t(item.count === 1 ? "report" : "reports")}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="px-1 text-[11px] leading-relaxed text-[#7b8778]">
                  {t("Bar length compares each symptom with the most frequently reported one.")}
                </p>
              </>
            ) : (
              <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce5d8] bg-[linear-gradient(145deg,#fbfcfa_0%,#f4f8f1_100%)] px-5 py-7 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e2e9df] bg-white text-[#71816d] shadow-sm">
                  <WidgetIcon path={widgetIcons.pie} />
                </span>
                <p className="mt-3 text-sm font-semibold text-[#344536]">{t("No symptom data yet")}</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#7b8778]">{t("Reported symptoms will appear here as assessments are completed.")}</p>
              </div>
            )}
          </div>
        </WidgetCard>
        </aside>
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
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("Community phrase")}</span>
                      <span className="rounded-full border border-[#e7d7aa] bg-[#fffaf0] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#806326]">{t("Pending review")}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="rounded-xl border border-brand/15 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-[0_3px_10px_rgba(24,38,25,0.04)]">{entry.local_term}</span>
                      <span className="font-mono text-xs text-ink-faint" aria-hidden="true">{t("maps to")}</span>
                      <span className="rounded-xl border border-[#cfe0cf] bg-[#f3f8f0] px-3 py-2 text-sm font-semibold text-brand-dark">{entry.medical_term}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                      <span>{entry.language === "tl" ? "Tagalog" : "English"}</span>
                      <span>{entry.category}</span>
                      <span>{t("Draft weight")} {entry.severity_weight}</span>
                    </div>
                  </div>
                  <div className="w-full shrink-0 rounded-2xl border border-[#e3ebdf] bg-white/70 p-2.5 lg:w-auto">
                    <p className="mb-2 px-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t("Review decision")}</p>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                      <button type="button" onClick={() => void reviewLexiconEntry(entry.id)} disabled={reviewingLexicon === entry.id} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-brand to-brand-light px-4 text-xs font-semibold text-white shadow-[0_8px_16px_rgba(47,107,79,0.16)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(47,107,79,0.2)] focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-wait disabled:opacity-60">
                        {reviewingLexicon === entry.id ? t("Reviewing...") : t("Mark reviewed")}
                      </button>
                      <button type="button" onClick={() => void rejectLexiconEntryForReview(entry.id)} disabled={reviewingLexicon === entry.id} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#e6b2a8] bg-[#fff6f3] px-4 text-xs font-semibold text-emergency-red outline-none transition hover:-translate-y-0.5 hover:bg-[#ffebe7] hover:shadow-[0_8px_16px_rgba(192,67,43,0.1)] focus-visible:ring-4 focus-visible:ring-emergency-red/20 disabled:cursor-wait disabled:opacity-60">
                        {t("Not approved")}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {pendingLexicon.length > 4 && (
              <p className="pt-1 text-center text-xs text-ink-muted">+{pendingLexicon.length - 4} {t("more terms waiting for review")}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/25 bg-brand-tint/60 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">✓</span>
            <div>
              <p className="text-sm font-semibold text-brand-dark">{t("All terms are reviewed")}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{t("The symptom language library is currently up to date.")}</p>
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
                  <p className="font-medium text-ink">{t(insight.title)}</p>
                  <TagBadge tone={insight.tone === "urgent" ? "staff" : insight.tone === "watch" ? "neutral" : "brand"}>
                    {t(insightToneLabel(insight.tone))}
                  </TagBadge>
                </div>
                <p className="text-sm leading-relaxed text-ink-secondary">{t(insight.detail)}</p>
              </ListRow>
            ))}
          </div>
        </WidgetCard>
      </section>
    </div>
  );

  const renderAssessmentRecords = () => (
    <Panel title={t("Assessment records")} badge={<TagBadge tone="neutral">{t("Live list")}</TagBadge>}>
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
            <AssessmentCaseCard key={item.id} item={item} asOf={stats?.generated_at ?? item.created_at} onContactLogged={updateAssessmentActivity} />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-surface p-5 text-sm text-ink-muted">{t("No assessment records match the selected filters.")}</p>
        )}
      </div>
      {filteredAssessments.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3">
          <p className="text-xs text-ink-muted">{t("Showing")} {assessmentStart}-{assessmentEnd} {t("of")} {filteredAssessments.length}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setAssessmentPage((page) => Math.max(1, page - 1))} disabled={assessmentPage === 1} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Previous")}</button>
            <span className="min-w-16 text-center font-mono text-xs text-ink-muted">{t("Page")} {assessmentPage} / {assessmentPageCount}</span>
            <button type="button" onClick={() => setAssessmentPage((page) => Math.min(assessmentPageCount, page + 1))} disabled={assessmentPage === assessmentPageCount} className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark disabled:cursor-not-allowed disabled:opacity-40">{t("Next")}</button>
          </div>
        </div>
      ) : null}
    </Panel>
  );

  const renderAnalytics = () => {
    const topSymptoms = stats?.top_symptoms.slice(0, 5) ?? [];
    const maxSymptomCount = Math.max(...topSymptoms.map((item) => item.count), 1);

    return (
      <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
        <Panel
          title={t("Risk distribution")}
          subtitle={t("Current triage breakdown")}
          className="h-full border-[#dce5d8] bg-[radial-gradient(ellipse_at_top_right,rgba(199,179,122,0.11),transparent_44%),linear-gradient(180deg,#FFFFFF_0%,#F8FAF6_100%)] shadow-[0_14px_34px_rgba(24,38,25,0.055)] hover:shadow-[0_20px_42px_rgba(24,38,25,0.09)]"
        >
          <RiskBreakdownBar green={greenBreakdown} yellow={yellowBreakdown} red={redBreakdown} />
        </Panel>
        <Panel
          title={t("Symptom frequency")}
          badge={<TagBadge>{t("Current patterns")}</TagBadge>}
          className="h-full border-[#dce5d8] bg-[radial-gradient(ellipse_at_top_right,rgba(47,107,79,0.08),transparent_44%),linear-gradient(180deg,#FFFFFF_0%,#F8FAF6_100%)] shadow-[0_14px_34px_rgba(24,38,25,0.055)] hover:shadow-[0_20px_42px_rgba(24,38,25,0.09)]"
        >
          {topSymptoms.length > 0 ? (
            <ol className="space-y-2.5">
              {topSymptoms.map((item, index) => {
                const percent = Math.round((item.count / maxSymptomCount) * 100);
                const medicalTerm = getMedicalTerm(item.symptom);

                return (
                  <li
                    key={item.symptom}
                    className="rounded-2xl border border-[#e4eae1] bg-white/80 px-3.5 py-3 shadow-[0_3px_10px_rgba(24,38,25,0.025)] transition duration-200 hover:border-brand/25 hover:bg-white hover:shadow-[0_8px_18px_rgba(31,74,54,0.07)] sm:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e0e9dd] bg-[#f4f8f2] font-mono text-xs font-semibold text-brand-dark">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold capitalize text-ink-secondary">{t(item.symptom)}</span>
                          <span className="shrink-0 rounded-lg bg-[#f3f7f1] px-2 py-1 font-mono text-xs font-semibold text-ink">{item.count}</span>
                        </div>
                        {medicalTerm && <p className="mt-0.5 truncate text-[11px] text-ink-faint">{medicalTerm}</p>}
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf2ea]"
                          role="progressbar"
                          aria-label={`${t(item.symptom)} ${t("frequency", "dalas")}`}
                          aria-valuemin={0}
                          aria-valuemax={maxSymptomCount}
                          aria-valuenow={item.count}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#1f4a36] via-[#3f805d] to-[#a9c49e] transition-[width] duration-700 ease-out"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce5d8] bg-white/60 px-5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e0e9dd] bg-[#f4f8f2] font-mono text-sm font-semibold text-brand-dark" aria-hidden="true">—</span>
              <p className="mt-3 text-sm font-semibold text-ink-secondary">{t("No symptom data yet")}</p>
              <p className="mt-1 text-xs text-ink-faint">{t("Symptom patterns will appear after assessments are recorded.")}</p>
            </div>
          )}
        </Panel>
        {stats && stats.weekly_trend.length > 0 && (
          <Panel
            title={t("Weekly cases by severity")}
            subtitle={t("Green, yellow, and red assessments; current week is week to date")}
            className="lg:col-span-2 border-[#dce5d8] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAF6_100%)] shadow-[0_14px_34px_rgba(24,38,25,0.055)] hover:shadow-[0_20px_42px_rgba(24,38,25,0.09)]"
          >
            <WeeklySeverityChart data={stats.weekly_trend} />
          </Panel>
        )}
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-6">
      {communityReport && (
        <Panel
          title={t("Community health report")}
          subtitle={communityReport.report_period}
          badge={
            <div className="flex flex-wrap items-center gap-2">
              <TagBadge tone="neutral">{t("Aggregate summary")}</TagBadge>
              <button
                type="button"
                onClick={downloadReportJson}
                className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-brand/20 bg-white px-3 text-xs font-semibold text-brand-dark shadow-sm transition hover:border-brand/40 hover:bg-brand-tint/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 2.75v9m0 0 3.25-3.25M10 11.75 6.75 8.5M3.5 12.75v2.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.5" />
                </svg>
                Download JSON
              </button>
            </div>
          }
          className="border-[#dce5d8] bg-[radial-gradient(ellipse_at_top_right,rgba(199,179,122,0.10),transparent_38%),linear-gradient(180deg,#FFFFFF_0%,#FAFBF8_100%)] shadow-[0_16px_38px_rgba(24,38,25,0.06)]"
        >
          <div className="space-y-7">
            <section aria-labelledby="report-executive-summary" className="relative overflow-hidden rounded-2xl border border-[#dce7dc] bg-[linear-gradient(135deg,#f4f8f2_0%,#ffffff_72%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand via-[#6e9a72] to-[#c7b37a]" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand-dark" aria-hidden="true">
                  <WidgetIcon path={widgetIcons.bulb} />
                </span>
                <h3 id="report-executive-summary" className="font-display text-base font-semibold text-ink">{t("Executive summary")}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary sm:text-[15px]">{communityReport.executive_summary}</p>
            </section>

            <section aria-labelledby="report-key-metrics">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 id="report-key-metrics" className="font-display text-base font-semibold text-ink">{t("Key metrics")}</h3>
                  <p className="mt-0.5 text-xs text-ink-faint">{t("A snapshot of recorded community activity")}</p>
                </div>
                <span className="hidden rounded-full border border-[#e1e9de] bg-white/80 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted sm:inline-flex">{t("Summary")}</span>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {communityReport.key_metrics.map((metric) => (
                  <div key={metric.label} className="group relative overflow-hidden rounded-2xl border border-[#e1e8dd] bg-[linear-gradient(145deg,#ffffff_0%,#f7faf5_100%)] p-4 shadow-[0_4px_14px_rgba(24,38,25,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[0_10px_22px_rgba(24,38,25,0.07)]">
                    <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand/70 via-[#9fbd9a] to-transparent" aria-hidden="true" />
                    <dt className="text-xs font-semibold leading-relaxed text-ink-muted">{t(metric.label)}</dt>
                    <dd className="mt-2 break-words font-display text-2xl font-semibold leading-tight tracking-tight text-ink">{metric.value}</dd>
                    <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{t(metric.context)}</p>
                  </div>
                ))}
              </dl>
            </section>

            <section
              aria-labelledby="report-urgent-cases"
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
                communityReport.urgent_cases_summary.count > 0
                  ? "border-[#efd6d0] bg-[radial-gradient(ellipse_at_top_right,rgba(190,73,53,0.08),transparent_45%),linear-gradient(135deg,#fff8f6_0%,#ffffff_100%)]"
                  : "border-[#dce8dd] bg-[linear-gradient(135deg,#f6faf5_0%,#ffffff_100%)]",
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                  communityReport.urgent_cases_summary.count > 0
                    ? "border-[#efd6d0] bg-white text-emergency-red"
                    : "border-[#dce8dd] bg-white text-brand-dark",
                )} aria-hidden="true">
                  <WidgetIcon path={widgetIcons.alert} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="report-urgent-cases" className={cn("font-display text-base font-semibold", communityReport.urgent_cases_summary.count > 0 ? "text-emergency-red" : "text-brand-dark")}>
                      {t("Urgent cases")}
                    </h3>
                    <span className={cn(
                      "rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold",
                      communityReport.urgent_cases_summary.count > 0
                        ? "border-[#efd6d0] bg-white text-emergency-red"
                        : "border-[#dce8dd] bg-white text-brand-dark",
                    )}>
                      {communityReport.urgent_cases_summary.count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{communityReport.urgent_cases_summary.narrative}</p>
                  {communityReport.urgent_cases_summary.barangays_involved.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{t("Barangays")}</span>
                      {communityReport.urgent_cases_summary.barangays_involved.map((barangay) => (
                        <span key={barangay} className="rounded-full border border-[#ecdcd7] bg-white/85 px-2.5 py-1 text-xs font-medium text-ink-secondary">{barangay}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section aria-labelledby="report-barangays">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e0e9dd] bg-[#f4f8f2] text-brand-dark" aria-hidden="true">
                  <WidgetIcon path={widgetIcons.map} />
                </span>
                <div>
                  <h3 id="report-barangays" className="font-display text-base font-semibold text-ink">{t("Barangay activity")}</h3>
                  <p className="text-xs text-ink-faint">{t("Areas highlighted by current dashboard counts")}</p>
                </div>
              </div>
              {communityReport.barangay_breakdown.length > 0 ? (
                <ul className="grid gap-2.5 lg:grid-cols-2">
                  {communityReport.barangay_breakdown.map((item, index) => (
                    <li key={item.barangay} className="flex gap-3 rounded-2xl border border-[#e3e9df] bg-white/75 p-3.5 shadow-[0_3px_10px_rgba(24,38,25,0.025)] transition duration-200 hover:border-brand/20 hover:shadow-[0_8px_18px_rgba(31,74,54,0.06)]">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f2f6ef] font-mono text-[10px] font-semibold text-brand-dark">{String(index + 1).padStart(2, "0")}</span>
                      <span className="min-w-0 text-sm leading-relaxed">
                        <span className="font-semibold text-ink">{item.barangay}</span>
                        <span className="mt-0.5 block text-ink-secondary">{item.narrative}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-[#dce5d8] bg-white/60 p-4 text-sm text-ink-muted">{t("No barangay activity is available for this snapshot.")}</p>
              )}
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e1e8dd] bg-white/75 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2f6ef] text-brand-dark" aria-hidden="true"><WidgetIcon path={widgetIcons.trend} /></span>
                  <h3 className="font-display text-sm font-semibold text-ink">{t("Weekly trend")}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{communityReport.trend_narrative}</p>
              </div>
              <div className="rounded-2xl border border-[#e1e8dd] bg-white/75 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2f6ef] text-brand-dark" aria-hidden="true"><WidgetIcon path={widgetIcons.list} /></span>
                  <h3 className="font-display text-sm font-semibold text-ink">{t("Most reported symptoms")}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{communityReport.top_symptoms_narrative}</p>
              </div>
            </section>

            <section aria-labelledby="report-recommended-actions" className="rounded-2xl border border-[#dce5d8] bg-[linear-gradient(135deg,#f4f8f2_0%,#ffffff_78%)] p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white shadow-sm" aria-hidden="true">
                  <WidgetIcon path={widgetIcons.alert} />
                </span>
                <div>
                  <h3 id="report-recommended-actions" className="font-display text-base font-semibold text-ink">{t("Recommended actions")}</h3>
                  <p className="text-xs text-ink-faint">{t("Suggested review priorities from this snapshot")}</p>
                </div>
              </div>
              {communityReport.recommended_actions.length > 0 ? (
                <ol className="mt-4 space-y-2.5">
                  {communityReport.recommended_actions.map((action, index) => (
                    <li key={action} className="flex gap-3 rounded-xl border border-white/90 bg-white/75 px-3 py-3 text-sm leading-relaxed text-ink-secondary shadow-[0_2px_8px_rgba(24,38,25,0.025)]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#dce7da] bg-[#f6f9f4] font-mono text-[10px] font-semibold text-brand-dark">{index + 1}</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 rounded-xl border border-white/90 bg-white/70 p-3 text-sm text-ink-muted">{t("No case-specific action is indicated by the available dashboard counts.")}</p>
              )}
            </section>
          </div>
        </Panel>
      )}

      <Panel
        title={t("Barangay coverage")}
        badge={<TagBadge tone="neutral">{t("Geographic view")}</TagBadge>}
        className="border-[#dce5d8] bg-[radial-gradient(ellipse_at_top_right,rgba(47,107,79,0.07),transparent_42%),linear-gradient(180deg,#FFFFFF_0%,#F9FBF8_100%)] shadow-[0_14px_34px_rgba(24,38,25,0.055)]"
      >
        <div className="space-y-3">
          {barangayStats.length > 0 ? barangayStats.map((item) => {
            const otherCases = Math.max(item.total - item.urgent - item.follow_up, 0);
            const totalWidth = item.total > 0 ? `${Math.max((item.total / maxBarangayCases) * 100, 4)}%` : "0%";
            const itemTotal = Math.max(item.total, 1);
            return (
              <div key={item.barangay} className="rounded-2xl border border-[#e3e9df] bg-white/80 p-3.5 shadow-[0_3px_10px_rgba(24,38,25,0.025)] transition duration-200 hover:border-brand/20 hover:shadow-[0_8px_18px_rgba(31,74,54,0.06)] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#e0e9dd] bg-[#f4f8f2] text-brand-dark" aria-hidden="true">
                      <WidgetIcon path={widgetIcons.map} />
                    </span>
                    <span className="truncate text-sm font-semibold text-ink">{item.barangay}</span>
                  </div>
                  <span className="shrink-0 rounded-lg border border-[#e1e9de] bg-[#f7faf5] px-2.5 py-1 font-mono text-xs font-semibold text-ink">{item.total} <span className="font-sans font-medium text-ink-muted">{t("total")}</span></span>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#edf1ea] shadow-[inset_0_1px_2px_rgba(24,38,25,0.10)]"
                  role="img"
                  aria-label={`${item.barangay}: ${item.total} total cases, ${item.urgent} urgent, ${item.follow_up} follow-up, ${otherCases} routine`}
                >
                  <div className="flex h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out" style={{ width: totalWidth }}>
                    {item.urgent > 0 ? <span className="h-full bg-triage-red" style={{ width: `${(item.urgent / itemTotal) * 100}%` }} /> : null}
                    {item.follow_up > 0 ? <span className="h-full bg-triage-yellow" style={{ width: `${(item.follow_up / itemTotal) * 100}%` }} /> : null}
                    {otherCases > 0 ? <span className="h-full bg-triage-green" style={{ width: `${(otherCases / itemTotal) * 100}%` }} /> : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#efdeda] bg-[#fff7f5] px-2.5 py-1 text-[11px] font-medium text-[#9c4437]"><span className="h-1.5 w-1.5 rounded-full bg-triage-red" aria-hidden="true" />{item.urgent} {t("urgent")}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eee5cf] bg-[#fcf9f0] px-2.5 py-1 text-[11px] font-medium text-[#85651d]"><span className="h-1.5 w-1.5 rounded-full bg-triage-yellow" aria-hidden="true" />{item.follow_up} {t("Follow-up")}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dce9dd] bg-[#f5faf5] px-2.5 py-1 text-[11px] font-medium text-[#286447]"><span className="h-1.5 w-1.5 rounded-full bg-triage-green" aria-hidden="true" />{otherCases} {t("Routine")}</span>
                </div>
              </div>
            );
          }) : <p className="rounded-2xl border border-dashed border-[#dce5d8] bg-white/60 p-5 text-sm text-ink-muted">{t("No barangay data available.")}</p>}
        </div>
      </Panel>
      <Panel title={t("Operational insights")} badge={<TagBadge>{t("Live")}</TagBadge>} className="border-[#dce5d8] shadow-[0_14px_34px_rgba(24,38,25,0.055)]">
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
        <PageMain wide className="max-w-[1600px] xl:max-w-[1600px] 2xl:max-w-[1600px]">
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
          <PageMain wide className="max-w-[1600px] xl:max-w-[1600px] 2xl:max-w-[1600px]">
            <div className="overflow-hidden rounded-[30px] border border-[#d1d9cf] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_30%),linear-gradient(135deg,#183D2D_0%,#1F4A36_42%,#2E6A52_100%)] p-px shadow-[0_28px_60px_rgba(23,63,45,0.18)]">
              <HeroBanner
                eyebrow={t("For municipal health office")}
                title={t("Community health overview")}
                subtitle={t("Track incoming risk signals, prioritize urgent cases, and understand community health trends across barangays.")}
                meta={
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#c7dca8]" aria-hidden="true" />
                      {t("Dashboard snapshot")}
                    </span>
                    {redCases.length > 0 && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-red-100/25 bg-red-950/25 px-3 py-1.5 text-xs font-semibold text-red-50">
                        <WidgetIcon path={widgetIcons.alert} />
                        {redCases.length} {t("urgent")} {t(redCases.length === 1 ? "case" : "cases")}
                      </span>
                    )}
                  </>
                }
                actions={
                  <>
                    <PrimaryButton type="button" onClick={() => void refreshSummary()} disabled={refreshing} className="rounded-xl border border-white/35 bg-white/12 px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(8,35,22,0.12)] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                      {refreshing ? t("Refreshing…") : t("Refresh data")}
                    </PrimaryButton>
                    <PrimaryButton type="button" onClick={generateReport} disabled={!stats} className="dashboard-report-button w-full rounded-xl px-5 text-sm font-semibold shadow-[0_8px_20px_rgba(8,35,22,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto">
                      {t("Generate report")}
                    </PrimaryButton>
                  </>
                }
              />
            </div>

            <div className="mt-6 hidden md:block">
              <nav aria-label={t("Dashboard sections")} className="mb-4 flex flex-wrap gap-1.5 rounded-[22px] border border-[#d7e0d2] bg-white/80 p-1.5 shadow-[0_10px_28px_rgba(20,31,25,0.06)] backdrop-blur">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "rounded-[16px] px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                      activeSection === section.id
                        ? "bg-brand text-brand-foreground shadow-[0_8px_20px_rgba(47,107,79,0.2)]"
                        : "text-ink-secondary hover:bg-brand-tint/55 hover:text-ink",
                    )}
                  >
                    {t(section.label)}
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
  const t = useDashboardText();
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" aria-busy="true" aria-label={t("Loading dashboard")} />}>
      <DashboardPageContent />
    </Suspense>
  );
}
