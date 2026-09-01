"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { analyze, getMe } from "@/lib/api";
import {
  Card,
  ErrorAlert,
  inputClass,
  PageMain,
  PageTitle,
  submitButtonClass,
  Toast,
} from "@/app/components/ui/primitives";
import Disclaimer from "../components/Disclaimer";
import PageHeader from "../components/PageHeader";
import SymptomChip from "../components/SymptomChip";

// value = the exact term sent to the API / matched against the lexicon.
// en / tl = display labels. Keeping `value` in plain English preserves the
// existing backend contract (selected_symptoms still arrives as
// ["fever", "cough", ...]) even though the chip now reads in both languages.
const SYMPTOMS = [
  { value: "fever", en: "Fever", tl: "Lagnat" },
  { value: "cough", en: "Cough", tl: "Ubo" },
  { value: "headache", en: "Headache", tl: "Sakit ng ulo" },
  { value: "abdominal pain", en: "Abdominal pain", tl: "Sakit ng tiyan" },
  { value: "vomiting", en: "Vomiting", tl: "Pagsusuka" },
  { value: "diarrhea", en: "Diarrhea", tl: "Pagtatae" },
  { value: "difficulty breathing", en: "Difficulty breathing", tl: "Hirap huminga" },
] as const;

// Symptoms that warrant a plain-language "don't wait" nudge before submit.
// Deliberately NOT styled in the red/yellow/green triage palette — that
// language is reserved for the actual classification result. This is a
// judgment call, not a clinical rule; confirm the symptom list and wording
// with whoever validated the triage rules before shipping it.
const URGENT_NUDGE_SYMPTOMS = new Set(["difficulty breathing"]);

export default function AssessmentPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [processingStep, setProcessingStep] = useState(0);

  useEffect(() => {
    let active = true;
    getMe().then((user) => {
      if (!active) return;
      if (!user) {
        router.replace("/login?next=/assessment");
        return;
      }
      if (user.role !== "resident") {
        router.replace(user.role === "admin" ? "/admin" : "/dashboard");
        return;
      }
      setAuthChecking(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!submitting) return;
    const timer = window.setInterval(() => setProcessingStep((step) => Math.min(step + 1, 2)), 1800);
    return () => window.clearInterval(timer);
  }, [submitting]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggle = (value: string) =>
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );

  const matchesSupportedText = (value: string) => {
    const normalized = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const tokens = [
      "fever",
      "lagnat",
      "cough",
      "ubo",
      "headache",
      "sakit ng ulo",
      "abdominal pain",
      "sakit ng tiyan",
      "vomiting",
      "pagsusuka",
      "diarrhea",
      "pagtatae",
      "difficulty breathing",
      "hirap huminga",
      "shortness of breath",
      "breathless",
      "chest pain",
      "pain in chest",
      "weakness",
      "kahinaan",
      "rash",
      "buni",
      "sore throat",
      "sakit ng lalamunan",
      "nasal congestion",
      "stuffy nose",
      "runny nose",
    ];
    return tokens.some((token) => normalized.includes(token));
  };

  const canSubmit = text.trim().length > 0 || selected.length > 0;
  const showUrgentNudge = selected.some((s) => URGENT_NUDGE_SYMPTOMS.has(s));

  const getSubmissionValidationError = () => {
    const trimmedText = text.trim();
    if (!trimmedText && selected.length === 0) {
      return "Please describe a supported symptom or tap one of the available symptoms.";
    }
    if (trimmedText && !matchesSupportedText(trimmedText) && selected.length > 0) {
      return "Your free-text description was not recognized as a supported symptom. Remove the unsupported text or choose a supported symptom only.";
    }
    if (trimmedText && !matchesSupportedText(trimmedText) && selected.length === 0) {
      return "No recognized symptom was detected. Please select a supported symptom or describe one of the supported symptoms.";
    }
    return null;
  };

  if (authChecking) return null;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;

    const validationError = getSubmissionValidationError();
    if (validationError) {
      setToast({ message: validationError, tone: "error" });
      setError(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const symptomText = text.trim();
      const durationText = duration.trim();
      const combinedText = [
        symptomText ? symptomText : "",
        durationText ? `Symptoms started ${durationText}.` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const result = await analyze({
        input_text: combinedText,
        selected_symptoms: selected,
        method: text.trim() ? "text" : "select",
      });
      router.push(`/result/${result.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      const friendlyMessage = message.includes("No recognized symptom was detected")
        ? "No recognized symptom was detected. Please select a supported symptom or describe one of the supported symptoms."
        : message;
      setToast({ message: friendlyMessage, tone: "error" });
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader />
      <PageMain narrow>
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-card via-card/90 to-surface shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            {submitting ? (
              <div className="py-8 sm:py-12" aria-live="polite">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-brand">HealthGuard check</p>
                <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Reading your symptoms</h1>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
                  We are checking your words against the health guide. This usually takes a few seconds.
                </p>
                <ol className="mt-10 space-y-4">
                  {["Reading your symptoms...", "Checking against health guidelines...", "Preparing your next step..."].map((step, index) => (
                    <li key={step} className="flex items-center gap-4 text-base text-ink-secondary lg:text-lg">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm ${index <= processingStep ? "bg-brand text-brand-foreground" : "border border-border text-ink-faint"}`}>
                        {index < processingStep ? "✓" : index + 1}
                      </span>
                      <span className={index === processingStep ? "font-semibold text-ink" : ""}>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-10 h-1.5 overflow-hidden rounded-full bg-brand-tint">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
                </div>
              </div>
            ) : (
              <>
                <PageTitle subtitle="Describe your symptoms in English or Tagalog, or tap the ones that apply.">
                  How are you feeling?
                </PageTitle>

                <div className="mt-8 rounded-2xl border border-brand/10 bg-gradient-to-r from-brand/5 via-transparent to-transparent p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Assessment note</p>
                  <p className="mt-2 text-base leading-relaxed text-ink-secondary">
                    For urgent breathing problems, do not wait for the result. Go to the nearest clinic or hospital immediately.
                  </p>
                </div>

                <label htmlFor="symptoms" className="mt-10 block text-base font-semibold text-ink lg:text-lg">
                  Describe your symptoms
                </label>
                <textarea
                  id="symptoms"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder='e.g. "May lagnat ako at hirap huminga" / "I have fever and cough"'
                  className={`mt-3 min-h-36 ${inputClass}`}
                />

                <div className="mt-8">
                  <label htmlFor="duration" className="block text-base font-semibold text-ink lg:text-lg">
                    How long have you been feeling this? <span className="font-normal text-ink-faint">(optional)</span>
                  </label>
                  <input
                    id="duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 2 days, 1 week, 3 hours"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                <p className="mt-10 text-base font-semibold text-ink lg:text-lg">Or tap your symptoms</p>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {SYMPTOMS.map((s) => (
                    <SymptomChip
                      key={s.value}
                      label={s.en}
                      subLabel={s.tl}
                      selected={selected.includes(s.value)}
                      onToggle={() => toggle(s.value)}
                    />
                  ))}
                </div>

                {showUrgentNudge && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 lg:text-base">
                    <span className="font-semibold">If you&apos;re struggling to breathe right now, </span>
                    don&apos;t wait for this result — go to the nearest hospital or call for help.
                  </div>
                )}

                {error && (
                  <div className="mt-6">
                    <ErrorAlert>{error}</ErrorAlert>
                  </div>
                )}

                <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting} className={`mt-10 ${submitButtonClass}`}>
                  {submitting ? "Checking…" : "Check my symptoms"}
                </button>

                {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

                <Disclaimer className="mt-6" />
              </>
            )}
          </Card>

          <aside className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-border-soft bg-gradient-to-br from-brand via-brand-dark to-brand-darker p-6 text-brand-foreground shadow-[0_22px_60px_rgba(26,93,82,0.25)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand-muted">Irosin emergency</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight">Need urgent help?</h2>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-brand-foreground/90">
                <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-muted">Emergency</p>
                  <p className="mt-1 text-xl font-semibold">911</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-muted">Ambulance / rescue</p>
                  <p className="mt-1 text-xl font-semibold">117</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-brand-foreground/80">
                For Irosin residents, these are the available emergency response lines to use for immediate triage and transfer support.
              </p>
            </div>

            <div className="rounded-3xl border border-border-soft bg-card p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Care reminder</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                  Severe breathing difficulty or chest pain should be treated as urgent.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-yellow-500" />
                  If symptoms are worsening, contact a barangay health worker or RHU immediately.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  Red-flag signs should not wait for a follow-up appointment.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </PageMain>
    </>
  );
}