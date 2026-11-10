"use client";

import { localizedText, useInterfaceLanguage, type InterfaceLanguage } from "../components/LanguageProvider";

export const PAIN_SCALE_SYMPTOMS = [
  "headache",
  "abdominal pain",
  "muscle ache / body soreness",
] as const;

const PAIN_LEVELS = [
  { value: 0, emoji: "😄" },
  { value: 1, emoji: "😊" },
  { value: 2, emoji: "🙂" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "😕" },
  { value: 5, emoji: "🙁" },
  { value: 6, emoji: "😟" },
  { value: 7, emoji: "😣" },
  { value: 8, emoji: "😖" },
  { value: 9, emoji: "😫" },
  { value: 10, emoji: "😭" },
] as const;

const getPainSeverity = (value: number, language: InterfaceLanguage) => {
  const labels = value === 0
    ? ["No pain", "Walang sakit"]
    : value <= 3
      ? ["Mild pain", "Banayad na sakit"]
      : value <= 6
        ? ["Moderate pain", "Katamtamang sakit"]
        : value <= 9
          ? ["Severe pain", "Matinding sakit"]
          : ["Worst imaginable pain", "Pinakamatinding sakit na maiisip"];
  return localizedText(language, labels[0], labels[1]);
};

const getSeverityClasses = (value: number) => {
  if (value === 0) return "border-[#BFD8C3] bg-[#EDF6EE] text-[#28583C]";
  if (value <= 3) return "border-[#C8DDC6] bg-[#F0F7ED] text-[#315D3E]";
  if (value <= 6) return "border-[#E8D6A9] bg-[#FBF5E8] text-[#795A20]";
  return "border-[#E8C8BE] bg-[#FCF0EC] text-[#8D3E30]";
};

type PainScaleProps = {
  items: { key: string; label: string }[];
  values: Record<string, number>;
  onSelect: (key: string, value: number) => void;
};

export default function PainScale({ items, values, onSelect }: PainScaleProps) {
  const { language } = useInterfaceLanguage();

  if (items.length === 0) return null;

  return (
    <section className="relative mt-7 overflow-hidden rounded-[26px] border border-[#D5E2D3] bg-[linear-gradient(145deg,#FFFFFF_0%,#F7FAF5_48%,#EEF4EC_100%)] p-4 shadow-[0_20px_48px_rgba(31,74,54,0.09)] ring-1 ring-white/80 sm:p-6" aria-labelledby="pain-scale-heading">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#183D2D] via-[#4D8061] to-[#C7B37A]" aria-hidden="true" />
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#DCE7D9] bg-white text-2xl shadow-[0_6px_16px_rgba(31,74,54,0.08)]" aria-hidden="true">🩺</span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
            {localizedText(language, "Pain check-in", "Pagsusuri ng sakit")}
          </p>
          <h2 id="pain-scale-heading" className="mt-0.5 text-lg font-semibold leading-snug text-ink sm:text-xl">
            {localizedText(language, "How intense is the pain?", "Gaano katindi ang sakit?")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
            {localizedText(language, "Rate the intensity of each pain-related symptom. This step is optional.", "Tukuyin ang tindi ng bawat sintomas na may kaugnayan sa pananakit. Opsyonal ang hakbang na ito.")}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full border border-[#D9E5D6] bg-white/80 px-3 py-1.5 text-xs font-semibold text-ink-secondary sm:inline-flex">
          {localizedText(language, "0–10 scale", "Sukat na 0–10")}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const value = values[item.key];
          const selectedLevel = value === undefined ? undefined : PAIN_LEVELS[value];
          const descriptionId = `pain-level-description-${item.key.replace(/[^a-z0-9-]/gi, "-")}`;

          return (
            <fieldset key={item.key} className="min-w-0 rounded-2xl border border-[#E1E9DE] bg-white/75 p-3 shadow-[0_4px_14px_rgba(24,38,25,0.035)] sm:p-4">
              <legend className="text-sm font-semibold text-ink">{item.label}</legend>
              <div className="mt-1 flex min-h-11 flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-ink-muted">{localizedText(language, "Select a score from 0 to 10", "Pumili ng puntos mula 0 hanggang 10")}</span>
                {selectedLevel && (
                  <span role="status" aria-live="polite" className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-sm ${getSeverityClasses(value)}`}>
                    <span className="text-xl leading-none" aria-hidden="true">{selectedLevel.emoji}</span>
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold leading-none tabular-nums">{value}</span>
                      <span className="text-xs font-semibold opacity-80">/10</span>
                      <span className="ml-1 text-sm font-bold">{getPainSeverity(value, language)}</span>
                    </span>
                  </span>
                )}
              </div>
              <p id={descriptionId} className="sr-only">
                {localizedText(language, `Choose a pain score from 0 to 10 for ${item.label}.`, `Pumili ng antas ng sakit mula 0 hanggang 10 para sa ${item.label}.`)}
                {value !== undefined && ` ${localizedText(language, `Current score: ${value} out of 10, ${getPainSeverity(value, language)}.`, `Kasalukuyang puntos: ${value} sa 10, ${getPainSeverity(value, language)}.`)}`}
              </p>
              <div className="mt-3 grid grid-cols-6 gap-1.5 min-[400px]:gap-2 min-[640px]:grid-cols-11">
                {PAIN_LEVELS.map((level) => {
                  const selected = value === level.value;
                  const severity = getPainSeverity(level.value, language);
                  const accessibleLabel = `${item.label}: ${level.value} out of 10, ${severity}`;

                  return (
                    <button
                      key={level.value}
                      type="button"
                      aria-label={accessibleLabel}
                      aria-describedby={descriptionId}
                      aria-pressed={selected}
                      title={accessibleLabel}
                      onClick={() => onSelect(item.key, level.value)}
                      className={`group flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(31,74,54,0.09)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 motion-reduce:transform-none motion-reduce:transition-none ${selected ? `scale-[1.04] shadow-[0_7px_16px_rgba(31,74,54,0.12)] ${getSeverityClasses(level.value)}` : "border-[#E3EAE0] bg-white text-ink-secondary hover:border-brand/40"}`}
                    >
                      <span className={`text-xl leading-none transition-transform duration-150 group-hover:scale-110 sm:text-[22px] ${selected ? "scale-110" : ""}`} aria-hidden="true">{level.emoji}</span>
                      <span className={`inline-flex min-w-7 items-center justify-center rounded-md border px-1 py-0.5 text-sm font-bold leading-none tabular-nums transition-colors ${selected ? "border-current/20 bg-white/80 text-ink" : "border-transparent text-ink-secondary"}`}>{level.value}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between px-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                <span>{localizedText(language, "No pain", "Walang sakit")}</span>
                <span>{localizedText(language, "Worst imaginable pain", "Pinakamatinding sakit na maiisip")}</span>
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
