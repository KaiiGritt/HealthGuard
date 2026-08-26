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

  const toggle = (value: string) =>
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );

  const canSubmit = text.trim().length > 0 || selected.length > 0;
  const showUrgentNudge = selected.some((s) => URGENT_NUDGE_SYMPTOMS.has(s));

  if (authChecking) return null;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
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
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader />
      <PageMain narrow>
        <Card>
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
          <PageTitle
            subtitle="Describe your symptoms in English or Tagalog, or tap the ones that apply."
          >
            How are you feeling?
          </PageTitle>

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
            <div className="mt-6 rounded-lg border border-ink/20 bg-paper px-4 py-3 text-sm text-ink lg:text-base">
              <span className="font-semibold">If you&apos;re struggling to breathe right now, </span>
              don&apos;t wait for this result — go to the nearest hospital or call for help.
            </div>
          )}

          {error && <div className="mt-6"><ErrorAlert>{error}</ErrorAlert></div>}

          <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting} className={`mt-10 ${submitButtonClass}`}>
            {submitting ? "Checking…" : "Check my symptoms"}
          </button>

          <Disclaimer className="mt-6" />
            </>
          )}
        </Card>
      </PageMain>
    </>
  );
}