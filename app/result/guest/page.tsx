"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, PageMain, PageTitle, PrimaryLink } from "@/app/components/ui/primitives";
import Disclaimer from "../../components/Disclaimer";
import MedicationGuidanceCard from "../../components/MedicationGuidanceCard";
import PageHeader from "../../components/PageHeader";
import RiskCard from "../../components/RiskCard";
import { IconHistory } from "../../components/ui/icons";
import { clearPendingGuestPayload, type AnalyzeResult } from "@/lib/api";

const MESSAGES: Record<string, string> = {
  GREEN: "Monitor your symptoms / I-monitor ang iyong mga sintomas.",
  YELLOW: "Consult a healthcare professional / Kumonsulta sa health worker.",
  RED: "Seek urgent medical help / Humingi agad ng tulong medikal.",
};

const RULE_TITLES: Record<string, string> = {
  "duration-score": "Symptom duration",
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

export default function GuestResultPage() {
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("healthguard_guest_result");
    if (!stored) return;
    const timer = window.setTimeout(() => setResult(JSON.parse(stored) as AnalyzeResult), 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!result) {
    return <PageMain narrow><PageTitle>Assessment summary unavailable</PageTitle><PrimaryLink href="/assessment" className="mt-6">Start a new assessment</PrimaryLink></PageMain>;
  }

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain narrow className="max-w-4xl">
        <div className="mb-6 border-b border-[#D8E2D3] pb-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">HealthGuard clinical summary</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Assessment summary</h1>
          <p className="mt-2 text-sm text-ink-muted">This result is available now. No account is required to view it.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden rounded-[24px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-4 shadow-[0_20px_55px_rgba(15,23,42,0.06)] sm:p-6 lg:p-7">
            <RiskCard level={result.risk_level} message={MESSAGES[result.risk_level] ?? result.message} recommendation={result.recommendation} />

            <section className="mt-6 rounded-[20px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f7faf4_100%)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-[#e6eee1] pb-3">
                <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint sm:text-xs">Condition summary</h3>
                <span className="rounded-full border border-[#dfeadf] bg-[#f4faef] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-dark">{result.detected_symptoms.length} noted</span>
              </div>
              {result.detected_symptoms.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {result.detected_symptoms.map((symptom) => <li key={symptom.medical_term} className="rounded-full border border-[#cfe0cf] bg-[#eaf5ea] px-3.5 py-2 text-sm font-semibold capitalize text-[#1f4b3d]">{symptom.medical_term}</li>)}
                </ul>
              ) : <p className="mt-3 text-sm leading-relaxed text-ink-muted">No recognizable symptoms were detected.</p>}
            </section>

            <section className="mt-4 rounded-[18px] border border-[#e2e8db] bg-white/80 p-4 sm:p-5">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">Clinical explanation</h3>
              <p className="mt-3 text-base leading-7 text-ink-secondary">{result.reason}</p>
              {result.input_text && <p className="mt-4 border-t border-border/70 pt-3 text-sm leading-relaxed text-ink-faint">Reported information: <span className="italic text-ink-muted">“{result.input_text}”</span></p>}
            </section>

            <section className="mt-4 overflow-hidden rounded-[18px] border border-[#d8e2d3] bg-[linear-gradient(145deg,#fbfcf8_0%,#f2f7ef_100%)] p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8e2d3]/80 pb-4">
                <div>
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-brand-dark lg:text-sm">Rules used</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">Here is why HealthGuard gave you this guidance.</p>
                </div>
                <span className="rounded-full border border-[#c9d8cb] bg-white/75 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-dark">{result.triggered_rules.length} applied</span>
              </div>
              <ol className="mt-4 space-y-2.5">
                {result.triggered_rules.map((rule, index) => <li key={`${rule.name}-${index}`} className="group relative rounded-2xl border border-[#dfe8dc] bg-white/85 px-4 py-4 shadow-[0_4px_12px_rgba(31,74,54,0.035)] transition hover:border-[#b9ceb9] sm:px-5"><span className="absolute inset-y-0 left-0 w-1 bg-brand/45" aria-hidden="true" /><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#dce8d8] bg-[#f4f8f0] font-mono text-xs font-semibold text-brand-dark">{index + 1}</span><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">{ruleTitle(rule.name)}</p><p className="mt-1.5 text-sm leading-6 text-ink-muted">{ruleDescription(rule.name, rule.description)}</p></div></div></li>)}
              </ol>
            </section>

            {result.risk_level !== "RED" && result.pre_medication && <MedicationGuidanceCard riskLevel={result.risk_level} inputText={result.input_text} detectedSymptoms={result.detected_symptoms.map((symptom) => symptom.medical_term)} guidance={{ drugName: result.pre_medication.medication_name, dosage: result.pre_medication.dosage, contraindications: result.pre_medication.contraindications, sideEffects: result.pre_medication.side_effects, precautions: result.pre_medication.precautions, note: result.pre_medication.note }} />}

            <section className="relative mt-6 overflow-hidden rounded-[24px] border border-[#C9DCCB] bg-[linear-gradient(135deg,#F6FAF3_0%,#EAF4E8_100%)] p-5 shadow-[0_14px_32px_rgba(31,74,54,0.08)] sm:p-6">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full border border-brand/10 bg-white/25" aria-hidden="true" />
              <div className="relative flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-[0_8px_16px_rgba(31,74,54,0.18)]"><IconHistory size={20} /></span>
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-dark">Keep your record</p>
                  <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">Save this assessment</h2>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-secondary">Create an account or sign in to keep this result in your health history.</p>
                  <p className="mt-1 text-xs text-ink-muted">I-save ang resulta para makita muli sa iyong health history.</p>
                </div>
              </div>
              <div className="relative mt-5 flex flex-col gap-3 sm:flex-row">
                <Link href="/register?next=/result/guest" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand px-4 font-semibold text-brand-foreground shadow-[0_8px_18px_rgba(31,74,54,0.16)] transition hover:bg-brand-dark">Create account</Link>
                <Link href="/login?next=/result/guest" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-brand/25 bg-white/85 px-4 font-semibold text-brand-dark transition hover:border-brand/50 hover:bg-white">Log in</Link>
              </div>
            </section>
            <div className="mt-6 rounded-2xl border border-[#DDE7DB] bg-[#F7FAF5] p-3 shadow-[0_10px_24px_rgba(31,74,54,0.05)] sm:p-4">
              <p className="px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">Continue</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <PrimaryLink href="/assessment" className="min-h-12 flex-1 rounded-xl bg-gradient-to-r from-brand to-brand-dark font-semibold shadow-[0_10px_20px_rgba(31,74,54,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(31,74,54,0.22)]">New assessment</PrimaryLink>
                <Link href="/" onClick={clearPendingGuestPayload} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-[#CBDACB] bg-white px-4 font-semibold text-ink-secondary transition hover:-translate-y-0.5 hover:border-brand/45 hover:text-brand-dark">Continue without saving</Link>
              </div>
            </div>
            <Disclaimer className="mt-6" />
          </Card>

          <aside className="space-y-6">
            <div className="relative overflow-hidden rounded-[28px] border border-[#F0B5AA] bg-[linear-gradient(135deg,#8E2F24_0%,#6F211C_52%,#4B1715_100%)] p-6 text-[#FFF7F3] shadow-[0_22px_60px_rgba(120,35,28,0.28)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD2C8]">Irosin emergency</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-white">Call if symptoms worsen</h2>
              <div className="mt-5 space-y-3"><div className="rounded-2xl border border-white/25 bg-white/10 p-3.5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFD2C8]">Emergency hotline</p><p className="mt-1 text-2xl font-semibold tracking-wide text-white">911</p></div><div className="rounded-2xl border border-white/25 bg-white/10 p-3.5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFD2C8]">Ambulance / rescue</p><p className="mt-1 text-2xl font-semibold tracking-wide text-white">117</p></div></div>
            </div>
            <div className="rounded-[28px] border border-[#dfe7dc] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf5_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]"><p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">What to do now</p><ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary"><li>Rest, hydrate, and monitor your symptoms closely.</li><li>Follow up with a barangay health worker or clinic if symptoms remain active.</li><li>If breathing is difficult, chest pain is severe, or you feel faint, call emergency services immediately.</li></ul></div>
          </aside>
        </div>
      </PageMain>
    </div>
  );
}