"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { analyze } from "@/lib/api";
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
  inputClass,
  PageMain,
  PageTitle,
  PremiumSelect,
  submitButtonClass,
  textareaClass,
  Toast,
} from "@/app/components/ui/primitives";
import PageHeader from "@/app/components/PageHeader";
import SymptomChip from "@/app/components/SymptomChip";
import { IconChevronDown, IconProfile } from "@/app/components/ui/icons";
import { localizedText, useInterfaceLanguage } from "@/app/components/LanguageProvider";
import { useAssessmentMode } from "../AssessmentTargetContext";
import FreeTextSymptomToggle from "../FreeTextSymptomToggle";
import { SYMPTOM_CATEGORIES, SYMPTOMS } from "../symptoms";

const DANGER_SIGNS = [
  { value: "unable to drink", en: "Unable to drink", tl: "Ayaw uminom" },
  { value: "vomits everything", en: "Vomits everything / cannot keep anything down", tl: "Isinusuka ang lahat / hindi mapanatili ang kinain o ininom" },
  { value: "altered consciousness", en: "Very sleepy or difficult to wake", tl: "Sobrang antok o mahirap gisingin" },
  { value: "neurologic emergency", en: "Convulsions", tl: "Kombulsyon" },
] as const;

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
  "abdominal pain": [...ABDOMINAL_LOCATION_OPTIONS, ...ABDOMINAL_QUALITY_OPTIONS],
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

const DURATIONS = [
  { key: "few_hours", en: "A few hours ago", tl: "Ilang oras pa lang", phrase: "about 1–6 hours ago", days: 3.5 / 24, tier: "recent" },
  { key: "today", en: "Today", tl: "Ngayong araw", phrase: "sometime today", days: 0.5, tier: "recent" },
  { key: "one_two_days", en: "1–2 days", tl: "1–2 araw", phrase: "about 1–2 days ago", days: 1.5, tier: "recent" },
  { key: "three_four_days", en: "3–4 days", tl: "3–4 araw", phrase: "about 3–4 days ago", days: 3.5, tier: "longer" },
  { key: "five_seven_days", en: "5–7 days", tl: "5–7 araw", phrase: "about 5–7 days ago", days: 6, tier: "longer" },
  { key: "one_two_weeks", en: "1–2 weeks", tl: "1–2 linggo", phrase: "about 1–2 weeks ago", days: 10.5, tier: "longer" },
  { key: "over_two_weeks", en: "More than 2 weeks", tl: "Mahigit 2 linggo", phrase: "more than 2 weeks ago", days: 14.5, tier: "longer" },
] as const;

type PregnancyStatus = "yes" | "no" | "not_sure" | "prefer_not_to_say";
type AgeUnit = "years" | "months";

export default function PersonAssessmentPage() {
  const router = useRouter();
  const { language } = useInterfaceLanguage();
  const assessmentMode = useAssessmentMode();
  const embedded = assessmentMode !== null;
  const selfAssessment = assessmentMode === "self";
  const [patientAge, setPatientAge] = useState("");
  const [ageUnit, setAgeUnit] = useState<AgeUnit>("years");
  const [patientSex, setPatientSex] = useState("");
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus | "">("");
  const [showDangerSigns, setShowDangerSigns] = useState(true);
  const [showOtherSymptoms, setShowOtherSymptoms] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string[]>>({});
  const [otherSymptoms, setOtherSymptoms] = useState("");
  const [durationKey, setDurationKey] = useState<string | null>(null);
  const [showLongerDurations, setShowLongerDurations] = useState(false);
  const [exactDurationMode, setExactDurationMode] = useState(false);
  const [exactDurationDays, setExactDurationDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const toggleSymptom = (value: string) => {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const toggleType = (symptom: string, type: string) => {
    setSelectedTypes((current) => {
      const values = current[symptom] ?? [];
      return {
        ...current,
        [symptom]: values.includes(type) ? values.filter((item) => item !== type) : [...values, type],
      };
    });
  };

  const parsedAge = Number(patientAge);
  const maxAge = ageUnit === "months" ? 96 : 150;
  const validAge =
    /^\d+$/.test(patientAge) &&
    Number.isInteger(parsedAge) &&
    parsedAge >= 1 &&
    parsedAge <= maxAge;
  const showDangerSignsForAge = validAge && (ageUnit === "months" ? parsedAge <= 96 : parsedAge <= 8);
  const ageInYears = ageUnit === "months" ? Math.floor(parsedAge / 12) : parsedAge;
  const ageUnitLabel = `${ageUnit.slice(0, -1)}${parsedAge === 1 ? "" : "s"}`;
  const selectedDuration = DURATIONS.find((duration) => duration.key === durationKey);
  const exactDaysValue = Number(exactDurationDays);
  const exactDurationValid =
    exactDurationMode &&
    /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(exactDurationDays) &&
    Number.isFinite(exactDaysValue) &&
    exactDaysValue >= 0.01;
  const canSubmit = Boolean(validAge && (selected.length || otherSymptoms.trim()) && !submitting && (!exactDurationMode || exactDurationValid));
  const selectedSymptomCount = selected.filter((value) => SYMPTOMS.some((symptom) => symptom.value === value)).length;
  const hasBreathingDifficulty = selected.includes("difficulty breathing");
  const selectedDangerSigns = DANGER_SIGNS.filter((sign) => selected.includes(sign.value));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const typeText = Object.values(selectedTypes).flat().join(", ");
      if (exactDurationMode && !exactDurationValid) {
        setSubmitting(false);
        setToast("Enter the number of days since symptoms started, or go back to choose a time range.");
        return;
      }
      const payload = {
        input_text: [
          selfAssessment
            ? `Assessment for myself, aged ${parsedAge} ${ageUnitLabel}.`
            : `Assessment for a person aged ${parsedAge} ${ageUnitLabel}.`,
          otherSymptoms.trim() ? `Additional symptoms: ${otherSymptoms.trim()}` : "",
          typeText ? `Additional symptom details: ${typeText}.` : "",
          exactDurationMode
            ? `Symptoms started ${exactDaysValue} ${exactDaysValue === 1 ? "day" : "days"} ago.`
            : selectedDuration ? `Symptoms started ${selectedDuration.phrase}.` : "",
        ].filter(Boolean).join(" "),
        selected_symptoms: selected,
        method: "select" as const,
        duration_days: exactDurationMode ? exactDaysValue : selectedDuration?.days ?? null,
        age: ageInYears,
        age_months: ageUnit === "months" ? parsedAge : null,
        sex: patientSex || null,
        pregnancy_status: pregnancyStatus || null,
      };
      const result = await analyze(payload);
      if (result.id === 0) {
        window.sessionStorage.setItem("healthguard_pending_guest_assessment", JSON.stringify(payload));
        window.sessionStorage.setItem("healthguard_guest_result", JSON.stringify(result));
        router.push("/result/guest");
      } else {
        router.push(`/result/${result.id}`);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const content = (
        <div className="assessment-route-enter grid items-start gap-6">
          <Card className="relative overflow-hidden rounded-3xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] shadow-[0_26px_72px_rgba(24,38,25,0.11)] ring-1 ring-white/70">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">HealthGuard | Personal health check</p>
            <PageTitle subtitle={selfAssessment
              ? localizedText(language, "Describe how you feel and when it started.", "Ilarawan ang nararamdaman mo at kung kailan ito nagsimula.")
              : localizedText(language, "A simple guide for assessing someone else.", "Gabay sa pagsusuri ng ibang tao.")}>
              {selfAssessment
                ? localizedText(language, "How are you feeling?", "Ano ang nararamdaman mo?")
                : localizedText(language, "Assess someone", "Magsuri ng ibang tao")}
            </PageTitle>
            {!embedded && (
              <div className="mt-5 flex justify-end">
                <div className="inline-flex max-w-full rounded-xl border border-[#D8E2D3] bg-white/80 p-1 shadow-[0_4px_14px_rgba(24,38,25,0.06)]" role="group" aria-label="Assessment type">
                  <Link href="/assessment" className="group inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-center text-xs font-semibold text-ink-secondary transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-tint hover:text-brand-dark hover:shadow-[0_6px_14px_rgba(47,107,79,0.12)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:px-4 sm:text-sm">{localizedText(language, "For myself", "Sarili")}</Link>
                  <span aria-current="page" className="inline-flex min-h-10 items-center rounded-lg bg-gradient-to-r from-brand to-brand-dark px-3 text-center text-xs font-semibold text-brand-foreground shadow-[0_3px_8px_rgba(31,74,54,0.2)] sm:px-4 sm:text-sm">{localizedText(language, "Assess someone", "Magsuri ng ibang tao")}</span>
                </div>
              </div>
            )}

            <div className="relative mt-8 flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-[#D7E4D5] bg-[linear-gradient(135deg,#F5F9F3_0%,#FFFFFF_55%,#F4F7EF_100%)] p-4 shadow-[0_12px_28px_rgba(31,74,54,0.07)] sm:gap-4 sm:p-5">
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand via-[#5F8A68] to-[#C7B37A]" aria-hidden="true" />
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#DCE6D9] bg-white text-brand shadow-[0_4px_12px_rgba(31,74,54,0.08)]" aria-hidden="true"><IconProfile size={18} /></span>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">A simple guide</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-ink sm:text-base">
                  {localizedText(language, "Select the symptoms being experienced. You do not need to know the medical condition.", "Piliin ang mga sintomas na nararanasan. Hindi kailangang tukuyin ang sakit.")}
                </p>
                {language === "both" && <p className="mt-1 text-xs leading-relaxed text-ink-muted sm:text-sm">
                  Piliin ang mga sintomas na nararanasan. Hindi kailangang tukuyin ang sakit.
                </p>}
              </div>
            </div>

            <fieldset className="relative mt-8 min-w-0 overflow-hidden rounded-3xl border border-[#D7E2D5] bg-[linear-gradient(145deg,#FFFFFF_0%,#F8FAF6_55%,#F1F6EF_100%)] px-4 pb-5 pt-4 shadow-[0_18px_42px_rgba(31,74,54,0.075)] sm:px-6 sm:pb-6">
              <span className="pointer-events-none absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r from-[#183D2D] via-[#4D8061] to-[#C7B37A]" aria-hidden="true" />
              <legend className="max-w-full px-2 text-base font-semibold text-ink lg:text-lg">
                <span className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#DCE6D9] bg-white/95 px-3 py-2.5 shadow-[0_6px_18px_rgba(31,74,54,0.08)] sm:px-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark font-mono text-sm text-brand-foreground shadow-[0_4px_10px_rgba(31,74,54,0.2)]">1</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight text-ink sm:text-base">{selfAssessment
                      ? localizedText(language, "About you", "Tungkol sa iyo")
                      : localizedText(language, "About the person", "Tungkol sa tao")}</span>
                  </span>
                </span>
              </legend>
              <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="patient-age" className="block text-sm font-medium text-ink-secondary">{selfAssessment
                    ? localizedText(language, "Your age", "Edad mo")
                    : localizedText(language, "Age of the person", "Edad ng tao")}</label>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                    <input
                      id="patient-age"
                      name="patient-age"
                      type="text"
                      maxLength={3}
                      inputMode="numeric"
                      pattern="\d+"
                      required
                      value={patientAge}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        if (/^\d*$/.test(value)) setPatientAge(value);
                      }}
                      aria-invalid={patientAge !== "" && !validAge}
                      aria-describedby="patient-age-hint"
                      className={inputClass}
                      placeholder={ageUnit === "months" ? "e.g. 8" : "e.g. 4"}
                    />
                    <PremiumSelect
                      id="age-unit"
                      value={ageUnit}
                      onChange={(value) => {
                        setAgeUnit(value as AgeUnit);
                        setPatientAge("");
                      }}
                      ariaLabel={localizedText(language, "Age unit", "Yunit ng edad")}
                      buttonClassName="min-h-[52px] rounded-xl border-[#CBD8C9] bg-white px-3"
                      options={[
                        { value: "years", label: localizedText(language, "Years", "Taon") },
                        { value: "months", label: localizedText(language, "Months", "Buwan") },
                      ]}
                    />
                  </div>
                  <p id="patient-age-hint" className={`mt-1.5 text-xs ${patientAge !== "" && !validAge ? "text-emergency-red" : "text-ink-muted"}`}>
                    {patientAge !== "" && !validAge
                      ? `Enter a whole number from 1 to ${maxAge}. Zero is not accepted.`
                      : "Use months for ages under 8 years. / Para sa edad na wala pang 8 taon, gamitin ang buwan."}
                  </p>
                </div>
                <div>
                  <label htmlFor="patient-sex" className="block text-sm font-medium text-ink-secondary">{localizedText(language, "Sex", "Kasarian")} <span className="font-normal text-ink-faint">{localizedText(language, "(optional)", "(opsyonal)")}</span></label>
                  <PremiumSelect
                    id="patient-sex"
                    value={patientSex}
                    onChange={(value) => {
                      setPatientSex(value);
                      if (value !== "female") setPregnancyStatus("");
                    }}
                    ariaLabel={localizedText(language, "Sex", "Kasarian")}
                    className="mt-2"
                    buttonClassName="min-h-[52px] rounded-xl border-[#CBD8C9] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAF7_100%)] px-4 text-base shadow-[0_8px_18px_rgba(24,38,25,0.07)] hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_12px_24px_rgba(24,38,25,0.12)] focus:ring-4 focus:ring-brand/15"
                    options={[
                      { value: "", label: localizedText(language, "Choose", "Pumili") },
                      { value: "female", label: localizedText(language, "Female", "Babae") },
                      { value: "male", label: localizedText(language, "Male", "Lalaki") },
                    ]}
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{localizedText(language, "Optional; does not change urgency.", "Opsyonal; hindi nito binabago ang antas ng panganib.")}</p>
                </div>
                {patientSex === "female" && <div>
                  <label htmlFor="pregnancy-status" className="block text-sm font-medium text-ink-secondary">{localizedText(language, "Pregnancy", "Pagbubuntis")} <span className="font-normal text-ink-faint">{localizedText(language, "(optional)", "(opsyonal)")}</span></label>
                  <PremiumSelect
                    id="pregnancy-status"
                    value={pregnancyStatus}
                    onChange={(value) => setPregnancyStatus(value as PregnancyStatus | "")}
                    ariaLabel={localizedText(language, "Pregnancy", "Pagbubuntis")}
                    className="mt-2"
                    buttonClassName="min-h-[52px] rounded-xl border-[#CBD8C9] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAF7_100%)] px-4 text-base shadow-[0_8px_18px_rgba(24,38,25,0.07)] hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_12px_24px_rgba(24,38,25,0.12)] focus:ring-4 focus:ring-brand/15"
                    options={[
                      { value: "", label: localizedText(language, "Choose", "Pumili") },
                      { value: "yes", label: localizedText(language, "Yes", "Oo") },
                      { value: "no", label: localizedText(language, "No", "Hindi") },
                      { value: "not_sure", label: localizedText(language, "Not sure", "Hindi sigurado") },
                      { value: "prefer_not_to_say", label: localizedText(language, "Prefer not to say", "Ayaw sabihin") },
                    ]}
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{localizedText(language, "A reported pregnancy with fever prompts health-worker review.", "Kung may lagnat habang buntis, kumonsulta sa health worker.")}</p>
                </div>}
              </div>
            </fieldset>

            <div className="mt-10 flex min-w-0 flex-wrap items-start gap-3 sm:items-center sm:gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-brand to-brand-dark font-mono text-sm font-semibold text-brand-foreground shadow-[0_6px_16px_rgba(31,74,54,0.2)]">2</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">{localizedText(language, "Step 2", "Hakbang 2")}</p>
                <h2 className="mt-0.5 text-lg font-semibold leading-snug tracking-[-0.02em] text-ink sm:text-xl">{localizedText(language, "Select symptoms", "Piliin ang mga sintomas")}</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{localizedText(language, "Choose all that apply", "Piliin ang lahat ng naaangkop")}</p>
              </div>
              {selectedSymptomCount > 0 && (
                <span aria-live="polite" className="ml-[3.25rem] inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-[0_3px_10px_rgba(31,74,54,0.06)] sm:ml-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                  {localizedText(language, `${selectedSymptomCount} selected`, `${selectedSymptomCount} napili`)}
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
                      {categorySymptoms.map((symptom) => (
                        <SymptomChip
                          key={symptom.value}
                          label={language === "both" ? symptom.en : localizedText(language, symptom.en, symptom.tl)}
                          subLabel={language === "both" ? symptom.tl : undefined}
                          icon={symptom.icon}
                          selected={selected.includes(symptom.value)}
                          onToggle={() => toggleSymptom(symptom.value)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            <section className="relative mt-6 overflow-hidden rounded-3xl border border-[#D6E3D4] bg-[linear-gradient(145deg,#FFFFFF_0%,#F4F8F2_100%)] p-3 shadow-[0_16px_38px_rgba(31,74,54,0.08)] ring-1 ring-white/80 sm:p-4">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />
              <FreeTextSymptomToggle
                expanded={showOtherSymptoms}
                controls="other-symptoms-panel"
                onToggle={() => setShowOtherSymptoms((visible) => !visible)}
              />
              <div id="other-symptoms-panel" hidden={!showOtherSymptoms} className="mt-3 rounded-2xl border border-[#E1EAE0] bg-white/80 p-4 sm:p-5">
                <label htmlFor="other-symptoms" className="block text-sm font-semibold text-ink">
                  {localizedText(language, "What do you notice?", "Ano ang napapansin?")}
                </label>
                <p id="other-symptoms-hint" className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {localizedText(language, "Include when it started and anything else that may help.", "Isama kung kailan nagsimula at iba pang mahahalagang detalye.")}
                </p>
                <textarea
                  id="other-symptoms"
                  value={otherSymptoms}
                  onChange={(event) => setOtherSymptoms(event.target.value)}
                  rows={5}
                  aria-describedby="other-symptoms-hint"
                  placeholder={localizedText(language, "For example: “A cough started yesterday and is getting worse.”", "Halimbawa: “Nagsimula kahapon ang ubo at lumalala ito.”")}
                  className={textareaClass}
                />
              </div>
            </section>
            {showDangerSignsForAge && <section className="relative mt-6 overflow-hidden rounded-3xl border border-[#E9D8D0] bg-[linear-gradient(145deg,#FFFEFC_0%,#FFF8F4_100%)] shadow-[0_16px_36px_rgba(107,49,31,0.08)]">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8F3528] via-[#C65D43] to-[#E4B78B]" aria-hidden="true" />
              <button
                type="button"
                aria-expanded={showDangerSigns}
                aria-controls="child-danger-signs"
                onClick={() => setShowDangerSigns((open) => !open)}
                className="group flex min-h-[76px] w-full items-center justify-between gap-4 px-4 py-4 text-left outline-none transition-colors duration-200 hover:bg-[#FBF0EA]/80 focus-visible:ring-4 focus-visible:ring-[#9B3F2D]/15 sm:px-5"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#E9D2C8] bg-white text-[#963D2D] shadow-[0_4px_12px_rgba(107,49,31,0.08)]" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                      <path d="M12 9v4m0 3h.01" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9B3F2D]">{localizedText(language, "Urgent check", "Agarang pagsusuri")}</span>
                    <span className="mt-0.5 block text-sm font-semibold leading-snug text-ink sm:text-base">{localizedText(language, "General danger signs in children", "Mga pangkalahatang senyales ng panganib sa bata")}</span>
                  {selectedDangerSigns.length > 0 && (
                    <span className="mt-2 inline-flex rounded-full border border-[#E6C8BA] bg-white/80 px-2.5 py-1 text-xs font-semibold text-[#893A2B]">{localizedText(language, `${selectedDangerSigns.length} selected`, `${selectedDangerSigns.length} napili`)}</span>
                  )}
                </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 rounded-full border border-[#E7D3CA] bg-white/75 px-3 py-2 text-xs font-semibold text-[#893A2B] shadow-sm transition-colors group-hover:bg-white">
                  {showDangerSigns
                    ? localizedText(language, "Hide", "Itago")
                    : localizedText(language, "Show", "Ipakita")}
                  <IconChevronDown size={17} className={`transition-transform duration-200 ${showDangerSigns ? "rotate-180" : ""}`} aria-hidden="true" />
                </span>
              </button>
              <div id="child-danger-signs" hidden={!showDangerSigns} className="border-t border-[#EBDCD5] bg-white/45 px-4 pb-5 sm:px-5">
                <p className="pt-4 text-sm leading-relaxed text-ink-muted">{localizedText(language, "If any of these signs are present, seek urgent medical care.", "Kung may alinman sa mga ito, humingi agad ng tulong medikal.")}</p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {DANGER_SIGNS.map((sign) => {
                    const active = selected.includes(sign.value);
                    return (
                      <button key={sign.value} type="button" aria-pressed={active} onClick={() => toggleSymptom(sign.value)} className={`group/item relative flex min-h-[68px] items-center justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left text-sm outline-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-[#9B3F2D]/15 motion-reduce:transition-none ${active ? "border-[#963D2D] bg-[linear-gradient(135deg,#A64735_0%,#843324_100%)] text-white shadow-[0_8px_18px_rgba(132,51,36,0.2)]" : "border-[#E7D9D2] bg-[linear-gradient(145deg,#FFFFFF_0%,#FFFCFA_100%)] text-ink-secondary shadow-[0_3px_10px_rgba(107,49,31,0.04)] hover:border-[#D9B8A9] hover:shadow-[0_10px_20px_rgba(107,49,31,0.09)]"}`}>
                        <span className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent ${active ? "opacity-50" : "opacity-90"}`} aria-hidden="true" />
                        <span className="relative">
                          <span className="block font-semibold">{localizedText(language, sign.en, sign.tl)}</span>
                        </span>
                        {active && <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white ring-1 ring-white/25" aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>}

            {hasBreathingDifficulty && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900">
                {localizedText(
                  language,
                  selfAssessment
                    ? "If you are struggling to breathe, do not wait for this assessment. Go to the nearest hospital or call emergency services."
                    : "If the person is struggling to breathe, do not wait for this assessment. Go to the nearest hospital or call emergency services.",
                  selfAssessment
                    ? "Kung hirap kang huminga, huwag hintayin ang pagsusuring ito. Pumunta agad sa pinakamalapit na ospital o tumawag sa emergency services."
                    : "Kung hirap huminga ang tao, huwag hintayin ang pagsusuring ito. Pumunta agad sa pinakamalapit na ospital o tumawag sa emergency services.",
                )}
              </div>
            )}

            {selected.some((symptom) => (TYPE_CHIPS[symptom] ?? []).length > 0) && (
              <section className="relative mt-8 overflow-hidden rounded-2xl border border-[#D3E0D2] bg-[linear-gradient(145deg,#F9FCF8_0%,#F1F6EF_100%)] p-4 shadow-[0_14px_30px_rgba(31,74,54,0.07)] sm:p-5" aria-labelledby="person-type-heading">
                <div className="relative flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-br from-brand to-brand-dark font-mono text-sm font-semibold text-brand-foreground shadow-[0_5px_12px_rgba(31,74,54,0.18)]">3</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">{localizedText(language, "Optional classification", "Opsyonal na klasipikasyon")}</p>
                    <h2 id="person-type-heading" className="mt-0.5 text-base font-semibold leading-snug text-ink lg:text-lg">{localizedText(language, "What classification is it?", "Anong uri o klasipikasyon ng sintomas ito?")}</h2>
                  </div>
                </div>
                <div className="relative mt-4 space-y-4 border-t border-[#DCE7DA] pt-4">
                  {selected.map((symptom) => {
                    const options = TYPE_CHIPS[symptom] ?? [];
                    if (!options.length) return null;
                    const label = SYMPTOMS.find((item) => item.value === symptom);

                    if (symptom === "abdominal pain") {
                      return (
                        <div key={symptom}>
                          <p className="text-sm font-semibold text-ink">{label && localizedText(language, label.en, label.tl)}</p>

                          <div className="mt-3">
                            <p className="text-sm font-semibold text-ink">{localizedText(language, "Where exactly?", "Saan eksakto?")}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {ABDOMINAL_LOCATION_OPTIONS.map((type) => {
                                const active = selectedTypes[symptom]?.includes(type.en) ?? false;
                                return (
                                  <button key={type.en} type="button" aria-pressed={active} onClick={() => toggleType(symptom, type.en)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-[#DCE5D8] bg-white/85 text-ink-secondary hover:border-brand/50"}`}>
                                    <span className="block font-semibold">{localizedText(language, type.en, type.tl)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="text-sm font-semibold text-ink">{localizedText(language, "What does it feel like?", "Ano ang klase ng sakit?")}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {ABDOMINAL_QUALITY_OPTIONS.map((type) => {
                                const active = selectedTypes[symptom]?.includes(type.en) ?? false;
                                return (
                                  <button key={type.en} type="button" aria-pressed={active} onClick={() => toggleType(symptom, type.en)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-[#DCE5D8] bg-white/85 text-ink-secondary hover:border-brand/50"}`}>
                                    <span className="block font-semibold">{localizedText(language, type.en, type.tl)}</span>
                                    <span className={`mt-1 block max-w-56 text-xs leading-relaxed ${active ? "text-brand-foreground/80" : "text-ink-secondary"}`}>{type.description}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={symptom}>
                        <p className="text-sm font-semibold text-ink">{label && localizedText(language, label.en, label.tl)}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {options.map((type) => {
                            const active = selectedTypes[symptom]?.includes(type.en) ?? false;
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
                            return (
                              <button key={type.en} type="button" aria-pressed={active} onClick={() => toggleType(symptom, type.en)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-[#DCE5D8] bg-white/85 text-ink-secondary hover:border-brand/50"}`}>
                                <span className="block font-semibold">{localizedText(language, type.en, type.tl)}</span>
                                {description && <span className={`mt-1 block max-w-56 text-xs leading-relaxed ${active ? "text-brand-foreground/80" : "text-ink-secondary"}`}>{description}</span>}
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

            <fieldset className="relative mt-10 min-w-0 overflow-hidden rounded-3xl border border-[#DCE6D9] bg-[linear-gradient(145deg,rgba(255,255,255,0.94)_0%,rgba(247,250,245,0.9)_100%)] p-4 shadow-[0_16px_38px_rgba(31,74,54,0.07)] sm:p-6">
              <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" aria-hidden="true" />
              <legend className="max-w-full px-2 text-base font-semibold text-ink lg:text-lg">
                <span className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-[#DCE6D9] bg-white/95 px-3 py-2.5 shadow-[0_6px_18px_rgba(31,74,54,0.08)] sm:px-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark font-mono text-sm text-brand-foreground shadow-[0_4px_10px_rgba(31,74,54,0.2)]">4</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight text-ink sm:text-base">{localizedText(language, "When did it start?", "Kailan nagsimula?")}</span>
                    <span className="mt-0.5 block text-xs font-normal leading-tight text-ink-muted">{localizedText(language, "Optional", "Opsyonal")}</span>
                  </span>
                </span>
              </legend>
              <p className="mt-2 pl-10 text-xs leading-relaxed text-ink-muted">
                {localizedText(language, "Choose the closest time range. It’s okay if you’re not sure; you can leave this blank.", "Piliin ang pinakamalapit na tagal. Puwedeng hindi pumili kung hindi sigurado.")}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <p className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted"><span className="h-px w-5 bg-brand/35" aria-hidden="true" />{localizedText(language, "Recent", "Kamakailan lang")}</p>
                  <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 sm:gap-3">
                    {DURATIONS.filter((duration) => duration.tier === "recent").map((duration) => {
                      const active = durationKey === duration.key;
                      return (
                        <button key={duration.key} type="button" aria-pressed={active} onClick={() => { setDurationKey(active ? null : duration.key); setExactDurationMode(false); }} className={`group relative flex min-h-[76px] flex-col items-center justify-center overflow-hidden rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 motion-reduce:transition-none sm:px-3 ${active ? "border-[#1F4A36] bg-[linear-gradient(145deg,#347454_0%,#1F4A36_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(31,74,54,0.22)] ring-1 ring-brand/20" : "border-[#DCE5D8] bg-[linear-gradient(145deg,#FFFFFF_0%,#F9FBF7_100%)] text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(24,38,25,0.04)] hover:border-brand/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_rgba(31,74,54,0.11)]"}`}>
                          <span className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent ${active ? "opacity-60" : "opacity-90"}`} aria-hidden="true" />
                          {active && <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[11px] text-white ring-1 ring-white/25" aria-hidden="true">✓</span>}
                          <span className="relative">{localizedText(language, duration.en, duration.tl)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {showLongerDurations && (
                  <div>
                    <p className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted"><span className="h-px w-5 bg-brand/35" aria-hidden="true" />Longer / Matagal na</p>
                    <div className="grid grid-cols-2 gap-2 min-[640px]:grid-cols-4 sm:gap-3">
                      {DURATIONS.filter((duration) => duration.tier === "longer").map((duration) => {
                        const active = durationKey === duration.key;
                        return (
                          <button key={duration.key} type="button" aria-pressed={active} onClick={() => { setDurationKey(active ? null : duration.key); setExactDurationMode(false); }} className={`group relative flex min-h-[76px] flex-col items-center justify-center overflow-hidden rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 motion-reduce:transition-none sm:px-3 ${active ? "border-[#1F4A36] bg-[linear-gradient(145deg,#347454_0%,#1F4A36_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_rgba(31,74,54,0.22)] ring-1 ring-brand/20" : "border-[#DCE5D8] bg-[linear-gradient(145deg,#FFFFFF_0%,#F9FBF7_100%)] text-ink-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_rgba(24,38,25,0.04)] hover:border-brand/40 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_22px_rgba(31,74,54,0.11)]"}`}>
                            <span className={`pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent ${active ? "opacity-60" : "opacity-90"}`} aria-hidden="true" />
                            {active && <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-[11px] text-white ring-1 ring-white/25" aria-hidden="true">✓</span>}
                            <span className="relative">{localizedText(language, duration.en, duration.tl)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => { if (showLongerDurations && selectedDuration?.tier === "longer") setDurationKey(null); setShowLongerDurations(!showLongerDurations); setExactDurationMode(false); }} aria-expanded={showLongerDurations} className="text-action mt-3 cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold text-brand underline decoration-brand/40 underline-offset-4">
                {showLongerDurations
                  ? localizedText(language, "Show recent only ↑", "Ipakita ang kamakailan lamang ↑")
                  : localizedText(language, "Longer than 2 days? See more →", "Mahigit 2 araw? Ipakita ang iba pang pagpipilian →")}
              </button>
              {!exactDurationMode ? (
                <button type="button" onClick={() => { setDurationKey(null); setExactDurationMode(true); }} className="text-action mt-3 block cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-medium text-brand underline decoration-brand/40 underline-offset-4">
                  {localizedText(language, "Need an exact duration? Type the days →", "Hindi sigurado sa saklaw? Mag-type ng eksaktong araw →")}
                </button>
              ) : (
                <div className="mt-4 max-w-sm">
                  <label htmlFor="person-exact-duration-days" className="block text-sm font-medium text-ink-secondary">{localizedText(language, "Exact duration in days", "Eksaktong bilang ng araw")}</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="person-exact-duration-days"
                      type="text"
                      inputMode="decimal"
                      pattern="(?:\d+(?:\.\d*)?|\.\d+)"
                      value={exactDurationDays}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        if (/^\d*(?:\.\d*)?$/.test(value)) setExactDurationDays(value);
                      }}
                      aria-invalid={exactDurationDays !== "" && !exactDurationValid}
                      aria-describedby="person-exact-duration-hint"
                      className={`${inputClass} max-w-40`}
                      placeholder="e.g. 4"
                    />
                    <span className="text-sm text-ink-muted">{localizedText(language, "days", "araw")}</span>
                  </div>
                  <p id="person-exact-duration-hint" className={`mt-1.5 text-xs ${exactDurationDays !== "" && !exactDurationValid ? "text-emergency-red" : "text-ink-muted"}`}>
                    {localizedText(language, "Enter digits and an optional decimal; minimum 0.01 day.", "Maglagay ng numero, maaaring may decimal; hindi bababa sa 0.01 araw.")}
                  </p>
                  <button type="button" onClick={() => setExactDurationMode(false)} className="text-action mt-2 cursor-pointer border-0 bg-transparent p-0 text-left text-xs font-medium text-brand underline underline-offset-4">Use time-range buttons / Pumili ng saklaw</button>
                </div>
              )}
            </fieldset>

            <div className={`mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center ${embedded ? "sm:justify-end" : "sm:justify-between"}`}>
              {!embedded && <button type="button" onClick={() => router.back()} className="min-h-11 rounded-xl border border-border bg-white px-5 font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark">Back</button>}
              <button type="button" onClick={handleSubmit} disabled={!canSubmit} className={`${submitButtonClass} sm:min-w-64`}>
                <span>{submitting
                  ? localizedText(language, "Checking…", "Sinusuri…")
                  : selfAssessment
                    ? localizedText(language, "Get my assessment", "Kunin ang resulta ng pagsusuri")
                    : localizedText(language, "Assess person", "Suriin ang tao")}</span>
                {!submitting && <IconChevronDown size={17} className="rotate-[-90deg] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />}
              </button>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">This is a preliminary risk guide, not a diagnosis. For urgent concerns, contact a qualified health worker.</p>
            {toast && <Toast message={toast} tone="error" onDismiss={() => setToast(null)} />}
          </Card>

          <aside className="grid gap-6 lg:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-[#D9E5D8] bg-[linear-gradient(145deg,#1F4A36_0%,#2F6B4F_100%)] p-6 text-[#F4F8F0] shadow-[0_22px_60px_rgba(31,74,54,0.22)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFE3D6]">{selfAssessment ? "Personal health reminder" : "For family and caregivers"}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-white">{selfAssessment ? "Describe, don't diagnose." : "Observe, don't diagnose."}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#E4F0E5]">{selfAssessment ? "Focus on what you are feeling and when it started. Choose “not sure” if a symptom type is unclear; the detail chips are optional." : "Use the person's behavior, breathing, and visible symptoms as your guide. Choose “not sure” when a type is unclear; the type chips are optional."}</p>
            </div>
            <section
              aria-labelledby="emergency-signs-heading"
              className="relative overflow-hidden rounded-3xl border border-[#E8D6CE] bg-[linear-gradient(145deg,#FFFEFC_0%,#FFF9F6_100%)] p-5 shadow-[0_18px_40px_rgba(107,49,31,0.07)] sm:p-6"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#9B3F2D] via-[#D17A57] to-[#E7C99B]" aria-hidden="true" />
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#EAD2C8] bg-white text-[#9B3F2D] shadow-[0_4px_12px_rgba(107,49,31,0.08)]" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                    <path d="M12 9v4m0 3h.01" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9B3F2D]">Please don’t wait</p>
                  <h2 id="emergency-signs-heading" className="mt-1 font-display text-xl font-semibold leading-tight text-ink">Emergency signs</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">Get urgent medical help if any of these happen:</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3 border-t border-[#EEDFD8] pt-4 text-sm leading-relaxed text-ink-secondary">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#A6402F] ring-4 ring-[#F8E8E1]" aria-hidden="true" />
                  Breathing is difficult, or lips or face look blue.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#A6402F] ring-4 ring-[#F8E8E1]" aria-hidden="true" />
                  Someone is unusually drowsy, confused, hard to wake, or fainting.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B67A25] ring-4 ring-[#F8EEDB]" aria-hidden="true" />
                  Symptoms are getting worse quickly.
                </li>
              </ul>
            </section>
          </aside>
        </div>
  );

  if (embedded) return content;

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain narrow>{content}</PageMain>
    </div>
  );
}
