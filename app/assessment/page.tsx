"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { analyze, getMe, type User } from "@/lib/api";
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
import { AssessmentTargetProvider } from "./AssessmentTargetContext";
import PersonAssessmentPage from "./child/page";

// value = the exact term sent to the API / matched against the lexicon.
// en / tl = display labels. icon is a visual aid so recognition doesn't
// depend on reading either language. Keeping `value` in plain English
// preserves the existing backend contract (selected_symptoms still arrives
// as ["fever", "cough", ...]).
const SYMPTOMS = [
  { value: "fever", category: "general", en: "Fever", tl: "Lagnat", icon: <IconThermometer size={18} /> },
  { value: "cough", category: "respiratory", en: "Cough", tl: "Ubo", icon: <IconLungs size={18} /> },
  { value: "headache", category: "pain", en: "Headache", tl: "Sakit ng ulo", icon: <IconBrain size={18} /> },
  { value: "abdominal pain", category: "digestive", en: "Abdominal pain", tl: "Pananakit ng tiyan", icon: <IconStomach size={18} /> },
  { value: "vomiting", category: "digestive", en: "Vomiting", tl: "Pagsusuka", icon: <IconDroplets size={18} /> },
  { value: "diarrhea", category: "digestive", en: "Diarrhea", tl: "Pagtatae", icon: <IconDroplets size={18} /> },
  { value: "rash", category: "skin", en: "Rashes", tl: "Pantal", icon: <IconDroplets size={18} /> },
  { value: "colds / rhinitis", category: "respiratory", en: "Cold", tl: "Sipon", icon: <IconLungs size={18} /> },
  { value: "muscle ache / body soreness", category: "pain", en: "Body pain", tl: "Pananakit ng katawan", icon: <IconStomach size={18} /> },
  { value: "difficulty breathing", category: "respiratory", en: "Difficulty breathing", tl: "Hirap huminga", icon: <IconLungs size={18} /> },
] as const;

const SYMPTOM_CATEGORIES = [
  { key: "general", en: "General", tl: "Pangkalahatan" },
  { key: "respiratory", en: "Respiratory", tl: "Paghinga" },
  { key: "digestive", en: "Digestive", tl: "Pantunaw" },
  { key: "pain", en: "Pain", tl: "Pananakit" },
  { key: "skin", en: "Skin", tl: "Balat" },
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

const MIN_PROCESSING_TIME_MS = 7000;
const PROCESSING_STEP_INTERVAL_MS = 2200;

const ABDOMINAL_LOCATION_OPTIONS = [
  { en: "Upper right", tl: "Itaas na kanan" },
  { en: "Upper left", tl: "Itaas na kaliwa" },
  { en: "Upper middle", tl: "Gitnang itaas" },
  { en: "Lower right", tl: "Ibabang kanan" },
  { en: "Lower left", tl: "Ibabang kaliwa" },
  { en: "Lower/general", tl: "Ibaba / pangkalahatan" },
  { en: "Around the navel", tl: "Palibot ng pusod" },
  { en: "Not sure", tl: "Hindi sigurado" },
] as const;

const ABDOMINAL_QUALITY_OPTIONS = [
  { en: "Cramping / wave-like", tl: "Pamumulikat / parang alon" },
  { en: "Burning", tl: "Nagkakaroon ng hapdi" },
  { en: "Dull / achy", tl: "Pahingang masakit" },
  { en: "Sharp / stabbing", tl: "Matulis / tumutusok" },
] as const;

const TYPE_CHIPS: Record<string, { en: string; tl: string }[]> = {
  fever: [
    { en: "Dizziness", tl: "Pagkahilo" },
  ],
  cough: [
    { en: "Acute", tl: "Biglaang ubo" },
    { en: "Chronic", tl: "Pangmatagalang ubo" },
    { en: "Dry cough", tl: "Tuyong ubo" },
    { en: "With phlegm", tl: "May plema" },
  ],
  headache: [
    { en: "Tension-type", tl: "Dahil sa tensyon" },
    { en: "Migraine-type", tl: "Migraine" },
    { en: "Cluster headache", tl: "Kumpol-kumpol na sakit ng ulo" },
    { en: "Sinus headache", tl: "Sakit ng ulo dahil sa sinus" },
    { en: "Thunderclap headache", tl: "Biglaang matinding sakit ng ulo" },
    { en: "Dizziness", tl: "Pagkahilo" },
  ],
  "abdominal pain": [...ABDOMINAL_LOCATION_OPTIONS, ...ABDOMINAL_QUALITY_OPTIONS],
  vomiting: [
    { en: "Nausea", tl: "Pagduduwal" },
    { en: "Retching", tl: "Pag-uurong-suka" },
    { en: "Vomiting", tl: "Pagsusuka" },
    { en: "Dizziness", tl: "Pagkahilo" },
  ],
  diarrhea: [
    { en: "Watery stool", tl: "Tubig ang dumi" },
    { en: "Frequent stool", tl: "Madalas dumumi" },
    { en: "Blood in stool", tl: "Dugo sa dumi" },
  ],
  rash: [
    { en: "Skin rash", tl: "Pantal sa balat" },
    { en: "Redness of skin", tl: "Pula ng balat" },
    { en: "Itchiness", tl: "Kati" },
  ],
  "colds / rhinitis": [
    { en: "Runny nose", tl: "Tulo ng ilong" },
    { en: "Sneezing", tl: "Pagbahing / pag-ubo ng ilong" },
  ],
  "difficulty breathing": [
    { en: "Shortness of breath", tl: "Kapos sa paghinga" },
    { en: "Wheezing", tl: "May huni ang paghinga" },
    { en: "Chest tightness", tl: "Paninikip ng dibdib" },
    { en: "Chest pain", tl: "Sakit sa dibdib" },
    { en: "Cannot breathe deeply", tl: "Hindi makahinga nang malalim" },
  ],
};

export default function AssessmentPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string[]>>({});
  const [durationKey, setDurationKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [processingStep, setProcessingStep] = useState(0);

  useEffect(() => {
    let active = true;
    getMe().then((user) => {
      if (!active) return;
      setCurrentUser(user);
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
    const timer = window.setInterval(() => setProcessingStep((step) => Math.min(step + 1, 2)), PROCESSING_STEP_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [submitting]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const toggle = (value: string) => {
    setSelected((prev) => {
      const isSelected = prev.includes(value);
      return isSelected ? prev.filter((x) => x !== value) : [...prev, value];
    });
    if (selected.includes(value)) {
      setSelectedTypes((prev) => {
        const next = { ...prev };
        delete next[value];
        return next;
      });
    }
  };

  const toggleType = (symptom: string, type: string) => {
    setSelectedTypes((prev) => {
      const current = prev[symptom] ?? [];
      const nextTypes = current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type];
      return { ...prev, [symptom]: nextTypes };
    });
  };

  const hasExplicitNoSymptoms = (value: string) => {
    const normalized = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return /\b(no|without|don't have|do not have|wala akong)\s+(any\s+)?symptoms?\b/.test(normalized);
  };

  const canSubmit = text.trim().length > 0 || selected.length > 0;
  const showUrgentNudge = selected.some((s) => URGENT_NUDGE_SYMPTOMS.has(s));
  const selectedSymptomsWithTypes = selected.filter((symptom) => (TYPE_CHIPS[symptom] ?? []).length > 0);
  const selectedDuration = DURATION_OPTIONS.find((d) => d.key === durationKey) ?? null;

  const getSubmissionValidationError = () => {
    const trimmedText = text.trim();
    if (!trimmedText && selected.length === 0) {
      return "Please tap what you're feeling, or type it in your own words.";
    }
    if (trimmedText && hasExplicitNoSymptoms(trimmedText)) {
      return "We could not recognize a symptom in your message. Please check the spelling and describe a symptom such as fever, cough, headache, or difficulty breathing.";
    }
    return null;
  };

  if (authChecking) return null;
  if (!currentUser) {
    return (
      <div className="premium-page min-h-screen">
        <PageHeader />
        <PageMain narrow>
          <AssessmentTargetProvider mode="self">
            <PersonAssessmentPage />
          </AssessmentTargetProvider>
        </PageMain>
      </div>
    );
  }

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
    const processingStartedAt = Date.now();
    try {
      const symptomText = text.trim();
      const combinedText = [
        symptomText ? symptomText : "",
        Object.values(selectedTypes).flat().length > 0
          ? `Selected symptom types: ${Object.values(selectedTypes).flat().join(", ")}.`
          : "",
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
      const remainingDisplayTime = Math.max(0, MIN_PROCESSING_TIME_MS - (Date.now() - processingStartedAt));
      if (remainingDisplayTime > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remainingDisplayTime));
      }
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
      {!submitting && <PageHeader />}
      <PageMain narrow className={submitting ? "min-h-screen pt-8 sm:pt-12 lg:flex lg:items-center" : undefined}>
        <div className="assessment-route-enter grid items-start gap-6">
          <Card className={`relative overflow-hidden rounded-3xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.09)] ${submitting ? "mx-auto w-full max-w-4xl" : ""}`}>
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
            {submitting ? (
              <div className="py-8 sm:py-12" aria-live="polite">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand">HealthGuard check</p>
                    <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">Reviewing your symptoms</h1>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-brand" aria-hidden="true">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
                  </span>
                </div>
                <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
                  We are comparing the reported symptoms with the HealthGuard guidance rules. Please wait while we prepare the result.
                </p>
                <div className="mt-7 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  <span>Assessment in progress</span>
                  <span>Step {Math.min(processingStep + 1, 3)} of 3</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E5EEE2]">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-dark via-brand to-[#C7B37A] transition-all duration-700" style={{ width: `${((processingStep + 1) / 3) * 100}%` }} />
                </div>
                <ol className="mt-8 overflow-hidden rounded-2xl border border-[#DDE7DB] bg-white/70">
                  {["Reading your symptoms", "Checking health guidance", "Preparing your next step"].map((step, index) => {
                    const completed = index < processingStep;
                    const active = index === processingStep;
                    return (
                      <li key={step} className={`flex items-center gap-4 border-b border-[#E8EEE5] px-4 py-4 last:border-b-0 sm:px-5 ${active ? "bg-brand-tint/65" : ""}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-semibold ${completed ? "bg-brand text-brand-foreground" : active ? "border border-brand/35 bg-white text-brand" : "border border-border-soft bg-white text-ink-faint"}`}>
                          {completed ? "✓" : index + 1}
                        </span>
                        <span className={`flex-1 text-sm sm:text-base ${active ? "font-semibold text-ink" : completed ? "text-ink-secondary" : "text-ink-faint"}`}>{step}</span>
                        <span className={`text-xs font-semibold ${active ? "text-brand" : completed ? "text-brand-dark" : "text-ink-faint"}`}>{completed ? "Done" : active ? "Now" : "Waiting"}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <>
                <PageTitle subtitle="Tap what you're feeling, then tap when it started.">
                  How are you feeling?
                </PageTitle>
                {currentUser && (
                  <div className="mt-5 flex justify-end">
                    <div className="inline-flex max-w-full rounded-xl border border-[#D8E2D3] bg-white/80 p-1 shadow-[0_4px_14px_rgba(24,38,25,0.06)]" role="group" aria-label="Assessment type">
                      <span aria-current="page" className="inline-flex min-h-10 items-center rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 text-center text-xs font-semibold text-brand-foreground shadow-[0_3px_8px_rgba(31,74,54,0.2)] sm:px-4 sm:text-sm">For myself / Sarili</span>
                      <Link href="/assessment/child" className="group inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-center text-xs font-semibold text-ink-secondary transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-tint hover:text-brand-dark hover:shadow-[0_6px_14px_rgba(47,107,79,0.12)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:px-4 sm:text-sm">Assess someone / Ibang tao</Link>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex gap-3 rounded-2xl border border-[#D9E5D8] bg-brand-tint/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground shadow-sm" aria-hidden="true">i</span>
                  <p className="min-w-0 flex-1 text-base leading-relaxed text-ink-secondary">
                    Struggling to breathe right now? Don&apos;t wait — go to the nearest clinic or hospital.
                  </p>
                </div>

                {/* STEP 1 — tap-to-select, icon-led. This is the whole task
                    for most users; nothing else on the page needs reading. */}
                <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">1</span>
                  What do you feel?
                </label>
                <div className="mt-4 space-y-5">
                  {SYMPTOM_CATEGORIES.map((category) => {
                    const categorySymptoms = SYMPTOMS.filter((symptom) => symptom.category === category.key);
                    return (
                      <section key={category.key} aria-labelledby={`symptom-category-${category.key}`}>
                        <h3 id={`symptom-category-${category.key}`} className="text-sm font-semibold text-ink-secondary">
                          {category.en} <span className="font-normal text-ink-faint">/ {category.tl}</span>
                        </h3>
                        <div className="mt-2.5 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-4 sm:grid-cols-3">
                          {categorySymptoms.map((s) => (
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
                      </section>
                    );
                  })}
                </div>

                {selectedSymptomsWithTypes.length > 0 && (
                  <section className="relative mt-8 overflow-hidden rounded-[20px] border border-[#D7E2D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F6F9F4_100%)] p-4 shadow-[0_16px_34px_rgba(31,74,54,0.07)] sm:p-6" aria-labelledby="type-chip-heading">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#4D8061] to-[#C7B37A]" aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1F4A36] font-mono text-xs font-semibold text-white shadow-[0_6px_14px_rgba(31,74,54,0.2)]">02</span>
                      <div>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Optional classification</p>
                        <h2 id="type-chip-heading" className="mt-0.5 text-base font-semibold text-ink lg:text-lg">Choose the classification</h2>
                      </div>
                      <span className="ml-12 w-fit rounded-full border border-[#D9E3D6] bg-white/80 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-muted sm:ml-auto">Piliin kung alam</span>
                    </div>
                    <div className="mt-5 space-y-5 border-t border-[#DCE7DA] pt-4">
                      {selectedSymptomsWithTypes.map((symptom) => {
                        const symptomInfo = SYMPTOMS.find((item) => item.value === symptom);
                        const typeOptions = TYPE_CHIPS[symptom] ?? [];
                        if (typeOptions.length === 0) return null;

                        if (symptom === "abdominal pain") {
                          return (
                            <div key={symptom} className="border-t border-[#E4EBE1] pt-4 first:border-t-0 first:pt-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{symptomInfo?.en} <span className="font-normal normal-case tracking-normal text-ink-faint">/ {symptomInfo?.tl}</span></p>

                              <div className="mt-3">
                                <p className="text-sm font-semibold text-ink">Where exactly? <span className="font-normal text-ink-faint">/ Saan eksakto?</span></p>
                                <div className="mt-2.5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
                                  {ABDOMINAL_LOCATION_OPTIONS.map((type) => {
                                    const isSelected = selectedTypes[symptom]?.includes(type.en) ?? false;
                                    return (
                                      <button
                                        key={type.en}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => toggleType(symptom, type.en)}
                                        className={`group flex min-h-[76px] w-full flex-col justify-center rounded-xl border px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 ${isSelected ? "border-[#1F4A36] bg-[linear-gradient(145deg,#2F6B4F_0%,#1F4A36_100%)] text-white shadow-[0_8px_18px_rgba(31,74,54,0.2)]" : "border-[#DCE5D8] bg-white/90 text-ink-secondary shadow-[0_3px_10px_rgba(24,38,25,0.035)] hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_16px_rgba(31,74,54,0.09)]"}`}
                                      >
                                        <span className="flex w-full items-center justify-between gap-2 font-semibold">
                                          <span>{type.en}</span>
                                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] leading-none transition ${isSelected ? "border-white/55 bg-white/15 text-white" : "border-[#CBD8CA] text-transparent group-hover:border-brand/50"}`} aria-hidden="true">✓</span>
                                        </span>
                                        <span className={`mt-1 block text-xs ${isSelected ? "text-white/75" : "text-ink-faint"}`}>{type.tl}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="mt-5">
                                <p className="text-sm font-semibold text-ink">What does it feel like? <span className="font-normal text-ink-faint">/ Ano ang klase ng sakit?</span></p>
                                <div className="mt-2.5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
                                  {ABDOMINAL_QUALITY_OPTIONS.map((type) => {
                                    const isSelected = selectedTypes[symptom]?.includes(type.en) ?? false;
                                    return (
                                      <button
                                        key={type.en}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => toggleType(symptom, type.en)}
                                        className={`group flex min-h-[76px] w-full flex-col justify-center rounded-xl border px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 ${isSelected ? "border-[#1F4A36] bg-[linear-gradient(145deg,#2F6B4F_0%,#1F4A36_100%)] text-white shadow-[0_8px_18px_rgba(31,74,54,0.2)]" : "border-[#DCE5D8] bg-white/90 text-ink-secondary shadow-[0_3px_10px_rgba(24,38,25,0.035)] hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_16px_rgba(31,74,54,0.09)]"}`}
                                      >
                                        <span className="flex w-full items-center justify-between gap-2 font-semibold">
                                          <span>{type.en}</span>
                                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] leading-none transition ${isSelected ? "border-white/55 bg-white/15 text-white" : "border-[#CBD8CA] text-transparent group-hover:border-brand/50"}`} aria-hidden="true">✓</span>
                                        </span>
                                        <span className={`mt-1 block text-xs ${isSelected ? "text-white/75" : "text-ink-faint"}`}>{type.tl}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={symptom} className="border-t border-[#E4EBE1] pt-4 first:border-t-0 first:pt-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{symptomInfo?.en} <span className="font-normal normal-case tracking-normal text-ink-faint">/ {symptomInfo?.tl}</span></p>
                            <div className="mt-2.5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-2.5 lg:grid-cols-4">
                              {typeOptions.map((type) => {
                                const isSelected = selectedTypes[symptom]?.includes(type.en) ?? false;
                                return (
                                  <button
                                    key={type.en}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => toggleType(symptom, type.en)}
                                    className={`group flex min-h-[76px] w-full flex-col justify-center rounded-xl border px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 ${isSelected ? "border-[#1F4A36] bg-[linear-gradient(145deg,#2F6B4F_0%,#1F4A36_100%)] text-white shadow-[0_8px_18px_rgba(31,74,54,0.2)]" : "border-[#DCE5D8] bg-white/90 text-ink-secondary shadow-[0_3px_10px_rgba(24,38,25,0.035)] hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_16px_rgba(31,74,54,0.09)]"}`}
                                  >
                                    <span className="flex w-full items-center justify-between gap-2 font-semibold">
                                      <span>{type.en}</span>
                                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] leading-none transition ${isSelected ? "border-white/55 bg-white/15 text-white" : "border-[#CBD8CA] text-transparent group-hover:border-brand/50"}`} aria-hidden="true">✓</span>
                                    </span>
                                    <span className={`mt-1 block text-xs ${isSelected ? "text-white/75" : "text-ink-faint"}`}>{type.tl}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {showUrgentNudge && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 lg:text-base">
                    <span className="font-semibold">If you&apos;re struggling to breathe right now, </span>
                    don&apos;t wait for this result — go to the nearest hospital or call for help.
                  </div>
                )}

                {/* STEP 2 — tap-to-pick duration, no typing or format to get
                    right. Optional, so no chip needs to be pre-selected. */}
                <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">3</span>
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
                        className={`flex min-h-[68px] flex-col justify-center rounded-2xl border px-2 py-3 text-center text-sm font-medium transition sm:px-3 ${
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
                  <button type="button" onClick={() => router.back()} className="min-h-11 w-full rounded-xl border border-border bg-white px-5 font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark sm:w-auto">
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

          <aside className={submitting ? "hidden" : "grid gap-6 lg:grid-cols-2"}>
            <div className="relative grid min-w-0 grid-cols-1 items-center gap-4 overflow-hidden rounded-3xl border border-[#D9E5D8] bg-[linear-gradient(145deg,#1F4A36_0%,#2F6B4F_100%)] p-4 text-[#F4F8F0] shadow-[0_22px_60px_rgba(31,74,54,0.22)] sm:p-6 min-[640px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] min-[640px]:gap-x-5 min-[640px]:gap-y-0">
              <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
              <div className="relative min-w-0">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFE3D6]">Personal health reminder</p>
                <h2 className="mt-2 font-display text-xl font-semibold leading-tight text-white sm:mt-3 sm:text-2xl">Describe, don’t diagnose.</h2>
                <p className="mt-3 text-sm leading-relaxed text-[#E4F0E5] min-[640px]:mt-4">
                  Focus on what you are feeling and when it started. Choose “not sure” if a symptom type is unclear; symptom details are optional.
                </p>
              </div>
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