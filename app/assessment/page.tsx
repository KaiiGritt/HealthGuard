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
import { IconBrain, IconDroplets, IconLungs, IconStomach, IconThermometer } from "../components/ui/icons";

// value = the exact term sent to the API / matched against the lexicon.
// en / tl = display labels. icon is a visual aid so recognition doesn't
// depend on reading either language. Keeping `value` in plain English
// preserves the existing backend contract (selected_symptoms still arrives
// as ["fever", "cough", ...]).
const SYMPTOMS = [
  { value: "fever", en: "Fever", tl: "Lagnat", icon: <IconThermometer size={18} /> },
  { value: "cough", en: "Cough", tl: "Ubo", icon: <IconLungs size={18} /> },
  { value: "headache", en: "Headache", tl: "Sakit ng ulo", icon: <IconBrain size={18} /> },
  { value: "abdominal pain", en: "Abdominal pain", tl: "Sakit ng tiyan", icon: <IconStomach size={18} /> },
  { value: "vomiting", en: "Vomiting", tl: "Pagsusuka", icon: <IconDroplets size={18} /> },
  { value: "diarrhea", en: "Diarrhea", tl: "Pagtatae", icon: <IconDroplets size={18} /> },
  { value: "difficulty breathing", en: "Difficulty breathing", tl: "Hirap huminga", icon: <IconLungs size={18} /> },
] as const;

// Symptoms that warrant a plain-language "don't wait" nudge before submit.
// Deliberately NOT styled in the red/yellow/green triage palette — that
// language is reserved for the actual classification result. This is a
// judgment call, not a clinical rule; confirm the symptom list and wording
// with whoever validated the triage rules before shipping it.
const URGENT_NUDGE_SYMPTOMS = new Set(["difficulty breathing"]);

// Tap-to-pick duration options. Replaces a free-text field where users had
// to know to type a value in a parseable format ("2 days"). `days` is the
// representative value sent to the API as duration_days.
const DURATION_OPTIONS = [
  { key: "today", en: "Today", tl: "Ngayon lang", days: 0.5 },
  { key: "few_days", en: "1–2 days", tl: "1–2 araw", days: 1.5 },
  { key: "about_a_week", en: "3–7 days", tl: "3–7 araw", days: 5 },
  { key: "over_a_week", en: "More than a week", tl: "Higit sa isang linggo", days: 10 },
] as const;

export default function AssessmentPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [durationKey, setDurationKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [processingStep, setProcessingStep] = useState(0);

  useEffect(() => {
    let active = true;
    getMe().then((user) => {
      if (!active) return;
      if (user && user.role !== "resident") {
        router.replace(user.role === "admin" ? "/admin" : "/dashboard");
        return;
      }
      setAuthChecking(false);
    }).catch(() => {
      if (active) setAuthChecking(false);
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
    if (/\b(no|without|don't have|do not have|wala akong)\s+(any\s+)?symptoms?\b/.test(normalized)) {
      return false;
    }
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
      "chest tightness",
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

  const hasExplicitNoSymptoms = (value: string) => {
    const normalized = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return /\b(no|without|don't have|do not have|wala akong)\s+(any\s+)?symptoms?\b/.test(normalized);
  };

  const canSubmit = text.trim().length > 0 || selected.length > 0;
  const showUrgentNudge = selected.some((s) => URGENT_NUDGE_SYMPTOMS.has(s));
  const selectedDuration = DURATION_OPTIONS.find((d) => d.key === durationKey) ?? null;

  const getSubmissionValidationError = () => {
    const trimmedText = text.trim();
    if (!trimmedText && selected.length === 0) {
      return "Please tap what you're feeling, or type it in your own words.";
    }
    if (trimmedText && (hasExplicitNoSymptoms(trimmedText) || !matchesSupportedText(trimmedText))) {
      return "We could not recognize a symptom in your message. Please check the spelling and describe a symptom such as fever, cough, headache, or difficulty breathing.";
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
      const combinedText = [
        symptomText ? symptomText : "",
        selectedDuration ? `Symptoms started ${selectedDuration.en.toLowerCase()} ago.` : "",
      ]
        .filter(Boolean)
        .join(" ");

      const payload = {
        input_text: combinedText,
        selected_symptoms: selected,
        method: text.trim() ? "text" : "select",
        duration_days: selectedDuration ? selectedDuration.days : null,
      } as const;
      const result = await analyze(payload);
      if (result.id === 0) {
        window.sessionStorage.setItem("healthguard_pending_guest_assessment", JSON.stringify(payload));
        window.sessionStorage.setItem("healthguard_guest_result", JSON.stringify(result));
        router.push("/result/guest");
      } else {
        router.push(`/result/${result.id}`);
      }
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
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain narrow>
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="relative overflow-hidden rounded-3xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
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
                <PageTitle subtitle="Tap what you're feeling, then tap when it started.">
                  How are you feeling?
                </PageTitle>

                <div className="mt-8 flex gap-3 rounded-2xl border border-[#D9E5D8] bg-brand-tint/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground shadow-sm" aria-hidden="true">i</span>
                  <p className="text-base leading-relaxed text-ink-secondary">
                    Struggling to breathe right now? Don&apos;t wait — go to the nearest clinic or hospital.
                  </p>
                </div>

                {/* STEP 1 — tap-to-select, icon-led. This is the whole task
                    for most users; nothing else on the page needs reading. */}
                <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">1</span>
                  What do you feel?
                </label>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {SYMPTOMS.map((s) => (
                    <SymptomChip
                      key={s.value}
                      label={s.en}
                      icon={s.icon}
                      subLabel={s.tl}
                      selected={selected.includes(s.value)}
                      urgent={s.value === "difficulty breathing"}
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

                {/* STEP 2 — tap-to-pick duration, no typing or format to get
                    right. Optional, so no chip needs to be pre-selected. */}
                <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">2</span>
                  When did it start? <span className="font-normal text-ink-faint">(optional)</span>
                </label>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {DURATION_OPTIONS.map((d) => {
                    const isSelected = durationKey === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setDurationKey(isSelected ? null : d.key)}
                        className={`rounded-2xl border px-3 py-3 text-center text-sm font-medium transition ${
                          isSelected
                            ? "border-brand bg-brand text-brand-foreground shadow-sm"
                            : "border-border-soft bg-white/80 text-ink-secondary hover:border-brand/50"
                        }`}
                      >
                        <span className="block">{d.en}</span>
                        <span className={`block text-xs ${isSelected ? "text-brand-foreground/80" : "text-ink-faint"}`}>{d.tl}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Free-text path kept out of the default view so it doesn't
                    compete with the two-step tap flow above. */}
                <div className="mt-8">
                  {!showTextInput ? (
                    <button
                      type="button"
                      onClick={() => setShowTextInput(true)}
                      className="text-sm font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:text-brand-dark"
                    >
                      Prefer to type it instead?
                    </button>
                  ) : (
                    <>
                      <label htmlFor="symptoms" className="block text-base font-semibold text-ink lg:text-lg">
                        Describe it in your own words
                      </label>
                      <textarea
                        id="symptoms"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        placeholder='e.g. "May lagnat ako at hirap huminga" / "I have fever and cough"'
                        className={`mt-3 min-h-36 resize-y bg-white/80 shadow-[0_6px_18px_rgba(24,38,25,0.035)] ${inputClass}`}
                      />
                    </>
                  )}
                </div>

                {error && (
                  <div className="mt-6">
                    <ErrorAlert>{error}</ErrorAlert>
                  </div>
                )}

                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => router.back()} className="min-h-11 rounded-xl border border-border bg-white px-5 font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark">
                    Back
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting} className={`bg-gradient-to-r from-brand to-brand-dark shadow-[0_14px_28px_rgba(31,74,54,0.2)] sm:min-w-56 ${submitButtonClass}`}>
                    {submitting ? "Checking…" : "Submit Assessment"}
                  </button>
                </div>

                {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}

                <Disclaimer className="mt-6" />
              </>
            )}
          </Card>

          <aside className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-[#F0B5AA] bg-[radial-gradient(circle_at_top_right,_rgba(255,214,205,0.2),_transparent_34%),linear-gradient(135deg,#8E2F24_0%,#6F211C_52%,#4B1715_100%)] p-6 text-[#FFF7F3] shadow-[0_22px_60px_rgba(120,35,28,0.28)]">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
              <p className="relative font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD2C8]">Irosin emergency</p>
              <h2 className="relative mt-3 font-display text-2xl font-semibold leading-tight text-white">Need urgent help?</h2>
              <div className="relative mt-5 space-y-3 text-sm leading-relaxed text-[#FFF1EC]">
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFD2C8]">Emergency</p>
                  <p className="mt-1 text-2xl font-semibold tracking-wide text-white">911</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FFD2C8]">Ambulance / rescue</p>
                  <p className="mt-1 text-2xl font-semibold tracking-wide text-white">117</p>
                </div>
              </div>
              <p className="relative mt-4 text-sm leading-relaxed text-[#FFE4DD]">
                For Irosin residents, these are the available emergency response lines to use for immediate triage and transfer support.
              </p>
            </div>

            <div className="rounded-3xl border border-border-soft bg-card p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Care reminder</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
                <li className="flex gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                  Severe breathing difficulty should be treated as urgent.
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
    </div>
  );
}