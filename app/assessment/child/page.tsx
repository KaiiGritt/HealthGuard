"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { analyze } from "@/lib/api";
import {
  Card,
  PageMain,
  PageTitle,
  submitButtonClass,
  Toast,
} from "@/app/components/ui/primitives";
import PageHeader from "@/app/components/PageHeader";
import SymptomChip from "@/app/components/SymptomChip";
import { IconBrain, IconDroplets, IconLungs, IconStomach, IconThermometer } from "@/app/components/ui/icons";

const AGE_GROUPS = [
  { key: "infant", label: "Infant", tl: "Sanggol", age: 1 },
  { key: "toddler", label: "1–3 years", tl: "1–3 taong gulang", age: 2 },
  { key: "child", label: "4–12 years", tl: "4–12 taong gulang", age: 8 },
  { key: "teen", label: "13–17 years", tl: "13–17 taong gulang", age: 15 },
] as const;

const SYMPTOMS = [
  { value: "fever", en: "Fever", tl: "Lagnat", icon: <IconThermometer size={18} /> },
  { value: "cough", en: "Cough", tl: "Ubo", icon: <IconLungs size={18} /> },
  { value: "headache", en: "Headache", tl: "Sakit ng ulo", icon: <IconBrain size={18} /> },
  { value: "abdominal pain", en: "Tummy pain", tl: "Masakit ang tiyan", icon: <IconStomach size={18} /> },
  { value: "vomiting", en: "Vomiting", tl: "Pagsusuka", icon: <IconDroplets size={18} /> },
  { value: "diarrhea", en: "Diarrhea", tl: "Pagtatae", icon: <IconDroplets size={18} /> },
  { value: "difficulty breathing", en: "Breathing difficulty", tl: "Hirap huminga", icon: <IconLungs size={18} /> },
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
    { en: "Around one eye", tl: "Sa paligid ng isang mata" },
  ],
  "abdominal pain": [
    { en: "Tummy ache", tl: "Masakit ang tiyan" },
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
  ],
  "difficulty breathing": [
    { en: "Shortness of breath", tl: "Kapos sa paghinga" },
    { en: "Wheezing", tl: "May huni ang paghinga" },
    { en: "Chest tightness", tl: "Paninikip ng dibdib" },
    { en: "Cannot breathe deeply", tl: "Hindi makahinga nang malalim" },
  ],
};

const DURATIONS = [
  { key: "today", en: "Today", tl: "Ngayon", days: 0.5 },
  { key: "few_days", en: "1–2 days", tl: "1–2 araw", days: 1.5 },
  { key: "about_a_week", en: "3–7 days", tl: "3–7 araw", days: 5 },
  { key: "over_a_week", en: "More than a week", tl: "Mahigit isang linggo", days: 10 },
] as const;

export default function ChildAssessmentPage() {
  const router = useRouter();
  const [ageKey, setAgeKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string[]>>({});
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

  const selectedAge = AGE_GROUPS.find((group) => group.key === ageKey);
  const selectedDuration = DURATIONS.find((duration) => duration.key === durationKey);
  const canSubmit = Boolean(ageKey && selected.length && !submitting);
  const hasBreathingDifficulty = selected.includes("difficulty breathing");

  async function handleSubmit() {
    if (!canSubmit || !selectedAge) return;
    setSubmitting(true);
    try {
      const typeText = Object.values(selectedTypes).flat().join(", ");
      const payload = {
        input_text: [
          "Child assessment.",
          typeText ? `Additional symptom details: ${typeText}.` : "",
          selectedDuration ? `Symptoms started ${selectedDuration.en.toLowerCase()} ago.` : "",
        ].filter(Boolean).join(" "),
        selected_symptoms: selected,
        method: "select" as const,
        duration_days: selectedDuration?.days ?? null,
        age: selectedAge.age,
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

  return (
    <div className="premium-page min-h-screen">
      <PageHeader />
      <PageMain narrow>
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="relative overflow-hidden rounded-3xl border border-[#DDE7DB] bg-[linear-gradient(135deg,#FFFFFF_0%,#FBFCF9_58%,#F1F5EE_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.09)]">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#183D2D] via-[#2E6A52] to-[#C7B37A]" aria-hidden="true" />
            <PageTitle subtitle="A simple guide for parents and guardians. / Gabay para sa magulang o tagapag-alaga.">
              Assess a child
            </PageTitle>
            <div className="mt-4">
              <Link
                href="/assessment"
                className="text-sm font-semibold text-brand underline decoration-brand/35 underline-offset-4 transition hover:text-brand-dark"
              >
                Back to main assessment / Bumalik sa pangunahing pagsusuri
              </Link>
            </div>

            <div className="mt-8 flex gap-3 rounded-2xl border border-[#D9E5D8] bg-brand-tint/55 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground" aria-hidden="true">P</span>
              <p className="text-base leading-relaxed text-ink-secondary">
                You are answering for a child. Choose what you can observe; you do not need to identify a medical condition.
                <span className="mt-1 block text-sm text-ink-muted">Sumagot para sa bata. Piliin ang mga sintomas na napapansin mo.</span>
              </p>
            </div>

            <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">1</span>
              How old is the child? <span className="font-normal text-ink-faint">/ Ilang taon ang bata?</span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AGE_GROUPS.map((group) => {
                const active = ageKey === group.key;
                return (
                  <button key={group.key} type="button" onClick={() => setAgeKey(active ? null : group.key)} className={`rounded-2xl border px-3 py-3 text-center transition ${active ? "border-brand bg-brand text-brand-foreground shadow-[0_8px_18px_rgba(31,74,54,0.16)]" : "border-border-soft bg-white/80 text-ink-secondary hover:border-brand/50"}`}>
                    <span className="block text-sm font-semibold">{group.label}</span>
                    <span className={`block text-xs ${active ? "text-brand-foreground/80" : "text-ink-faint"}`}>{group.tl}</span>
                  </button>
                );
              })}
            </div>

            <label className="mt-10 flex items-center gap-2 text-base font-semibold text-ink lg:text-lg">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-sm text-brand-foreground">2</span>
              What do you notice? <span className="font-normal text-ink-faint">/ Ano ang napapansin mo?</span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {SYMPTOMS.map((symptom) => (
                <SymptomChip key={symptom.value} label={symptom.en} subLabel={symptom.tl} icon={symptom.icon} selected={selected.includes(symptom.value)} urgent={symptom.value === "difficulty breathing"} onToggle={() => toggleSymptom(symptom.value)} />
              ))}
            </div>

            {hasBreathingDifficulty && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-900">
                <span className="font-semibold">If the child is struggling to breathe, do not wait for this assessment.</span> Go to the nearest hospital or call emergency services.
                <span className="mt-1 block text-red-800">Kung hirap huminga ang bata, pumunta agad sa ospital o tumawag sa emergency.</span>
              </div>
            )}

            {selected.some((symptom) => (TYPE_CHIPS[symptom] ?? []).length > 0) && (
              <section className="relative mt-8 overflow-hidden rounded-2xl border border-[#D3E0D2] bg-[linear-gradient(145deg,#F9FCF8_0%,#F1F6EF_100%)] p-4 shadow-[0_14px_30px_rgba(31,74,54,0.07)] sm:p-5" aria-labelledby="child-type-heading">
                <div className="relative flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-foreground">3</span>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">Optional details</p>
                    <h2 id="child-type-heading" className="mt-1 text-base font-semibold text-ink lg:text-lg">What kind of symptom is it?</h2>
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
              <button type="button" onClick={() => router.back()} className="min-h-11 rounded-xl border border-border bg-white px-5 font-semibold text-ink-secondary transition hover:border-brand/40 hover:text-brand-dark">Back</button>
              <button type="button" onClick={handleSubmit} disabled={!canSubmit} className={`bg-gradient-to-r from-brand to-brand-dark shadow-[0_14px_28px_rgba(31,74,54,0.2)] sm:min-w-56 ${submitButtonClass}`}>
                {submitting ? "Checking…" : "Assess child"}
              </button>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">This is a preliminary risk guide, not a diagnosis. For urgent concerns, contact a qualified health worker.</p>
            {toast && <Toast message={toast} tone="error" onDismiss={() => setToast(null)} />}
          </Card>

          <aside className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-[#D9E5D8] bg-[linear-gradient(145deg,#1F4A36_0%,#2F6B4F_100%)] p-6 text-[#F4F8F0] shadow-[0_22px_60px_rgba(31,74,54,0.22)]">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CFE3D6]">For parents and guardians</p>
              <h2 className="mt-3 font-display text-2xl font-semibold leading-tight text-white">Observe, don&apos;t diagnose.</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#E4F0E5]">Use the child&apos;s behavior, breathing, and visible symptoms as your guide. Choose “not sure” in your own mind when a type is unclear; the type chips are optional.</p>
            </div>
            <div className="rounded-3xl border border-border-soft bg-card p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Emergency signs</p>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-secondary">
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emergency-red" />Struggling to breathe or lips look blue.</li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-emergency-red" />Child is difficult to wake, confused, or fainting.</li>
                <li className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-warn-amber" />Symptoms are getting worse quickly.</li>
              </ul>
            </div>
          </aside>
        </div>
      </PageMain>
    </div>
  );
}
