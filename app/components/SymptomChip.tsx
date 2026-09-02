"use client";

type SymptomChipProps = {
  label: string;
  subLabel?: string;
  selected: boolean;
  urgent?: boolean;
  onToggle: () => void;
};

export default function SymptomChip({ label, subLabel, selected, urgent = false, onToggle }: SymptomChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={[
        "group relative flex min-h-[76px] flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(24,38,25,0.09)] focus-visible:ring-4 focus-visible:ring-brand/15",
        selected
          ? urgent
            ? "border-emergency-red/45 bg-red-tint text-ink shadow-[0_8px_18px_rgba(192,67,43,0.12)]"
            : "border-brand/40 bg-brand/10 text-ink shadow-[0_8px_18px_rgba(47,107,79,0.1)]"
          : urgent
            ? "border-emergency-red/25 bg-red-tint/60 text-ink hover:border-emergency-red/45"
            : "border-ink/15 bg-paper text-ink hover:border-brand/35 hover:bg-brand-tint/60",
      ].join(" ")}
    >
      {selected && <span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${urgent ? "bg-emergency-red" : "bg-brand"}`} aria-hidden="true">✓</span>}
      <span className="pr-6 text-sm font-semibold lg:text-base">{label}</span>
      {subLabel && <span className="pr-6 text-xs text-ink-faint lg:text-sm">{subLabel}</span>}
    </button>
  );
}