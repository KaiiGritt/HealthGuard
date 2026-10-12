import Link from "next/link";
import { notFound } from "next/navigation";
import { IconAssessment, IconCheck, IconChevronDown } from "@/app/components/ui/icons";
import {
  Card,
  PageMain,
  PrimaryLink,
} from "@/app/components/ui/primitives";
import { formatAssessmentRecordNumber, getAssessment, type AssessmentOut } from "@/lib/api";
import Disclaimer from "../../components/Disclaimer";
import MedicationGuidanceCard from "../../components/MedicationGuidanceCard";
import PageHeader from "../../components/PageHeader";
import RiskCard from "../../components/RiskCard";

const MESSAGES: Record<string, string> = {
  GREEN: "Your symptoms appear mild. / Mukhang banayad ang iyong mga sintomas.",
  YELLOW: "You may need a consultation. / Maaaring kailangan mong kumonsulta.",
  RED: "Go to the nearest hospital now. / Pumunta agad sa pinakamalapit na ospital.",
};

const RULE_TITLES: Record<string, string> = {
  "duration-score": "Symptom duration",
  "high-severity-score": "Total score requires urgent care",
  "moderate-severity-score": "Your symptoms need a consultation",
  "mild-severity-score": "Your symptoms are currently mild",
  "difficulty-breathing-override": "Breathing difficulty needs urgent attention",
  "four-symptom-override": "Several symptoms were reported together",
  "symptom-count-escalation": "Several symptoms increased the urgency",
  "symptom-combination-score": "Symptoms were assessed together",
  "weighted-symptom-score": "Your symptom score was calculated",
  "unclear-symptoms-floor": "We could not fully understand the symptoms",
  "repeat-assessment-escalation": "The same symptoms were reported again",
  "persistent-fever": "Fever has lasted longer than expected",
  "persistent-cough": "Cough has lasted longer than expected",
  "persistent-diarrhea": "Diarrhea has lasted longer than expected",
};

function ruleTitle(name: string) {
  if (RULE_TITLES[name]) return RULE_TITLES[name];
  if (name.startsWith("critical:")) return "An emergency warning symptom was detected";
  return name.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ruleDescription(name: string, description: string) {
  if (name === "duration-score") {
    const match = description.match(/lasting ([\d.]+) day\(s\) contribute (\d+) duration point/);
    return match ? `The reported duration was ${match[1]} days and added ${match[2]} point(s) to the clinical score.` : "The symptom duration was included in the clinical score.";
  }
  if (name === "persistent-fever") return "Fever lasting more than three days should be reviewed by a health worker.";
  if (name === "persistent-cough") return "A cough lasting more than 30 days needs further clinical assessment.";
  if (name === "persistent-diarrhea") return "Diarrhea lasting 14 days or longer needs clinical assessment.";
  if (name === "weighted-symptom-score") {
    const score = description.match(/final score is (\d+)/)?.[1];
    return `The recognized symptoms contributed to a combined clinical score of ${score ?? "the recorded total"}.`;
  }
  if (name === "high-severity-score") return "The total clinical score is 6 or higher, which is in the RED range and requires urgent medical attention.";
  if (name === "moderate-severity-score") {
    const score = description.match(/severity \((\d+)\)/)?.[1];
    return `Your combined symptom score is ${score ?? "within the consultation range"}. Scores from 3 to 5 are marked YELLOW, which means you should contact a health worker or visit the RHU.`;
  }
  if (name === "mild-severity-score") {
    return "The recognized symptoms are below the consultation score. Continue monitoring and seek help if they worsen.";
  }
  return description;
}

function formatRecordedAt(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  return new Date(normalized).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let record: AssessmentOut;
  try {
    record = await getAssessment(id);
  } catch {
    notFound();
  }

  const created = formatRecordedAt(record.created_at);

  return (
    <>
      <PageHeader />
      <div className="premium-page min-h-screen">
      <PageMain wide>
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#DCE6D9] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF8_62%,#F0F5ED_100%)] px-5 py-5 shadow-[0_14px_36px_rgba(31,74,54,0.07)] sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#4D8061] to-[#C7B37A]" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#DCE7D9] bg-white/85 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-dark shadow-[0_2px_8px_rgba(31,74,54,0.04)] sm:text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                HealthGuard clinical summary
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:mt-2 sm:text-4xl">Assessment summary</h1>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-2xl border border-[#DCE6D9] bg-white/75 px-4 py-3 sm:shrink-0 sm:justify-end">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Record no.</p>
                <p className="mt-0.5 font-mono text-xs font-semibold tracking-[0.06em] text-brand-dark sm:text-sm">{formatAssessmentRecordNumber(record.id)}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Recorded</p>
                <p className="mt-0.5 text-xs font-medium text-ink-muted sm:text-sm">{created}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="!p-4 sm:!p-6 lg:!p-7 overflow-hidden rounded-[24px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] shadow-[0_20px_55px_rgba(15,23,42,0.06)] xl:grid xl:grid-cols-2 xl:items-start xl:gap-4">
            <div className="mt-0 xl:col-span-2">
              <RiskCard
                level={record.risk_level}
                message={MESSAGES[record.risk_level] ?? ""}
                recommendation={record.recommendation}
              />
            </div>

            <section className="relative mt-6 overflow-hidden rounded-3xl border border-[#DCE6D9] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAF6_100%)] p-4 shadow-[0_12px_30px_rgba(31,74,54,0.05)] sm:p-5 xl:mt-0">
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#DCE6D9] to-transparent" aria-hidden="true" />
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e6eee1] pb-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#DCE7D9] bg-white text-brand shadow-[0_3px_10px_rgba(31,74,54,0.06)]" aria-hidden="true">
                    <IconCheck size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold leading-tight text-ink sm:text-lg">Condition summary</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted sm:text-sm">Text-match confidence is not medical certainty.</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[#cfe0cf] bg-white px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-dark shadow-[0_2px_8px_rgba(47,107,79,0.05)]">
                  {record.detected_symptoms.length} noted
                </span>
              </div>
              {record.detected_symptoms.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {record.detected_symptoms.map((s) => {
                    const confidence = record.symptom_confidence?.[s];
                    const level = confidence === undefined ? null : confidence >= 0.85 ? "High" : confidence >= 0.65 ? "Medium" : "Low";
                    return (
                      <li
                        key={s}
                        className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-[#cfe0cf] bg-[linear-gradient(180deg,#f2faef_0%,#eaf5ea_100%)] px-3.5 py-2 text-sm font-semibold capitalize text-[#1f4b3d] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e1f1e3] text-[#1d6b4d]">
                          <IconCheck size={12} />
                        </span>
                        <span>{s}</span>
                        {confidence !== undefined && level && (
                          <span
                            aria-label={`Text-match confidence: ${level}, ${Math.round(confidence * 100)} percent`}
                            className="rounded-full border border-[#d6e3d3] bg-white/75 px-2 py-0.5 font-mono text-[9px] font-semibold normal-case tracking-normal text-[#51664F]"
                          >
                            Text match · {level} · {Math.round(confidence * 100)}%
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">No recognized symptoms were found in the information provided.</p>
              )}
            </section>

            <details className="group mt-4 min-w-0 rounded-2xl border border-[#dfe8dc] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAF6_100%)] p-3 shadow-[0_8px_22px_rgba(31,74,54,0.04)] transition-[border-color,box-shadow] duration-200 open:border-[#cbdac8] open:shadow-[0_14px_30px_rgba(31,74,54,0.07)] sm:p-4 xl:mt-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand/15">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dce7d9] bg-white text-brand shadow-[0_3px_10px_rgba(31,74,54,0.05)]" aria-hidden="true">
                    <IconAssessment size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink sm:text-base">Clinical explanation</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted sm:text-sm">View assessment reasoning</span>
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dce7d9] bg-white text-brand transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                  <IconChevronDown size={16} />
                </span>
              </summary>
              <p className="mt-4 border-t border-[#e4ebe1] pt-4 text-sm leading-6 text-ink-secondary sm:text-base sm:leading-7">{record.reason}</p>
              {record.input_text && (
                <p className="mt-4 rounded-xl border border-[#e2e9de] bg-white/80 px-3.5 py-3 text-xs leading-5 text-ink-faint sm:text-sm sm:leading-relaxed">
                  <span className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:text-[10px]">Reported information</span>
                  <span className="italic text-ink-muted">“{record.input_text}”</span>
                </p>
              )}
            </details>

            <details className="group/rules mt-4 overflow-hidden rounded-2xl border border-[#d8e2d3] bg-[linear-gradient(145deg,#fbfcf8_0%,#f2f7ef_100%)] p-3 shadow-[0_12px_28px_rgba(31,74,54,0.05)] transition-[border-color,box-shadow] duration-200 open:border-[#c6d8c4] open:shadow-[0_16px_34px_rgba(31,74,54,0.08)] sm:p-5 xl:col-span-2 xl:mt-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[#d8e2d3]/80 pb-3 outline-none focus-visible:rounded-xl focus-visible:ring-4 focus-visible:ring-brand/15 sm:pb-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d5e2d2] bg-white text-brand shadow-[0_3px_10px_rgba(31,74,54,0.06)]" aria-hidden="true">
                    <IconCheck size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink sm:text-base">Rules used</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted sm:text-sm">View applied assessment rules</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-[#c9d8cb] bg-white/85 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-dark shadow-[0_2px_8px_rgba(31,74,54,0.05)] sm:text-[11px]">{record.triggered_rules.length} applied</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d5e2d2] bg-white text-brand transition-transform duration-200 group-open/rules:rotate-180" aria-hidden="true">
                    <IconChevronDown size={16} />
                  </span>
                </span>
              </summary>
              <ol className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
                {record.triggered_rules.map((rule) => (
                    <li key={rule.name} className="group relative flex gap-3 overflow-hidden rounded-xl border border-[#dfe8dc] bg-white/90 px-3.5 py-3 shadow-[0_3px_10px_rgba(31,74,54,0.03)] transition-colors duration-200 hover:border-[#b9ceb9] sm:px-4 sm:py-3.5">
                    <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-brand/45 transition-colors duration-200 group-hover:bg-brand" aria-hidden="true" />
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dce8d8] bg-[#f4f8f0] font-mono text-[11px] font-semibold text-brand-dark">
                      {record.triggered_rules.indexOf(rule) + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-secondary sm:text-[11px] sm:tracking-[0.08em]">{ruleTitle(rule.name)}</p>
                      <p className="mt-1 text-[13px] leading-5 text-ink-muted sm:mt-1.5 sm:text-sm sm:leading-6">{ruleDescription(rule.name, rule.description)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </details>

            {record.risk_level !== "RED" && (
              <details className="mt-4 rounded-[18px] border border-[#E4C77C] bg-[linear-gradient(135deg,#FFFDF2_0%,#FFF8DC_58%,#FFF4C8_100%)] p-3 sm:p-5 xl:col-span-2 xl:mt-0">
                <summary className="cursor-pointer list-none">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#966719]">Pre-medication guidance</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-secondary sm:text-sm">View safety information</span>
                </summary>
                <MedicationGuidanceCard
                  riskLevel={record.risk_level}
                  inputText={record.input_text}
                  detectedSymptoms={record.detected_symptoms}
                  guidance={
                    record.pre_medication
                      ? {
                          drugName: record.pre_medication.medication_name,
                          dosage: record.pre_medication.dosage,
                          contraindications: record.pre_medication.contraindications,
                          sideEffects: record.pre_medication.side_effects,
                          precautions: record.pre_medication.precautions,
                          note: record.pre_medication.note,
                        }
                      : undefined
                  }
                />
              </details>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row xl:col-span-2 xl:mt-0">
              <PrimaryLink href="/assessment" className="min-h-12 flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-dark font-semibold shadow-[0_12px_28px_rgba(47,107,79,0.15)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(31,74,54,0.22)]">
                New assessment
              </PrimaryLink>
              <Link
                href="/history"
                className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#dfe7dc] bg-white font-semibold text-ink-secondary shadow-[0_6px_16px_rgba(24,38,25,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/45 hover:bg-brand-tint hover:text-brand-dark hover:shadow-[0_14px_26px_rgba(47,107,79,0.1)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
              >
                View history
              </Link>
            </div>

            <Disclaimer className="mt-6 xl:col-span-2 xl:mt-0" />
          </Card>

          <aside className="grid gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-[28px] border border-[#F0B5AA] bg-[radial-gradient(circle_at_top_right,_rgba(255,214,205,0.2),_transparent_34%),linear-gradient(135deg,#8E2F24_0%,#6F211C_52%,#4B1715_100%)] p-4 text-[#FFF7F3] shadow-[0_22px_60px_rgba(120,35,28,0.28)] sm:p-6">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
              <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD2C8]">Irosin emergency</p>
              <h2 className="relative mt-2 font-display text-xl font-semibold leading-tight text-white sm:mt-3 sm:text-2xl">Call if symptoms worsen</h2>
              <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                <div className="col-span-2 rounded-2xl border border-white/25 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:col-span-1 sm:p-3.5">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#FFD2C8] sm:text-[10px] sm:tracking-[0.12em]">EMERGENCY HOTLINE</p>
                  <p className="mt-1 text-xl font-semibold tracking-wide text-white sm:text-2xl">911</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-3.5">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#FFD2C8] sm:text-[10px] sm:tracking-[0.12em]">RHU CONTACT</p>
                  <p className="mt-1 whitespace-nowrap text-base font-semibold tracking-tight text-white sm:text-lg sm:tracking-normal">09702480983</p>
                  <p className="text-sm text-[#FFE4DD]">Lying In</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-3.5">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#FFD2C8] sm:text-[10px] sm:tracking-[0.12em]">OPD</p>
                  <p className="mt-1 whitespace-nowrap text-base font-semibold tracking-tight text-white sm:text-lg sm:tracking-normal">09702576740</p>
                </div>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-[#FFE4DD]">
                For Irosin residents, these available response channels are the fastest route for urgent transfer and emergency assistance.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">What to do now</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                  Rest, hydrate, and monitor your symptoms closely.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  Follow-up with a barangay health worker or clinic if symptoms remain active.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  If breathing is difficult, chest pain is severe, or you feel faint, call emergency services immediately.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </PageMain>
      </div>
    </>
  );
}
