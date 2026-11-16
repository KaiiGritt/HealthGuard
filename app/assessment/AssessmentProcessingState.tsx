"use client";

import type { InterfaceLanguage } from "@/app/components/LanguageProvider";
import { localizedText } from "@/app/components/LanguageProvider";

export default function AssessmentProcessingState({
  language,
}: {
  language: InterfaceLanguage;
}) {
  return (
    <section
      className="mx-auto w-full max-w-3xl py-8 text-center sm:py-12"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/15 bg-brand-tint text-brand shadow-[0_8px_24px_rgba(47,107,79,0.1)] sm:h-20 sm:w-20">
        <svg viewBox="0 0 24 24" fill="none" className="h-9 w-9 motion-safe:animate-pulse sm:h-11 sm:w-11" aria-hidden="true">
          <path
            d="M20.8 8.7c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.7 4.7 0 0 1 8.8-2.2 4.7 4.7 0 0 1 8.8 2.2Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M5.5 12h3l1.5-3 2.3 6 1.7-3h4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        {localizedText(language, "HealthGuard assessment", "Pagsusuri ng HealthGuard")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        {localizedText(language, "Reviewing your reported symptoms", "Sinusuri ang mga iniulat mong sintomas")}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-secondary sm:text-lg">
        {localizedText(
          language,
          "We’re checking your responses against the supported symptom guidance and preparing your assessment. This is not a diagnosis.",
          "Inihahambing ang iyong mga sagot sa gabay para sa mga sintomas at inihahanda ang resulta. Hindi ito diagnosis.",
        )}
      </p>
      <div
        className="mx-auto mt-8 h-2 w-full max-w-lg overflow-hidden rounded-full bg-[#E5EEE2]"
        role="progressbar"
        aria-label={localizedText(language, "Assessment processing", "Pinoproseso ang pagsusuri")}
        aria-valuetext={localizedText(language, "In progress", "Isinasagawa")}
      >
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-dark via-brand to-[#C7B37A] motion-safe:animate-[assessment-progress_1.6s_ease-in-out_infinite]" />
      </div>
      <p className="mt-4 text-sm font-medium text-ink-muted">
        {localizedText(language, "Please wait while we prepare your result.", "Maghintay habang inihahanda ang resulta.")}
      </p>
    </section>
  );
}
