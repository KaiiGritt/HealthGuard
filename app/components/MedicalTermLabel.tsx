"use client";

import ResultText from "./ResultText";

export default function MedicalTermLabel({ term }: { term: string }) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded-lg border border-[#E1E9DD] bg-white/75 px-2 py-1 text-[10px] leading-relaxed">
      <ResultText
        className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[#758174]"
        english="Medical term"
        filipino="Terminong medikal"
      />
      <span className="break-words font-medium text-[#52634F]">{term}</span>
    </span>
  );
}
