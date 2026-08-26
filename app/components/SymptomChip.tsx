"use client";

type SymptomChipProps = {
  label: string;
  subLabel?: string;
  selected: boolean;
  onToggle: () => void;
};

export default function SymptomChip({ label, subLabel, selected, onToggle }: SymptomChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={[
        "flex flex-col items-start gap-0.5 rounded-lg border px-4 py-3 text-left transition-colors",
        selected
          ? "border-sage bg-sage/10 text-ink"
          : "border-ink/15 bg-paper text-ink hover:border-ink/30",
      ].join(" ")}
    >
      <span className="text-sm font-semibold lg:text-base">{label}</span>
      {subLabel && <span className="text-xs text-ink-faint lg:text-sm">{subLabel}</span>}
    </button>
  );
}