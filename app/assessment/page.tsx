"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { analyze, getMe, type User } from "@/lib/api";
import {
  ABDOMINAL_PAIN_CLASSIFICATIONS,
  BODY_PAIN_CLASSIFICATIONS,
  COLD_SYMPTOM_CLASSIFICATIONS,
  COUGH_CLASSIFICATIONS,
  DIARRHEA_CLASSIFICATIONS,
  FEVER_CLASSIFICATIONS,
  HEADACHE_CLASSIFICATIONS,
  RASH_CLASSIFICATIONS,
  VOMITING_CLASSIFICATIONS,
} from "@/lib/coughClassifications";
import {
  Card,
  ErrorAlert,
  inputClass,
  PageMain,
  PageTitle,
  submitButtonClass,
  textareaClass,
  Toast,
} from "@/app/components/ui/primitives";
import Disclaimer from "../components/Disclaimer";
import PageHeader from "../components/PageHeader";
import SymptomChip from "../components/SymptomChip";
import AbdominalPainDiagram from "./AbdominalPainDiagram";
import AbdominalLocationChoices from "./AbdominalLocationChoices";
import {
  ABDOMINAL_LOCATION_OPTIONS,
  ABDOMINAL_NOT_SURE_OPTION,
} from "./abdominalLocations";
import { IconChevronDown } from "../components/ui/icons";
import { localizedText, useInterfaceLanguage } from "../components/LanguageProvider";
import { AssessmentTargetProvider } from "./AssessmentTargetContext";
import FreeTextSymptomToggle from "./FreeTextSymptomToggle";
import PainScale, { PAIN_SCALE_SYMPTOMS } from "./PainScale";
import PersonAssessmentPage from "./child/page";
import { SYMPTOM_CATEGORIES, SYMPTOMS } from "./symptoms";

// Symptoms that warrant a plain-language "don't wait" nudge before submit.
// Deliberately NOT styled in the red/yellow/green triage palette — that
// language is reserved for the actual classification result. This is a
// judgment call, not a clinical rule; confirm the symptom list and wording
// with whoever validated the triage rules before shipping it.
const URGENT_NUDGE_SYMPTOMS = new Set(["difficulty breathing"]);

// `days` is the representative value sent to the API as duration_days.
const DURATION_OPTIONS = [
  { key: "less_than_24_hours", en: "Less than 24 hours ago", tl: "Wala pang 24 oras", phrase: "less than 24 hours ago", days: 0.5 },
  { key: "one_two_days", en: "1–2 days ago", tl: "1–2 araw na ang nakalipas", phrase: "1–2 days ago", days: 1.5 },
  { key: "three_seven_days", en: "3–7 days ago", tl: "3–7 araw na ang nakalipas", phrase: "3–7 days ago", days: 5 },
  { key: "more_than_seven_days", en: "More than 7 days ago", tl: "Mahigit 7 araw na ang nakalipas", phrase: "more than 7 days ago", days: 8 },
  { key: "not_sure", en: "Not sure", tl: "Hindi sigurado", phrase: null, days: null },
] as const;

const MAX_EXACT_DURATION_DAYS = 365;
const MIN_PROCESSING_TIME_MS = 7000;
const PROCESSING_STEP_INTERVAL_MS = 2200;

const ABDOMINAL_QUALITY_OPTIONS = [
  ...ABDOMINAL_PAIN_CLASSIFICATIONS,
];

const TYPE_CHIPS: Record<string, { en: string; tl: string; description?: string }[]> = {
  fever: [
    ...FEVER_CLASSIFICATIONS,
    { en: "Dizziness", tl: "Pagkahilo" },
  ],
  cough: COUGH_CLASSIFICATIONS,
  headache: [
    ...HEADACHE_CLASSIFICATIONS,
    { en: "Thunderclap headache", tl: "Biglaang matinding sakit ng ulo" },
    { en: "Dizziness", tl: "Pagkahilo" },
  ],
  "muscle ache / body soreness": BODY_PAIN_CLASSIFICATIONS,
  "abdominal pain": [...ABDOMINAL_LOCATION_OPTIONS, ABDOMINAL_NOT_SURE_OPTION, ...ABDOMINAL_QUALITY_OPTIONS],
  vomiting: [
    ...VOMITING_CLASSIFICATIONS,
    { en: "Nausea", tl: "Pagduduwal" },
    { en: "Retching", tl: "Pag-uurong-suka" },
    { en: "Vomiting", tl: "Pagsusuka" },
    { en: "Dizziness", tl: "Pagkahilo" },
  ],
  diarrhea: [
    ...DIARRHEA_CLASSIFICATIONS,
    { en: "Frequent stool", tl: "Madalas dumumi" },
  ],
  rash: RASH_CLASSIFICATIONS,
  "colds / rhinitis": [
    ...COLD_SYMPTOM_CLASSIFICATIONS,
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
  const { language } = useInterfaceLanguage();
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string[]>>({});
  const [painLevels, setPainLevels] = useState<Record<string, number>>({});
  const [durationKey, setDurationKey] = useState<string | null>(null);
  const [exactDurationMode, setExactDurationMode] = useState(false);
  const [exactDurationDays, setExactDurationDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const guestAssessmentStarted = useRef(false);

  useEffect(() => {
    let active = true;
    getMe().then((user) => {
      if (!active) return;
      setCurrentUser(user);
      if (user && user.role !== "resident") {
        router.replace(user.role === "admin" ? "/admin" : "/dashboard");
        return;
      }
      if (user && !guestAssessmentStarted.current) {
        setCurrentUser(user);
      }
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
      setPainLevels((prev) => {
        const next = { ...prev };
        delete next[value];
        if (value === "difficulty breathing") delete next["chest pain"];
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
    if (symptom === "difficulty breathing" && type === "Chest pain" && selectedTypes[symptom]?.includes(type)) {
      setPainLevels((prev) => {
        const next = { ...prev };
        delete next["chest pain"];
        return next;
      });
    }
  };

  const hasExplicitNoSymptoms = (value: string) => {
    const normalized = value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return /\b(no|without|don't have|do not have|wala akong)\s+(any\s+)?symptoms?\b/.test(normalized);
  };

  const canSubmit = text.trim().length > 0 || selected.length > 0;
  const showUrgentNudge = selected.some((s) => URGENT_NUDGE_SYMPTOMS.has(s));
  const selectedSymptomsWithTypes = selected.filter((symptom) => (TYPE_CHIPS[symptom] ?? []).length > 0);
  const painScaleItems = selected
    .filter((symptom) => PAIN_SCALE_SYMPTOMS.some((painSymptom) => painSymptom === symptom))
    .map((symptom) => {
      const info = SYMPTOMS.find((item) => item.value === symptom);
      return { key: symptom, label: info ? localizedText(language, info.en, info.tl) : symptom };
    });
  if (selectedTypes["difficulty breathing"]?.includes("Chest pain")) {
    painScaleItems.push({ key: "chest pain", label: localizedText(language, "Chest pain", "Sakit sa dibdib") });
  }
  const selectedDuration = DURATION_OPTIONS.find((d) => d.key === durationKey) ?? null;
  const exactDaysValue = Number(exactDurationDays);
  const exactDurationValid =
    exactDurationMode &&
    /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(exactDurationDays) &&
    Number.isFinite(exactDaysValue) &&
    exactDaysValue >= 0.01 &&
    exactDaysValue <= MAX_EXACT_DURATION_DAYS;

  const getSubmissionValidationError = () => {
    const trimmedText = text.trim();
    if (!trimmedText && selected.length === 0) {
      return "Please tap what you're feeling, or type it in your own words.";
    }
    if (trimmedText && hasExplicitNoSymptoms(trimmedText)) {
      return "We could not recognize a symptom in your message. Please check the spelling and describe a symptom such as fever, cough, headache, or difficulty breathing.";
    }
    if (exactDurationMode && !exactDurationValid) {
      if (exactDaysValue > MAX_EXACT_DURATION_DAYS) {
        return "Enter a duration of 365 days or less.";
      }
      return "Enter the number of days since symptoms started, or go back to choose a time range.";
    }
    return null;
  };

  if (!currentUser) {
    return (
      <div className="premium-page min-h-screen">
        <PageHeader />
        <PageMain narrow>
          <div
            onFocusCapture={() => { guestAssessmentStarted.current = true; }}
            onClickCapture={() => { guestAssessmentStarted.current = true; }}
          >
            <AssessmentTargetProvider mode="self">
              <PersonAssessmentPage />
            </AssessmentTargetProvider>
          </div>
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
        painScaleItems.some((item) => painLevels[item.key] !== undefined)
          ? `Pain levels: ${painScaleItems.filter((item) => painLevels[item.key] !== undefined).map((item) => `${item.key} ${painLevels[item.key]}/10`).join(", ")}.`
          : "",
        selectedTypes.cough?.length
          ? `Cough type: ${selectedTypes.cough.join(", ")}.`
          : "",
        exactDurationMode
          ? `Symptoms started ${exactDaysValue} ${exactDaysValue === 1 ? "day" : "days"} ago.`
          : selectedDuration?.phrase
            ? `Symptoms started ${selectedDuration.phrase}.`
            : selectedDuration ? "The symptom start time is unknown." : "",
      ]
        .filter(Boolean)
        .join(" ");

      const payload = {
        input_text: combinedText,
        selected_symptoms: selected,
        method: text.trim() ? "text" : "select",
        duration_days: exactDurationMode ? exactDaysValue : selectedDuration?.days ?? null,
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
          <Card className={`relative overflow-hidden rounded-3xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] shadow-[0_26px_72px_rgba(24,38,25,0.11)] ring-1 ring-white/70 ${submitting ? "mx-auto w-full max-w-4xl" : ""}`}>
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
                <PageTitle subtitle={localizedText(language, "Tap what you're feeling, then tap when it started.", "Piliin ang nararamdaman mo at kung kailan ito nagsimula.")}>
                  {localizedText(language, "How are you feeling?", "Ano ang nararamdaman mo?")}
                </PageTitle>
                {currentUser && (
                  <div className="mt-5 flex justify-end">
                    <div
                      className="inline-flex max-w-full items-center gap-1 rounded-2xl border border-[#D8E2D3] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(245,249,243,0.9)_100%)] p-1 shadow-[0_10px_22px_rgba(24,38,25,0.07),inset_0_1px_0_rgba(255,255,255,0.86)] ring-1 ring-white/75"
                      role="group"
                      aria-label="Assessment type"
                    >
                      <span
                        aria-current="page"
                        className="inline-flex min-h-10 items-center rounded-xl bg-[linear-gradient(135deg,#2F6B4F_0%,#1F4A36_100%)] px-3 text-center text-xs font-semibold text-brand-foreground shadow-[0_6px_14px_rgba(31,74,54,0.18)] ring-1 ring-white/10 sm:px-4 sm:text-sm"
                      >
                        {localizedText(language, "For myself", "Sarili")}
                      </span>
                      <Link
                        href="/assessment/child"
                        className="group inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-center text-xs font-semibold text-ink-secondary transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#F2F8F0_0%,#EBF3EA_100%)] hover:text-brand-dark hover:shadow-[0_8px_18px_rgba(47,107,79,0.1)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:px-4 sm:text-sm"
                      >
                        {localizedText(language, "Assess someone", "Magsuri ng ibang tao")}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex gap-3 rounded-2xl border border-[#D9E5D8] bg-brand-tint/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground shadow-sm" aria-hidden="true">i</span>
                  <p className="min-w-0 flex-1 text-base leading-relaxed text-ink-secondary">
                    {localizedText(language, "Struggling to breathe right now? Don’t wait — go to the nearest clinic or hospital.", "Hirap ka bang huminga ngayon? Huwag maghintay — pumunta agad sa pinakamalapit na klinika o ospital.")}
                  </p>
                </div>

                {/* STEP 1 — tap-to-select, icon-led. This is the whole task
                    for most users; nothing else on the page needs reading. */}
                <div className="mt-10 flex min-w-0 flex-wrap items-start gap-3 sm:items-center sm:gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-brand to-brand-dark font-mono text-sm font-semibold text-brand-foreground shadow-[0_6px_16px_rgba(31,74,54,0.2)]">1</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">{localizedText(language, "Step 1", "Hakbang 1")}</p>
                    <h2 className="mt-0.5 text-lg font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-xl">{localizedText(language, "Select Your Symptoms", "Piliin ang iyong mga sintomas")}</h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-muted sm:text-sm">{localizedText(language, "Choose all the symptoms you are currently experiencing. You may select more than one.", "Piliin ang lahat ng sintomas na nararanasan mo ngayon. Maaari kang pumili ng higit sa isa.")}</p>
                  </div>
                  {selected.length > 0 && (
                    <span aria-live="polite" className="ml-[3.25rem] inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-[0_3px_10px_rgba(31,74,54,0.06)] sm:ml-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                      {localizedText(language, `${selected.length} selected`, `${selected.length} napili`)}
                    </span>
                  )}
                  <span className="hidden h-px w-12 shrink-0 bg-gradient-to-r from-[#DDE7DB] to-transparent sm:block" aria-hidden="true" />
                </div>
                <div className="mt-4 space-y-3 sm:space-y-4">
                  {SYMPTOM_CATEGORIES.map((category) => {
                    const categorySymptoms = SYMPTOMS.filter((symptom) => symptom.category === category.key);
                    return (
                      <section key={category.key} aria-labelledby={`symptom-category-${category.key}`} className="relative rounded-2xl border border-[#E4EAE1] bg-[linear-gradient(145deg,rgba(255,255,255,0.82)_0%,rgba(247,250,245,0.72)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_5px_16px_rgba(24,38,25,0.025)] sm:p-4">
                        <div className="flex items-center gap-3">
                          <span className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand to-[#C7B37A]" aria-hidden="true" />
                          <h3 id={`symptom-category-${category.key}`} className="text-sm font-semibold text-ink-secondary">
                            {localizedText(language, category.en, category.tl)}
                          </h3>
                          <span className="h-px flex-1 bg-gradient-to-r from-[#DDE7DB] to-transparent" aria-hidden="true" />
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3 sm:grid-cols-3">
                          {categorySymptoms.map((s) => (
                            <SymptomChip
                              key={s.value}
                              label={language === "both" ? s.en : localizedText(language, s.en, s.tl)}
                              icon={s.icon}
                              subLabel={language === "both" ? s.tl : undefined}
                              selected={selected.includes(s.value)}
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
                        <h2 id="type-chip-heading" className="text-base font-semibold text-ink lg:text-lg">{localizedText(language, "Additional Symptom Details", "Karagdagang Detalye ng Sintomas")}</h2>
                        <p className="mt-1 text-sm font-semibold text-ink-secondary">{localizedText(language, "What type of symptom are you experiencing?", "Anong uri ng sintomas ang nararanasan mo?")}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-muted">{localizedText(language, "Select a category if you know it. This step is optional.", "Pumili ng kategorya kung alam mo. Opsyonal ang hakbang na ito.")}</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-5 border-t border-[#DCE7DA] pt-4">
                      {selectedSymptomsWithTypes.map((symptom) => {
                        const symptomInfo = SYMPTOMS.find((item) => item.value === symptom);
                        const typeOptions = TYPE_CHIPS[symptom] ?? [];
                        if (typeOptions.length === 0) return null;

                        if (symptom === "abdominal pain") {
                          return (
                            <div key={symptom} className="border-t border-[#E4EBE1] pt-4 first:border-t-0 first:pt-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{symptomInfo && localizedText(language, symptomInfo.en, symptomInfo.tl)}</p>

                              <div className="mt-3">
                                <p className="text-sm font-semibold text-ink">{localizedText(language, "Where exactly?", "Saan eksakto?")}</p>
                                <AbdominalPainDiagram />
                                <AbdominalLocationChoices
                                  selectedValues={selectedTypes[symptom] ?? []}
                                  onToggle={(value) => toggleType(symptom, value)}
                                />
                              </div>

                              <div className="mt-5">
                                <p className="text-sm font-semibold text-ink">{localizedText(language, "What does it feel like?", "Ano ang klase ng sakit?")}</p>
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
                                          <span>{localizedText(language, type.en, type.tl)}</span>
                                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] leading-none transition ${isSelected ? "border-white/55 bg-white/15 text-white" : "border-[#CBD8CA] text-transparent group-hover:border-brand/50"}`} aria-hidden="true">✓</span>
                                        </span>
                                        <span className={`mt-1 block text-xs leading-relaxed ${isSelected ? "text-white/80" : "text-ink-secondary"}`}>{type.description}</span>
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
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">{symptomInfo && localizedText(language, symptomInfo.en, symptomInfo.tl)}</p>
                            <div className={symptom === "difficulty breathing" ? "mt-2 flex flex-wrap gap-2" : "mt-2.5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-2.5 lg:grid-cols-4"}>
                              {typeOptions.map((type) => {
                                const isSelected = selectedTypes[symptom]?.includes(type.en) ?? false;
                                const description = type.description ?? [
                                  ...COUGH_CLASSIFICATIONS,
                                  ...FEVER_CLASSIFICATIONS,
                                  ...ABDOMINAL_PAIN_CLASSIFICATIONS,
                                  ...BODY_PAIN_CLASSIFICATIONS,
                                  ...DIARRHEA_CLASSIFICATIONS,
                                  ...VOMITING_CLASSIFICATIONS,
                                  ...COLD_SYMPTOM_CLASSIFICATIONS,
                                  ...RASH_CLASSIFICATIONS,
                                ].find((classification) => classification.en === type.en)?.description;
                                if (symptom === "difficulty breathing") {
                                  return (
                                    <button
                                      key={type.en}
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() => toggleType(symptom, type.en)}
                                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${isSelected ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-[#DCE5D8] bg-white/85 text-ink-secondary hover:border-brand/50"}`}
                                    >
                                      <span className="block font-semibold">{localizedText(language, type.en, type.tl)}</span>
                                      {description && <span className={`mt-1 block max-w-56 text-xs leading-relaxed ${isSelected ? "text-brand-foreground/80" : "text-ink-secondary"}`}>{description}</span>}
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    key={type.en}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => toggleType(symptom, type.en)}
                                    className={`group flex min-h-[76px] w-full flex-col justify-center rounded-xl border px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 ${isSelected ? "border-[#1F4A36] bg-[linear-gradient(145deg,#2F6B4F_0%,#1F4A36_100%)] text-white shadow-[0_8px_18px_rgba(31,74,54,0.2)]" : "border-[#DCE5D8] bg-white/90 text-ink-secondary shadow-[0_3px_10px_rgba(24,38,25,0.035)] hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_16px_rgba(31,74,54,0.09)]"}`}
                                  >
                                    <span className="flex w-full items-center justify-between gap-2 font-semibold">
                                      <span>{localizedText(language, type.en, type.tl)}</span>
                                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] leading-none transition ${isSelected ? "border-white/55 bg-white/15 text-white" : "border-[#CBD8CA] text-transparent group-hover:border-brand/50"}`} aria-hidden="true">✓</span>
                                    </span>
                                    {description && <span className={`mt-1 block text-xs leading-relaxed ${isSelected ? "text-white/80" : "text-ink-secondary"}`}>{description}</span>}
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

                <PainScale
                  items={painScaleItems}
                  values={painLevels}
                  onSelect={(key, value) => setPainLevels((prev) => ({ ...prev, [key]: value }))}
                />

                {showUrgentNudge && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 lg:text-base">
                    {localizedText(language, "If you’re struggling to breathe right now, don’t wait for this result — go to the nearest hospital or call for help.", "Kung hirap kang huminga ngayon, huwag hintayin ang resulta — pumunta agad sa pinakamalapit na ospital o humingi ng tulong.")}
                  </div>
                )}

                {/* STEP 2 — tap-to-pick duration, no typing or format to get
                    right. Optional, so no chip needs to be pre-selected. */}
                <fieldset className="relative mt-10 min-w-0 overflow-hidden rounded-3xl border border-[#DCE6D9] bg-[linear-gradient(145deg,rgba(255,255,255,0.94)_0%,rgba(247,250,245,0.9)_100%)] p-4 shadow-[0_16px_38px_rgba(31,74,54,0.07)] sm:p-6">
                  <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />
                  <legend className="max-w-full px-2 text-base font-semibold text-ink lg:text-lg">
                    <span className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#DCE6D9] bg-white/95 px-3 py-2.5 shadow-[0_6px_18px_rgba(31,74,54,0.08)] sm:px-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark font-mono text-sm text-brand-foreground shadow-[0_4px_10px_rgba(31,74,54,0.2)]">3</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight text-ink sm:text-base">{localizedText(language, "When did it start?", "Kailan nagsimula?")}</span>
                        {language !== "en" && <span className="mt-0.5 block text-xs font-normal leading-tight text-ink-muted">{language === "both" ? "(optional)" : "Opsyonal"}</span>}
                      </span>
                    </span>
                  </legend>
                  <p className="mt-2 pl-10 text-xs leading-relaxed text-ink-muted">
                    {localizedText(language, "Choose the closest time range, select “Not sure,” or leave this optional question unanswered.", "Piliin ang pinakamalapit na tagal, piliin ang “Hindi sigurado,” o laktawan ang opsyonal na tanong na ito.")}
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-3">
                    {DURATION_OPTIONS.map((duration) => {
                      const isSelected = durationKey === duration.key;
                      return (
                        <button
                          key={duration.key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setDurationKey(isSelected ? null : duration.key);
                            setExactDurationMode(false);
                          }}
                          className={`group relative flex min-h-[76px] flex-col items-center justify-center overflow-hidden rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 motion-reduce:transition-none sm:px-3 ${
                            isSelected
                              ? "border-[#1F4A36] bg-[linear-gradient(145deg,#347454_0%,#1F4A36_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(31,74,54,0.22)] ring-1 ring-brand/20"
                              : "border-[#DCE5D8] bg-[linear-gradient(145deg,#FFFFFF_0%,#F9FBF7_100%)] text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(24,38,25,0.04)] hover:border-brand/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_rgba(31,74,54,0.11)]"
                          }`}
                        >
                          <span className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent ${isSelected ? "opacity-60" : "opacity-90"}`} aria-hidden="true" />
                          {isSelected && <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[11px] text-white ring-1 ring-white/25" aria-hidden="true">✓</span>}
                          <span className="relative block">{localizedText(language, duration.en, duration.tl)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!exactDurationMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDurationKey(null);
                        setExactDurationMode(true);
                      }}
                      className="text-action mt-3 block cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-medium text-brand underline decoration-brand/40 underline-offset-4"
                    >
                      {localizedText(language, "Need an exact duration? Type the days →", "Hindi sigurado sa saklaw? Mag-type ng eksaktong araw →")}
                    </button>
                  ) : (
                    <div className="mt-4 max-w-sm">
                      <label htmlFor="exact-duration-days" className="block text-sm font-medium text-ink-secondary">{localizedText(language, "Exact duration in days", "Eksaktong bilang ng araw")}</label>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          id="exact-duration-days"
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          max={MAX_EXACT_DURATION_DAYS}
                          step="any"
                          value={exactDurationDays}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            if (/^\d*(?:\.\d*)?$/.test(value)) setExactDurationDays(value);
                          }}
                          aria-invalid={exactDurationDays !== "" && !exactDurationValid}
                          aria-describedby="exact-duration-hint"
                          className={`${inputClass} max-w-40`}
                          placeholder="e.g. 4"
                        />
                        <span className="text-sm text-ink-muted">{localizedText(language, "days", "araw")}</span>
                      </div>
                      <p id="exact-duration-hint" className={`mt-1.5 text-xs ${exactDurationDays !== "" && !exactDurationValid ? "text-emergency-red" : "text-ink-muted"}`}>
                        {localizedText(language, "Enter a duration from 0.01 to 365 days.", "Maglagay ng tagal mula 0.01 hanggang 365 araw.")}
                      </p>
                      <button type="button" onClick={() => setExactDurationMode(false)} className="text-action mt-2 cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-medium text-brand underline underline-offset-4">{localizedText(language, "Use time-range buttons", "Pumili ng saklaw")}</button>
                    </div>
                  )}
                </fieldset>

                {/* Free-text path kept out of the default view so it doesn't
                    compete with the two-step tap flow above. */}
                <section className="relative mt-8 overflow-hidden rounded-3xl border border-[#D6E3D4] bg-[linear-gradient(145deg,#FFFFFF_0%,#F4F8F2_100%)] p-3 shadow-[0_16px_38px_rgba(31,74,54,0.08)] ring-1 ring-white/80 sm:p-4">
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />
                  <FreeTextSymptomToggle
                    expanded={showTextInput}
                    controls="symptoms-text-panel"
                    onToggle={() => setShowTextInput((visible) => !visible)}
                  />
                  <div id="symptoms-text-panel" hidden={!showTextInput} className="mt-3 rounded-2xl border border-[#E1EAE0] bg-white/80 p-4 sm:p-5">
                    <label htmlFor="symptoms" className="block text-sm font-semibold text-ink">
                      {localizedText(language, "What are you experiencing?", "Ano ang nararamdaman?")}
                    </label>
                    <p id="symptoms-text-hint" className="mt-1 text-xs leading-relaxed text-ink-muted">
                      {localizedText(language, "Include when it started and anything else that may help.", "Isama kung kailan nagsimula at iba pang mahahalagang detalye.")}
                    </p>
                    <textarea
                      id="symptoms"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={5}
                      aria-describedby="symptoms-text-hint"
                      placeholder={localizedText(language, "For example: “I have had a fever and cough since yesterday.”", "Halimbawa: “May lagnat at ubo ako simula kahapon.”")}
                      className={textareaClass}
                    />
                  </div>
                </section>

                {error && (
                  <div className="mt-6">
                    <ErrorAlert>{error}</ErrorAlert>
                  </div>
                )}

                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => router.back()} className="min-h-11 w-full rounded-xl border border-border bg-white px-5 font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark sm:w-auto">
                    {localizedText(language, "Back", "Bumalik")}
                  </button>
                  <button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting} className={`${submitButtonClass} sm:min-w-64`}>
                    <span>{submitting
                      ? localizedText(language, "Checking…", "Sinusuri…")
                      : localizedText(language, "Submit Assessment", "Isumite ang pagsusuri")}</span>
                    {!submitting && <IconChevronDown size={17} className="rotate-[-90deg] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
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