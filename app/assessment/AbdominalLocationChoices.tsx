"use client";

import { localizedText, useInterfaceLanguage } from "../components/LanguageProvider";
import {
  ABDOMINAL_LOCATION_OPTIONS,
  ABDOMINAL_NOT_SURE_OPTION,
} from "./abdominalLocations";

interface AbdominalLocationChoicesProps {
  selectedValues: readonly string[];
  onToggle: (value: string) => void;
}

export default function AbdominalLocationChoices({
  selectedValues,
  onToggle,
}: AbdominalLocationChoicesProps) {
  const { language } = useInterfaceLanguage();

  const renderChoice = (option: {
    en: string;
    tl: string;
    labelEn?: string;
    labelTl?: string;
    hintEn?: string;
    hintTl?: string;
  }) => {
    const isSelected = selectedValues.includes(option.en);

    return (
      <button
        key={option.en}
        type="button"
        aria-pressed={isSelected}
        onClick={() => onToggle(option.en)}
        className={`group flex min-h-[76px] w-full flex-col justify-center rounded-xl border px-3 py-2.5 text-left text-sm transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 ${
          isSelected
            ? "border-[#1F4A36] bg-[linear-gradient(145deg,#2F6B4F_0%,#1F4A36_100%)] text-white shadow-[0_8px_18px_rgba(31,74,54,0.2)]"
            : "border-[#DCE5D8] bg-white/90 text-ink-secondary shadow-[0_3px_10px_rgba(24,38,25,0.035)] hover:-translate-y-0.5 hover:border-brand/45 hover:bg-white hover:shadow-[0_8px_16px_rgba(31,74,54,0.09)]"
        }`}
      >
        <span className="flex w-full items-center justify-between gap-2 font-semibold">
          <span>
            {localizedText(language, option.labelEn ?? option.en, option.labelTl ?? option.tl)}
          </span>
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] leading-none transition ${
              isSelected
                ? "border-white/55 bg-white/15 text-white"
                : "border-[#CBD8CA] text-transparent group-hover:border-brand/50"
            }`}
            aria-hidden="true"
          >
            ✓
          </span>
        </span>
        {option.hintEn && option.hintTl && (
          <span className={`mt-1 text-xs leading-snug ${isSelected ? "text-white/80" : "text-ink-muted"}`}>
            {localizedText(language, option.hintEn, option.hintTl)}
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      <p className="mb-2 text-xs leading-relaxed text-ink-muted">
        {localizedText(
          language,
          "Choose the matching area. Right and left refer to the person with the pain.",
          "Piliin ang katugmang bahagi. Ang kanan at kaliwa ay batay sa taong may nararamdamang sakit.",
        )}
      </p>
      <div
        role="group"
        aria-label={localizedText(language, "Nine abdominal areas", "Siyam na bahagi ng tiyan")}
        className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-3"
      >
        {ABDOMINAL_LOCATION_OPTIONS.map(renderChoice)}
      </div>
      <div className="mt-3 border-t border-[#E4EBE1] pt-3">
        <p className="mb-2 text-xs leading-relaxed text-ink-muted">
          {localizedText(language, "Can't identify one area?", "Hindi matukoy ang bahagi?")}
        </p>
        {renderChoice(ABDOMINAL_NOT_SURE_OPTION)}
      </div>
    </div>
  );
}
