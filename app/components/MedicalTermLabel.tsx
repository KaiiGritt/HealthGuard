"use client";

import ResultText from "./ResultText";

export default function MedicalTermLabel({ term }: { term: string }) {
  return (
    <span className="block text-[10px] leading-relaxed text-ink-faint">
      <ResultText english={`Medical term: ${term}`} filipino={`Terminong medikal: ${term}`} />
    </span>
  );
}
