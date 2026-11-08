"use client";

import { IconChevronDown } from "@/app/components/ui/icons";
import { localizedText, useInterfaceLanguage } from "@/app/components/LanguageProvider";

type FreeTextSymptomToggleProps = {
  expanded: boolean;
  controls: string;
  onToggle: () => void;
};

export default function FreeTextSymptomToggle({
  expanded,
  controls,
  onToggle,
}: FreeTextSymptomToggleProps) {
  const { language } = useInterfaceLanguage();

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      className="group flex min-h-[76px] w-full min-w-0 items-center gap-3 rounded-2xl border border-[#E3EBE1] bg-white/70 px-3 py-3 text-left outline-none transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:bg-white hover:shadow-[0_10px_24px_rgba(31,74,54,0.08)] focus-visible:ring-4 focus-visible:ring-brand/15 sm:gap-4 sm:px-4"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-dark to-brand text-brand-foreground shadow-[0_6px_14px_rgba(31,74,54,0.2)]" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-5.5A7.5 7.5 0 1 1 20 11.5Z" />
          <path d="M8 11h8M8 14h5" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand">
          {localizedText(language, "Optional", "Opsyonal")}
        </span>
        <span className="mt-0.5 block break-words text-sm font-semibold leading-snug text-ink sm:text-base">
          {localizedText(language, "Describe symptoms in your own words", "Ilarawan ang mga sintomas sa sarili mong salita")}
        </span>
        {language === "both" && <span className="mt-0.5 block break-words text-xs leading-relaxed text-ink-muted">
          Ilarawan ang mga sintomas sa sarili mong salita
        </span>}
      </span>
      <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand/15 bg-brand-tint/55 px-3 py-2 text-xs font-semibold text-brand-dark transition-colors group-hover:bg-brand-tint">
        <span className="hidden sm:inline">{expanded
          ? localizedText(language, "Close", "Isara")
          : localizedText(language, "Type symptoms", "I-type ang sintomas")}</span>
        <span className="sm:hidden">{expanded
          ? localizedText(language, "Close", "Isara")
          : localizedText(language, "Type", "I-type")}</span>
        <IconChevronDown
          size={16}
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
