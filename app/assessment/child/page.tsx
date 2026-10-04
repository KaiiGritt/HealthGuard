"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { analyze } from "@/lib/api";
import {
  Card,
  inputClass,
  PageMain,
  PageTitle,
  PremiumSelect,
  submitButtonClass,
  Toast,
} from "@/app/components/ui/primitives";
import PageHeader from "@/app/components/PageHeader";
import SymptomChip from "@/app/components/SymptomChip";
import { IconBrain, IconChevronDown, IconDroplets, IconLungs, IconProfile, IconStomach, IconThermometer } from "@/app/components/ui/icons";
import { useAssessmentMode } from "../AssessmentTargetContext";

const SYMPTOMS = [
  { value: "fever", en: "Fever", tl: "Lagnat", icon: <IconThermometer size={18} /> },
  { value: "cough", en: "Cough", tl: "Ubo", icon: <IconLungs size={18} /> },
  { value: "headache", en: "Headache", tl: "Sakit ng ulo", icon: <IconBrain size={18} /> },
  { value: "abdominal pain", en: "Tummy pain", tl: "Masakit ang tiyan", icon: <IconStomach size={18} /> },
  { value: "vomiting", en: "Vomiting", tl: "Pagsusuka", icon: <IconDroplets size={18} /> },
  { value: "diarrhea", en: "Diarrhea", tl: "Pagtatae", icon: <IconDroplets size={18} /> },
  { value: "difficulty breathing", en: "Breathing difficulty", tl: "Hirap huminga", icon: <IconLungs size={18} /> },
] as const;

const DANGER_SIGNS = [
  { value: "unable to drink", en: "Unable to drink", tl: "Ayaw uminom" },
  { value: "vomits everything", en: "Vomits everything / cannot keep anything down", tl: "Isinusuka ang lahat / hindi mapanatili ang kinain o ininom" },
  { value: "altered consciousness", en: "Very sleepy or difficult to wake", tl: "Sobrang antok o mahirap gisingin" },
  { value: "neurologic emergency", en: "Convulsions", tl: "Kombulsyon" },
] as const;

const TYPE_CHIPS: Record<string, { en: string; tl: string }[]> = {
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
  ],
  "abdominal pain": [
    { en: "Tummy ache", tl: "Masakit ang tiyan" },
    { en: "Upper right abdomen", tl: "Itaas na kanan ng tiyan" },
    { en: "Upper left abdomen", tl: "Itaas na kaliwa ng tiyan" },
    { en: "Lower right abdomen", tl: "Ibabang kanan ng tiyan" },
    { en: "Lower left abdomen", tl: "Ibabang kaliwa ng tiyan" },
    { en: "Lower abdomen", tl: "Ibabang bahagi ng tiyan" },
    { en: "Cramping", tl: "Pamumulikat" },
    { en: "Burning pain", tl: "Mahapding sakit" },
  ],
  vomiting: [
    { en: "Nausea", tl: "Pagduduwal" },
    { en: "Retching", tl: "Pag-uurong-suka" },
    { en: "Vomiting", tl: "Pagsusuka" },
  ],
  diarrhea: [
    { en: "Watery stool", tl: "Tubig ang dumi" },
    { en: "Frequent stool", tl: "Madalas dumumi" },
    { en: "Blood in stool", tl: "Dugo sa dumi" },
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
  { key: "today", en: "Today", tl: "Ngayon", days: 0.5 },
  { key: "few_days", en: "1–2 days", tl: "1–2 araw", days: 1.5 },
  { key: "about_a_week", en: "3–7 days", tl: "3–7 araw", days: 5 },
  { key: "over_a_week", en: "More than a week", tl: "Mahigit isang linggo", days: 10 },
] as const;

type PregnancyStatus = "yes" | "no" | "not_sure" | "prefer_not_to_say";
type AgeUnit = "years" | "months";

export default function PersonAssessmentPage() {
  const router = useRouter();
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
  const validAge = patientAge.trim() !== "" && Number.isInteger(parsedAge) && parsedAge >= 0 && parsedAge <= maxAge;
  const showDangerSignsForAge = validAge && (ageUnit === "months" ? parsedAge <= 96 : parsedAge <= 8);
  const ageInYears = ageUnit === "months" ? Math.floor(parsedAge / 12) : parsedAge;
  const ageUnitLabel = `${ageUnit.slice(0, -1)}${parsedAge === 1 ? "" : "s"}`;
  const selectedDuration = DURATIONS.find((duration) => duration.key === durationKey);
  const canSubmit = Boolean(validAge && (selected.length || otherSymptoms.trim()) && !submitting);
  const hasBreathingDifficulty = selected.includes("difficulty breathing");
  const selectedDangerSigns = DANGER_SIGNS.filter((sign) => selected.includes(sign.value));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const typeText = Object.values(selectedTypes).flat().join(", ");
      const payload = {
        input_text: [
          selfAssessment
            ? `Assessment for myself, aged ${parsedAge} ${ageUnitLabel}.`
            : `Assessment for a person aged ${parsedAge} ${ageUnitLabel}.`,
          otherSymptoms.trim() ? `Additional symptoms: ${otherSymptoms.trim()}` : "",
          typeText ? `Additional symptom details: ${typeText}.` : "",
          selectedDuration ? `Symptoms started ${selectedDuration.en.toLowerCase()} ago.` : "",
        ].filter(Boolean).join(" "),
        selected_symptoms: selected,
        method: "select" as const,
        duration_days: selectedDuration?.days ?? null,
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
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="relative overflow-hidden rounded-3xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">HealthGuard | Personal health check</p>
            <PageTitle subtitle={selfAssessment ? "Describe how you feel and when it started. / Ilarawan ang nararamdaman mo at kung kailan ito nagsimula." : "A simple guide for assessing someone else. / Gabay sa pagsusuri ng ibang tao."}>
              {selfAssessment ? "How are you feeling?" : "Assess someone"}
            </PageTitle>
            {!embedded && (
              <div className="mt-5 flex justify-end">
                <div className="inline-flex rounded-xl border border-[#D8E2D3] bg-white/80 p-1" role="group" aria-label="Assessment type">
                  <Link href="/assessment" className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-ink-secondary transition hover:bg-brand-tint hover:text-brand-dark">For myself / Sarili</Link>
                  <span aria-current="page" className="inline-flex min-h-10 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground">Assess someone / Ibang tao</span>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-3 rounded-2xl border border-[#D9E5D8] bg-brand-tint/55 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm" aria-hidden="true"><IconProfile size={18} /></span>
              <p className="text-base leading-relaxed text-ink-secondary">
                {selfAssessment
                  ? "Choose what you are feeling; you do not need to identify a medical condition."
                  : "You are answering for someone else. Choose what you can observe; you do not need to identify a medical condition."}
                <span className="mt-1 block text-sm text-ink-muted">{selfAssessment ? "Piliin ang mga sintomas na nararamdaman mo. Hindi kailangang tukuyin ang sakit." : "Piliin ang mga sintomas na napapansin mo sa taong sinusuri."}</span>
              </p>
            </div>

            <fieldset className="mt-8 rounded-2xl border border-[#DDE7DB] bg-[linear-gradient(145deg,#FFFFFF_0%,#F7FAF5_100%)] px-4 pb-5 pt-3 shadow-[0_10px_24px_rgba(31,74,54,0.045)] sm:px-5">
              <legend className="px-2 text-base font-semibold text-ink lg:text-lg">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">1</span>
                {selfAssessment ? "About you" : "About the person"} <span className="font-normal text-ink-faint">/ {selfAssessment ? "Tungkol sa iyo" : "Tungkol sa tao"}</span>
              </legend>
              <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="patient-age" className="block text-sm font-medium text-ink-secondary">{selfAssessment ? "Your age / Edad mo" : "Age of the person / Edad"}</label>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
                    <input
                      id="patient-age"
                      name="patient-age"
                      type="number"
                      min={0}
                      max={maxAge}
                      step={1}
                      inputMode="numeric"
                      required
                      value={patientAge}
                      onChange={(event) => setPatientAge(event.currentTarget.value)}
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
                      ariaLabel="Age unit"
                      buttonClassName="min-h-[52px] rounded-xl border-[#CBD8C9] bg-white px-3"
                      options={[
                        { value: "years", label: "Years" },
                        { value: "months", label: "Months" },
                      ]}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">Use months for ages under 8 years. / Para sa edad na wala pang 8 taon, gamitin ang buwan.</p>
                </div>
                <div>
                  <label htmlFor="patient-sex" className="block text-sm font-medium text-ink-secondary">Sex / Kasarian <span className="font-normal text-ink-faint">(optional)</span></label>
                  <PremiumSelect
                    id="patient-sex"
                    value={patientSex}
                    onChange={(value) => {
                      setPatientSex(value);
                      if (value !== "female") setPregnancyStatus("");
                    }}
                    ariaLabel="Sex / Kasarian"
                    className="mt-2"
                    buttonClassName="min-h-[52px] rounded-xl border-[#CBD8C9] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAF7_100%)] px-4 text-base shadow-[0_8px_18px_rgba(24,38,25,0.07)] hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_12px_24px_rgba(24,38,25,0.12)] focus:ring-4 focus:ring-brand/15"
                    options={[
                      { value: "", label: "Choose / Piliin" },
                      { value: "female", label: "Female / Babae" },
                      { value: "male", label: "Male / Lalaki" },
                    ]}
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">Optional; does not change urgency / Opsyonal; hindi nito binabago ang antas ng panganib.</p>
                </div>
                {patientSex === "female" && <div>
                  <label htmlFor="pregnancy-status" className="block text-sm font-medium text-ink-secondary">Pregnancy / Pagbubuntis <span className="font-normal text-ink-faint">(optional)</span></label>
                  <PremiumSelect
                    id="pregnancy-status"
                    value={pregnancyStatus}
                    onChange={(value) => setPregnancyStatus(value as PregnancyStatus | "")}
                    ariaLabel="Pregnancy / Pagbubuntis"
                    className="mt-2"
                    buttonClassName="min-h-[52px] rounded-xl border-[#CBD8C9] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAF7_100%)] px-4 text-base shadow-[0_8px_18px_rgba(24,38,25,0.07)] hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-[0_12px_24px_rgba(24,38,25,0.12)] focus:ring-4 focus:ring-brand/15"
                    options={[
                      { value: "", label: "Choose / Piliin" },
                      { value: "yes", label: "Yes / Oo" },
                      { value: "no", label: "No / Hindi" },
                      { value: "not_sure", label: "Not sure / Hindi sigurado" },
                      { value: "prefer_not_to_say", label: "Prefer not to say / Ayaw sabihin" },
                    ]}
                  />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">A reported pregnancy with fever prompts health-worker review. / Kung may lagnat habang buntis, kumonsulta sa health worker.</p>
                </div>}
              </div>
            </fieldset>

            <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">2</span>
              {selfAssessment ? "What do you feel?" : "What do you notice?"} <span className="font-normal text-ink-faint">/ {selfAssessment ? "Ano ang nararamdaman mo?" : "Ano ang napapansin mo?"}</span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {SYMPTOMS.map((symptom) => (
                <SymptomChip key={symptom.value} label={symptom.en} subLabel={symptom.tl} icon={symptom.icon} selected={selected.includes(symptom.value)} urgent={symptom.value === "difficulty breathing"} onToggle={() => toggleSymptom(symptom.value)} />
              ))}
            </div>
            <div className="mt-6">
              <button
                type="button"
                aria-expanded={showOtherSymptoms}
                aria-controls="other-symptoms-panel"
                onClick={() => setShowOtherSymptoms((visible) => !visible)}
                className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-brand underline decoration-brand/40 underline-offset-4 transition hover:text-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
              >
                {showOtherSymptoms ? "Hide text entry / Itago" : "Prefer to type instead? / Mas gustong mag-type?"}
                <IconChevronDown size={16} className={`transition-transform ${showOtherSymptoms ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <div id="other-symptoms-panel" hidden={!showOtherSymptoms} className="mt-3">
                <label htmlFor="other-symptoms" className="block text-sm font-semibold text-ink">
                  Other symptoms / Iba pang sintomas
                </label>
                <textarea
                  id="other-symptoms"
                  value={otherSymptoms}
                  onChange={(event) => setOtherSymptoms(event.target.value)}
                  rows={3}
                  placeholder="Describe any other symptoms / Ilarawan ang iba pang sintomas"
                  className={`mt-2 min-h-24 resize-y bg-white/80 ${inputClass}`}
                />
              </div>
            </div>
            {showDangerSignsForAge && <div className="mt-6 overflow-hidden rounded-2xl border border-red-200 bg-red-50/70">
              <button
                type="button"
                aria-expanded={showDangerSigns}
                aria-controls="child-danger-signs"
                onClick={() => setShowDangerSigns((open) => !open)}
                className="flex min-h-[60px] w-full items-center justify-between gap-4 px-4 py-3 text-left outline-none transition hover:bg-red-100/60 focus-visible:ring-4 focus-visible:ring-red-800/15"
              >
                <span>
                  <span className="block text-sm font-semibold text-red-900">General danger signs in children / Mga pangkalahatang senyales ng panganib sa bata</span>
                  {selectedDangerSigns.length > 0 && (
                    <span className="mt-1 block text-xs font-medium text-red-800">{selectedDangerSigns.length} selected / Napili</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-red-800">
                  {showDangerSigns ? "Hide / Itago" : "Show / Ipakita"}
                  <IconChevronDown size={17} className={`transition-transform duration-200 ${showDangerSigns ? "rotate-180" : ""}`} aria-hidden="true" />
                </span>
              </button>
              <div id="child-danger-signs" hidden={!showDangerSigns} className="border-t border-red-200 px-4 pb-4">
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {DANGER_SIGNS.map((sign) => {
                    const active = selected.includes(sign.value);
                    return (
                      <button key={sign.value} type="button" aria-pressed={active} onClick={() => toggleSymptom(sign.value)} className={`rounded-xl border px-3 py-2 text-left text-sm ${active ? "border-red-800 bg-red-800 text-white" : "border-red-200 bg-white text-red-900"}`}>
                        <span className="block font-semibold">{sign.en}</span>
                        <span className={`block text-xs ${active ? "text-red-100" : "text-red-700"}`}>{sign.tl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>}

            {hasBreathingDifficulty && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900">
                <span className="font-semibold">{selfAssessment ? "If you are struggling to breathe, do not wait for this assessment." : "If the person is struggling to breathe, do not wait for this assessment."}</span> Go to the nearest hospital or call emergency services.
                <span className="mt-1 block text-red-800">Kung hirap huminga, pumunta agad sa ospital o tumawag sa emergency.</span>
              </div>
            )}

            {selected.some((symptom) => (TYPE_CHIPS[symptom] ?? []).length > 0) && (
              <section className="relative mt-8 overflow-hidden rounded-2xl border border-[#D3E0D2] bg-[linear-gradient(145deg,#F9FCF8_0%,#F1F6EF_100%)] p-4 shadow-[0_14px_30px_rgba(31,74,54,0.07)] sm:p-5" aria-labelledby="person-type-heading">
                <div className="relative flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground">3</span>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Optional details</p>
                    <h2 id="person-type-heading" className="mt-1 text-base font-semibold text-ink lg:text-lg">What kind of symptom is it?</h2>
                    <p className="mt-1 text-sm text-ink-muted">Anong uri ng sintomas ito?</p>
                  </div>
                </div>
                <div className="relative mt-4 space-y-4 border-t border-[#DCE7DA] pt-4">
                  {selected.map((symptom) => {
                    const options = TYPE_CHIPS[symptom] ?? [];
                    if (!options.length) return null;
                    const label = SYMPTOMS.find((item) => item.value === symptom);
                    return (
                      <div key={symptom}>
                        <p className="text-sm font-semibold text-ink">{label?.en} <span className="font-normal text-ink-faint">/ {label?.tl}</span></p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {options.map((type) => {
                            const active = selectedTypes[symptom]?.includes(type.en) ?? false;
                            return (
                              <button key={type.en} type="button" aria-pressed={active} onClick={() => toggleType(symptom, type.en)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-[#DCE5D8] bg-white/85 text-ink-secondary hover:border-brand/50"}`}>
                                <span className="block font-semibold">{type.en}</span>
                                <span className={`block text-xs ${active ? "text-brand-foreground/80" : "text-ink-faint"}`}>{type.tl}</span>
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

            <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">4</span>
              When did it start? <span className="font-normal text-ink-faint">/ Kailan nagsimula? (optional)</span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DURATIONS.map((duration) => {
                const active = durationKey === duration.key;
                return (
                  <button key={duration.key} type="button" onClick={() => setDurationKey(active ? null : duration.key)} className={`rounded-2xl border px-3 py-3 text-center text-sm transition ${active ? "border-brand bg-brand text-brand-foreground shadow-sm" : "border-border-soft bg-white/80 text-ink-secondary hover:border-brand/50"}`}>
                    <span className="block font-medium">{duration.en}</span>
                    <span className={`block text-xs ${active ? "text-brand-foreground/80" : "text-ink-faint"}`}>{duration.tl}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              {!embedded && <button type="button" onClick={() => router.back()} className="min-h-11 rounded-xl border border-border bg-white px-5 font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark">Back</button>}
              <button type="button" onClick={handleSubmit} disabled={!canSubmit} className={`bg-gradient-to-r from-brand to-brand-dark shadow-[0_14px_28px_rgba(31,74,54,0.2)] sm:min-w-56 ${submitButtonClass}`}>
                {submitting ? "Checking…" : selfAssessment ? "Get my assessment" : "Assess person"}
              </button>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">This is a preliminary risk guide, not a diagnosis. For urgent concerns, contact a qualified health worker.</p>
            {toast && <Toast message={toast} tone="error" onDismiss={() => setToast(null)} />}
          </Card>

          <aside className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-[#D9E5D8] bg-[linear-gradient(145deg,#1F4A36_0%,#2F6B4F_100%)] p-6 text-[#F4F8F0] shadow-[0_22px_60px_rgba(31,74,54,0.22)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFE3D6]">{selfAssessment ? "Personal health reminder" : "For family and caregivers"}</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-white">{selfAssessment ? "Describe, don't diagnose." : "Observe, don't diagnose."}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#E4F0E5]">{selfAssessment ? "Focus on what you are feeling and when it started. Choose “not sure” if a symptom type is unclear; the detail chips are optional." : "Use the person's behavior, breathing, and visible symptoms as your guide. Choose “not sure” when a type is unclear; the type chips are optional."}</p>
            </div>
            <div className="rounded-3xl border border-border-soft bg-card p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Emergency signs</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emergency-red" />Struggling to breathe or lips look blue.</li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emergency-red" />{selfAssessment ? "You feel very sleepy, confused, or faint." : "The person is difficult to wake, confused, or fainting."}</li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-warn-amber" />Symptoms are getting worse quickly.</li>
              </ul>
            </div>
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
