"use client";

import ResultText from "@/app/components/ResultText";
import type { RiskLevel } from "@/lib/api";
import { TriageBadge } from "@/app/components/ui/primitives";

const STYLES: Record<
  RiskLevel,
  { border: string; bg: string; text: string; label: string }
> = {
  GREEN: {
    border: "border-triage-green",
    bg: "bg-green-tint",
    text: "text-triage-green",
    label: "Low Risk",
  },
  YELLOW: {
    border: "border-triage-yellow",
    bg: "bg-yellow-tint",
    text: "text-triage-yellow",
    label: "Moderate Risk",
  },
  RED: {
    border: "border-triage-red",
    bg: "bg-red-tint",
    text: "text-triage-red",
    label: "High Risk — Urgent",
  },
};

export default function RiskCard({
  level,
  message,
  recommendation,
}: {
  level: RiskLevel;
  message: string;
  recommendation: string;
}) {
  const s = STYLES[level];
  const labels: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: { en: "Low Risk", fil: "Mababang Panganib" },
    YELLOW: { en: "Moderate Risk", fil: "Katamtamang Panganib" },
    RED: { en: "High Risk — Urgent", fil: "Mataas na Panganib — Agaran" },
  };
  const nextSteps: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: { en: "Home care and monitoring", fil: "Pangangalaga sa bahay at pagmamasid" },
    YELLOW: { en: "See a Barangay Health Worker or visit the RHU", fil: "Kumonsulta sa Barangay Health Worker o pumunta sa RHU" },
    RED: { en: "Go to the nearest hospital now", fil: "Pumunta agad sa pinakamalapit na ospital" },
  };
  const messages: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: { en: "Your symptoms appear mild.", fil: "Mukhang banayad ang iyong mga sintomas." },
    YELLOW: { en: "You may need a consultation.", fil: "Maaaring kailangan mong kumonsulta." },
    RED: { en: "Seek immediate medical attention.", fil: "Humingi agad ng tulong medikal." },
  };
  const recommendations: Record<RiskLevel, { en: string; fil: string }> = {
    GREEN: {
      en: "Rest, stay hydrated, and monitor your symptoms. Seek help if they worsen.",
      fil: "Magpahinga, uminom ng sapat na tubig, at obserbahan ang mga sintomas. Humingi ng tulong kung lumala ang mga ito.",
    },
    YELLOW: {
      en: "Contact your Barangay Health Worker or visit the Rural Health Unit (RHU).",
      fil: "Makipag-ugnayan sa Barangay Health Worker o pumunta sa Rural Health Unit (RHU).",
    },
    RED: {
      en: "Go to the nearest hospital or call emergency services now. Do not delay.",
      fil: "Pumunta agad sa pinakamalapit na ospital o tumawag sa emergency services. Huwag magpatumpik-tumpik.",
    },
  };
  return (
    <div className={`${level === "RED" ? "relative overflow-hidden rounded-3xl border border-[#B53B2A] bg-[linear-gradient(135deg,#B53B2A_0%,#8E2F24_58%,#6F211C_100%)] p-4 text-white shadow-[0_18px_42px_rgba(142,47,36,0.2)] sm:p-6" : `relative overflow-hidden rounded-3xl border ${s.border} ${s.bg} p-4 shadow-[0_14px_34px_rgba(24,38,25,0.07)] sm:p-6`}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${level === "RED" ? "bg-[#FFD2C8]" : level === "YELLOW" ? "bg-[#D98A2B]" : "bg-[#3E8E41]"}`} aria-hidden="true" />
      <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
        <span className={level === "RED" ? "shrink-0 rounded-xl bg-white p-2 shadow-sm sm:p-2.5" : "shrink-0 rounded-xl border border-black/5 bg-white/75 p-2 shadow-[0_3px_10px_rgba(24,38,25,0.06)] sm:p-2.5"}>
          <TriageBadge level={level} />
        </span>
        <div className="min-w-0 flex-1">
          <ResultText as="p" className={`font-mono text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs ${level === "RED" ? "text-red-100" : s.text}`} english={labels[level].en} filipino={labels[level].fil} />
          <ResultText as="h2" className={`mt-1.5 font-display text-xl font-semibold leading-snug sm:mt-2 sm:text-2xl lg:text-3xl ${level === "RED" ? "text-white" : "text-ink"}`} english={messages[level]?.en ?? message} filipino={messages[level]?.fil ?? message} />
        </div>
      </div>
      <div className={`relative mt-5 rounded-2xl px-4 py-4 sm:mt-6 sm:px-5 sm:py-5 ${level === "RED" ? "border border-white/30 bg-black/10" : "border border-black/5 bg-white/80 shadow-[0_5px_16px_rgba(24,38,25,0.04)]"}`}>
        <ResultText as="p" className={`font-mono text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-xs ${level === "RED" ? "text-red-100" : "text-ink-muted"}`} english="What to do next" filipino="Ano ang susunod na gagawin" />
        <ResultText as="p" className={`mt-2 text-base font-semibold leading-relaxed sm:text-lg ${level === "RED" ? "text-white" : "text-ink-secondary"}`} english={nextSteps[level].en} filipino={nextSteps[level].fil} />
        {level !== "RED" && <ResultText as="p" className="mt-2 border-t border-border/60 pt-2 text-sm leading-relaxed text-ink-muted sm:mt-3 sm:pt-3 sm:text-base" english={recommendation || recommendations[level].en} filipino={recommendations[level].fil} />}
      </div>
    </div>
  );
}
