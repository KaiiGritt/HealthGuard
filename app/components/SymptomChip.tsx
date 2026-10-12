"use client";

import type { ReactNode } from "react";

type SymptomChipProps = {
  label: string;
  icon?: ReactNode;
  subLabel?: string;
  selected: boolean;
  onToggle: () => void;
};

export default function SymptomChip({ label, icon, subLabel, selected, onToggle }: SymptomChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={[
        "group relative flex min-h-[68px] min-w-0 flex-col items-start gap-0.5 overflow-hidden rounded-2xl border px-3 py-2.5 text-left outline-none transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(24,38,25,0.10)] active:translate-y-0 active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-brand/20 motion-reduce:transition-none sm:min-h-[76px] sm:px-4 sm:py-3",
        selected
          ? "border-brand/35 bg-[linear-gradient(135deg,#F0F7EF_0%,#E7F1E6_100%)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(47,107,79,0.10)] hover:border-brand/50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_14px_28px_rgba(47,107,79,0.15)]"
          : "border-[#DCE4D9] bg-[linear-gradient(145deg,#FFFFFF_0%,#FAFCF8_100%)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_10px_rgba(24,38,25,0.035)] hover:border-brand/30 hover:bg-[linear-gradient(145deg,#FFFFFF_0%,#F2F7F0_100%)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_24px_rgba(47,107,79,0.10)]",
      ].join(" ")}
    >
      <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-80" aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_48%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
      {selected && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-[0_2px_6px_rgba(47,107,79,0.3)]" aria-hidden="true">✓</span>}
      <span className="relative flex min-w-0 items-center gap-2 pr-6 text-sm font-semibold lg:text-base">
        {icon ? <span className="text-brand transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none" aria-hidden="true">{icon}</span> : null}
        {label}
      </span>
      {subLabel && <span className="relative break-words pr-6 text-xs text-ink-faint lg:text-sm">{subLabel}</span>}
    </button>
  );
}