"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, PageMain, PageTitle, PrimaryLink } from "@/app/components/ui/primitives";
import Disclaimer from "../../components/Disclaimer";
import MedicationGuidanceCard from "../../components/MedicationGuidanceCard";
import PageHeader from "../../components/PageHeader";
import RiskCard from "../../components/RiskCard";
import ResultText from "../../components/ResultText";
import SymptomSummaryChip from "../../components/SymptomSummaryChip";
import ClinicalExplanation from "../ClinicalExplanation";
import { IconAssessment, IconCheck, IconChevronDown, IconHistory } from "../../components/ui/icons";
import { clearPendingGuestPayload, type AnalyzeResult } from "@/lib/api";
import { getReportedSymptomClassifications } from "@/lib/coughClassifications";
import { ruleContributedToRisk, translatedRuleDescription, translatedRuleTitle } from "../resultTranslations";

const RULE_TITLES: Record<string, string> = {
  "duration-score": "Symptom duration",
  "headache-triggered-by-activity-review": "Headache Triggered by Activity Needs Review",
  "first-cluster-like-headache-review": "First Cluster-Like Headache Needs Review",
  "persistent-fever": "Fever duration needs review",
  "persistent-cough": "Cough duration needs review",
  "persistent-diarrhea": "Diarrhea duration needs review",
  "high-severity-score": "Total score requires urgent care",
  "moderate-severity-score": "Your symptoms need a consultation",
  "mild-severity-score": "Your symptoms are currently mild",
  "difficulty-breathing-override": "Breathing difficulty needs urgent attention",
  "four-symptom-override": "Several symptoms were reported together",
  "symptom-count-escalation": "Several symptoms increased the urgency",
  "symptom-combination-score": "Symptoms were assessed together",
  "weighted-symptom-score": "Your symptom score was calculated",
  "unclear-symptoms-floor": "We could not fully understand the symptoms",
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
    const score = description.match(/final score (?:is|of) (\d+)/)?.[1];
    return `The recognized symptoms contributed to a combined clinical score of ${score ?? "the recorded total"}.`;
  }
  if (name === "symptom-combination-score") {
    const score = description.match(/final urgency level \((\d+)\)/)?.[1];
    return `The recognized symptoms were considered together. Their combined score was ${score ?? "included in the assessment"}.`;
  }
  if (name === "high-severity-score") return "A combined score of 8 or higher is in the RED range and requires urgent medical attention.";
  if (name === "moderate-severity-score") {
    const score = description.match(/severity \((\d+)\)/)?.[1];
    return `Your combined symptom score is ${score ?? "within the consultation range"}. Scores from 3 to 7 are marked YELLOW, which means you should contact a health worker or visit the RHU.`;
  }
  if (name === "mild-severity-score") {
    return "The recognized symptoms are below the consultation score. Continue monitoring and seek help if they worsen.";
  }
  return description;
}

export default function GuestResultPage() {
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("healthguard_guest_result");
    const timer = window.setTimeout(() => {
      if (stored) {
        try {
          setResult(JSON.parse(stored) as AnalyzeResult);
        } catch {
          window.sessionStorage.removeItem("healthguard_guest_result");
        }
      }
      setSessionChecked(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!sessionChecked) {
    return <PageMain narrow><h1 className="sr-only">Loading assessment summary</h1><ResultText as="p" role="status" className="text-sm text-ink-muted" english="Loading assessment summary…" filipino="Nilo-load ang buod ng pagsusuri…" /></PageMain>;
  }

  if (!result) {
    return <PageMain narrow><PageTitle><ResultText english="Assessment summary unavailable" filipino="Hindi makita ang buod ng pagsusuri" /></PageTitle><PrimaryLink href="/assessment" className="mt-6"><ResultText english="Start a new assessment" filipino="Magsimula ng bagong pagsusuri" /></PrimaryLink></PageMain>;
  }

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain wide>
        <div className="relative mb-6 overflow-hidden rounded-3xl border border-[#DCE6D9] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF8_62%,#F0F5ED_100%)] px-5 py-5 shadow-[0_14px_36px_rgba(31,74,54,0.07)] sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#4D8061] to-[#C7B37A]" aria-hidden="true" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#DCE7D9] bg-white/85 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-dark shadow-[0_2px_8px_rgba(31,74,54,0.04)] sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
              <ResultText english="HealthGuard clinical summary" filipino="Buod pangkalusugan ng HealthGuard" />
            </p>
            <ResultText as="h1" className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-ink sm:mt-2 sm:text-4xl" english="Assessment summary" filipino="Buod ng pagsusuri" />
            <ResultText as="p" className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base" english="This result is available now. No account is required to view it." filipino="Makikita na ang resultang ito. Hindi kailangan ng account para makita ito." />
          </div>
        </div>

        <div className="space-y-6">
          <Card className="!p-4 sm:!p-6 lg:!p-7 overflow-hidden rounded-[24px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] shadow-[0_20px_55px_rgba(15,23,42,0.06)] xl:grid xl:grid-cols-2 xl:items-start xl:gap-4">
            <div className="xl:col-span-2">
              <RiskCard
                level={result.risk_level}
                message={result.message}
                recommendation={result.recommendation}
                triggeredRules={result.triggered_rules}
                detectedSymptoms={result.detected_symptoms.map((symptom) => symptom.medical_term)}
              />
            </div>

            <section className="relative mt-6 overflow-hidden rounded-3xl border border-[#DCE6D9] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAF6_100%)] p-4 shadow-[0_12px_30px_rgba(31,74,54,0.05)] sm:p-5 xl:mt-0">
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#DCE6D9] to-transparent" aria-hidden="true" />
              <div className="border-b border-[#e6eee1] pb-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DCE7D9] bg-white text-brand shadow-[0_3px_10px_rgba(31,74,54,0.06)]" aria-hidden="true">
                    <IconCheck size={16} />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <ResultText as="h3" className="font-display text-base font-semibold leading-tight text-ink sm:text-lg" english="Condition summary" filipino="Buod ng kondisyon" />
                    <span className="shrink-0 rounded-full border border-[#cfe0cf] bg-white px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-dark shadow-[0_2px_8px_rgba(47,107,79,0.05)]">
                      <ResultText english={`${result.detected_symptoms.length} noted`} filipino={`${result.detected_symptoms.length} naitala`} />
                    </span>
                  </div>
                </div>
                <ResultText as="p" className="mt-2.5 text-xs leading-relaxed text-ink-muted sm:text-sm" english="Symptoms are summaries, not diagnoses. The text-match percentage shows how closely your wording matched a symptom phrase; it is not clinically calibrated and does not estimate the chance of a disease." filipino="Mga buod lamang ang mga sintomas, hindi diagnosis. Ipinapakita ng porsiyento ng pagtutugma ng teksto kung gaano kalapit ang mga salitang ginamit mo sa isang parirala ng sintomas; hindi ito na-calibrate sa klinika at hindi tinatantiya ang posibilidad ng sakit." />
              </div>
              {result.detected_symptoms.length > 0 ? (
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.detected_symptoms.map((symptom) => {
                    const reportedTypes = getReportedSymptomClassifications(symptom.medical_term, result.input_text);
                    return <SymptomSummaryChip key={symptom.medical_term} symptom={symptom.medical_term} reportedTypes={reportedTypes} confidence={symptom.confidence} />;
                  })}
                </ul>
              ) : <ResultText as="p" className="mt-3 text-sm leading-relaxed text-ink-muted" english="No recognizable symptoms were detected." filipino="Walang nakilalang sintomas." />}
              {(result.icd10_codes?.length ?? 0) > 0 && (
                <div className="mt-4 rounded-xl border border-[#DDE7DB] bg-white/75 p-3">
                  <ResultText as="p" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted" english="ICD-10 references for reported symptoms — not diagnoses" filipino="Mga sangguniang ICD-10 para sa naiulat na sintomas — hindi mga diagnosis" />
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-secondary">
                    {(result.icd10_codes ?? []).map((item) => (
                      <li key={`${item.symptom}-${item.code}`}>
                        <span className="font-mono font-semibold text-brand-dark">{item.code}</span> · {item.symptom}: {item.description}
                        {item.source_url && <> · <a className="font-semibold text-brand-dark underline underline-offset-2" href={item.source_url} target="_blank" rel="noreferrer">Source: {item.source ?? item.coding_system}</a></>}
                        {item.reviewer && <> · Reviewed by {item.reviewer}{item.reviewed_at ? ` (${item.reviewed_at})` : ""}</>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(result.icd10_uncoded?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-xl border border-[#E8D19A] bg-[#FFF9E9] p-3">
                  <ResultText as="p" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#795516]" english="Symptoms left uncoded" filipino="Mga sintomas na walang code" />
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-secondary">
                    {(result.icd10_uncoded ?? []).map((item) => <li key={item.symptom}><span className="font-semibold">{item.symptom}:</span> {item.reason}</li>)}
                  </ul>
                </div>
              )}
            </section>

            <details className="group mt-4 min-w-0 rounded-2xl border border-[#dfe8dc] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAF6_100%)] p-3 shadow-[0_8px_22px_rgba(31,74,54,0.04)] transition-[border-color,box-shadow] duration-200 open:border-[#cbdac8] open:shadow-[0_14px_30px_rgba(31,74,54,0.07)] sm:p-4 xl:mt-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand/15">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dce7d9] bg-white text-brand shadow-[0_3px_10px_rgba(31,74,54,0.05)]" aria-hidden="true">
                    <IconAssessment size={17} />
                  </span>
                  <span className="min-w-0">
                    <ResultText as="span" className="block text-sm font-semibold text-ink sm:text-base" english="Clinical explanation" filipino="Paliwanag sa pagsusuri" />
                    <ResultText as="span" className="mt-0.5 block text-xs leading-relaxed text-ink-muted sm:text-sm" english="Why this level, warning signs, next steps, and limits" filipino="Bakit ganito ang antas, mga babala, susunod na hakbang, at limitasyon" />
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dce7d9] bg-white text-brand transition-transform duration-200 group-open:rotate-180" aria-hidden="true">
                  <IconChevronDown size={16} />
                </span>
              </summary>
              <ClinicalExplanation
                level={result.risk_level}
                reason={result.reason}
                recommendation={result.recommendation}
                triggeredRules={result.triggered_rules}
                detectedSymptoms={result.detected_symptoms.map((symptom) => symptom.medical_term)}
              />
              {result.input_text && (
                <p className="mt-4 rounded-xl border border-[#e2e9de] bg-white/80 px-3.5 py-3 text-xs leading-5 text-ink-faint sm:text-sm sm:leading-relaxed">
                  <ResultText as="span" className="mb-1 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted sm:text-[10px]" english="Reported information" filipino="Iniulat na impormasyon" />
                  <span className="italic text-ink-muted">“{result.input_text}”</span>
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
                    <ResultText as="span" className="block text-sm font-semibold text-ink sm:text-base" english="Rules used" filipino="Mga ginamit na tuntunin" />
                    <ResultText as="span" className="mt-0.5 block text-xs leading-relaxed text-ink-muted sm:text-sm" english="See which rules influenced this result" filipino="Tingnan kung aling mga tuntunin ang nakaapekto sa resulta" />
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full border border-[#c9d8cb] bg-white/85 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-dark shadow-[0_2px_8px_rgba(31,74,54,0.05)] sm:text-[11px]"><ResultText english={`${result.triggered_rules.length} applied`} filipino={`${result.triggered_rules.length} nailapat`} /></span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d5e2d2] bg-white text-brand transition-transform duration-200 group-open/rules:rotate-180" aria-hidden="true">
                    <IconChevronDown size={16} />
                  </span>
                </span>
              </summary>
              <ResultText as="p" className="mt-4 rounded-xl border border-[#dfe8dc] bg-white/75 px-3.5 py-3 text-xs leading-5 text-ink-muted sm:text-sm sm:leading-6" english="Rules marked “Contributed to risk” affected the score or risk decision. Other applied rules provide context but do not change the displayed risk level on their own." filipino="Nakaapekto sa marka o desisyon sa panganib ang mga tuntuning may markang “Nakatulong sa antas ng panganib.” Nagbibigay ng konteksto ang ibang tuntunin ngunit hindi binabago ng mga ito lamang ang ipinakitang antas." />
              <ol className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
                {result.triggered_rules.map((rule, index) => {
                  const contributedToRisk = ruleContributedToRisk(rule.name, result.risk_level);
                  return <li key={`${rule.name}-${index}`} className="group relative rounded-xl border border-[#dfe8dc] bg-white/90 px-3.5 py-3 shadow-[0_3px_10px_rgba(31,74,54,0.03)] transition-colors duration-200 hover:border-[#b9ceb9] sm:px-4 sm:py-3.5"><span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-brand/45 transition-colors duration-200 group-hover:bg-brand" aria-hidden="true" /><div className="flex min-w-0 items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#dce8d8] bg-[#f4f8f0] font-mono text-[11px] font-semibold text-brand-dark">{index + 1}</span><div className="min-w-0"><ResultText as="p" className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-secondary sm:text-[11px] sm:tracking-[0.08em]" english={ruleTitle(rule.name)} filipino={translatedRuleTitle(rule.name, ruleTitle(rule.name))} /><ResultText as="p" className="mt-1 text-[13px] leading-5 text-ink-muted sm:mt-1.5 sm:text-sm sm:leading-6" english={ruleDescription(rule.name, rule.description)} filipino={translatedRuleDescription(rule.name, rule.description)} /><ResultText as="span" className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold leading-4 ${contributedToRisk ? "border-[#c9d8cb] bg-[#f0f7ef] text-brand-dark" : "border-[#e2e7e0] bg-[#f7f8f6] text-ink-muted"}`} english={contributedToRisk ? "Contributed to risk" : "Applied for context"} filipino={contributedToRisk ? "Nakatulong sa antas ng panganib" : "Inilapat bilang konteksto"} /></div></div></li>;
                })}
              </ol>
            </details>

            {result.risk_level !== "RED" && result.pre_medication && (
              <details className="mt-4 rounded-[18px] border border-[#E4C77C] bg-[linear-gradient(135deg,#FFFDF2_0%,#FFF8DC_58%,#FFF4C8_100%)] p-3 sm:p-5 xl:col-span-2 xl:mt-0">
                <summary className="cursor-pointer list-none">
                  <ResultText className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#966719]" english="Pre-medication guidance" filipino="Gabay bago uminom ng gamot" />
                  <ResultText className="mt-1 block text-xs leading-5 text-ink-secondary sm:text-sm" english="View safety information" filipino="Tingnan ang impormasyong pangkaligtasan" />
                </summary>
                <MedicationGuidanceCard riskLevel={result.risk_level} inputText={result.input_text} detectedSymptoms={result.detected_symptoms.map((symptom) => symptom.medical_term)} guidance={{ drugName: result.pre_medication.medication_name, dosage: result.pre_medication.dosage, contraindications: result.pre_medication.contraindications, sideEffects: result.pre_medication.side_effects, precautions: result.pre_medication.precautions, note: result.pre_medication.note }} />
              </details>
            )}

            <section className="relative mt-6 overflow-hidden rounded-[24px] border border-[#C9DCCB] bg-[linear-gradient(135deg,#F6FAF3_0%,#EAF4E8_100%)] p-5 shadow-[0_14px_32px_rgba(31,74,54,0.08)] sm:p-6 xl:mt-0">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full border border-brand/10 bg-white/25" aria-hidden="true" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-[0_8px_16px_rgba(31,74,54,0.18)]"><IconHistory size={20} /></span>
                <div>
                  <ResultText as="p" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-dark" english="Keep your record" filipino="I-save ang iyong tala" />
                  <ResultText as="h2" className="mt-1 font-display text-xl font-semibold leading-tight text-ink sm:text-2xl" english="Save this assessment" filipino="I-save ang pagsusuring ito" />
                  <ResultText as="p" className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary" english="Guest results stay in this browser tab. Create an account or sign in to save this result in your health history." filipino="Mananatili sa tab ng browser na ito ang resulta ng bisita. Gumawa ng account o mag-sign in upang mai-save ito sa iyong kasaysayang pangkalusugan." />
                </div>
              </div>
              <div className="relative mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/register?next=/result/guest" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand px-4 font-semibold text-brand-foreground shadow-[0_8px_18px_rgba(31,74,54,0.16)] transition hover:bg-brand-dark"><ResultText english="Create account" filipino="Gumawa ng account" /></Link>
                <Link href="/login?next=/result/guest" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-brand/25 bg-white/85 px-4 font-semibold text-brand-dark transition hover:border-brand/50 hover:bg-white"><ResultText english="Log in" filipino="Mag-sign in" /></Link>
              </div>
            </section>
            <div className="mt-6 rounded-2xl border border-[#DDE7DB] bg-[#F7FAF5] p-3 shadow-[0_10px_24px_rgba(31,74,54,0.05)] sm:p-4 xl:mt-0">
              <ResultText as="p" className="px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint" english="Continue" filipino="Magpatuloy" />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/assessment" className="min-h-12 flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-dark font-semibold shadow-[0_10px_20px_rgba(31,74,54,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(31,74,54,0.22)]"><ResultText english="New assessment" filipino="Bagong pagsusuri" /></PrimaryLink>
                <Link href="/" onClick={clearPendingGuestPayload} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBDACB] bg-white px-4 font-semibold text-ink-secondary transition hover:-translate-y-0.5 hover:border-brand/45 hover:text-brand-dark"><ResultText english="Continue without saving" filipino="Magpatuloy nang hindi sine-save" /></Link>
              </div>
            </div>
            <Disclaimer className="mt-6 xl:col-span-2 xl:mt-0" />
          </Card>

          <aside className="grid gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-[28px] border border-[#F0B5AA] bg-[linear-gradient(135deg,#8E2F24_0%,#6F211C_52%,#4B1715_100%)] p-4 text-[#FFF7F3] shadow-[0_22px_60px_rgba(120,35,28,0.28)] sm:p-6">
              <ResultText as="p" className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD2C8]" english="Irosin emergency" filipino="Emergency sa Irosin" />
              <ResultText as="h2" className="mt-2 font-display text-xl font-semibold leading-tight text-white sm:mt-3 sm:text-2xl" english="Call if symptoms worsen" filipino="Tumawag kung lumala ang mga sintomas" />
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                <div className="col-span-2 rounded-2xl border border-white/25 bg-white/10 p-3 sm:col-span-1 sm:p-3.5">
                  <ResultText as="p" className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#FFD2C8] sm:text-[10px] sm:tracking-[0.12em]" english="EMERGENCY HOTLINE" filipino="LINYA NG EMERGENCY" />
                  <p className="mt-1 text-xl font-semibold tracking-wide text-white sm:text-2xl">911</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 sm:p-3.5">
                  <ResultText as="p" className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#FFD2C8] sm:text-[10px] sm:tracking-[0.12em]" english="RHU CONTACT" filipino="KONTAK NG RHU" />
                  <p className="mt-1 whitespace-nowrap text-base font-semibold tracking-tight text-white sm:text-lg sm:tracking-normal">09702480983</p>
                  <ResultText as="p" className="text-sm text-[#FFE4DD]" english="Lying In" filipino="Pasilidad para sa panganganak" />
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3 sm:p-3.5">
                  <ResultText as="p" className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[#FFD2C8] sm:text-[10px] sm:tracking-[0.12em]" english="OPD" filipino="OPD" />
                  <p className="mt-1 whitespace-nowrap text-base font-semibold tracking-tight text-white sm:text-lg sm:tracking-normal">09702576740</p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">            <ResultText as="p" className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint" english="What to do now" filipino="Ano ang dapat gawin ngayon" /><ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary"><li><ResultText english="Rest, hydrate, and monitor your symptoms closely." filipino="Magpahinga, uminom ng sapat na tubig, at bantayang mabuti ang mga sintomas." /></li><li><ResultText english="Follow up with a barangay health worker or clinic if symptoms remain active." filipino="Mag-follow up sa barangay health worker o klinika kung nagpapatuloy ang mga sintomas." /></li><li><ResultText english="If breathing is difficult, chest pain is severe, or you feel faint, call emergency services immediately." filipino="Kung hirap huminga, matindi ang pananakit ng dibdib, o nahihilo, tumawag agad sa emergency services." /></li></ul></div>
          </aside>
        </div>
      </PageMain>
    </div>
  );
}