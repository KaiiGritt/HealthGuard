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
  const nextSteps: Record<RiskLevel, string> = {
    GREEN: "Home care and monitoring / Pahinga, uminom ng sapat na tubig, at obserbahan ang iyong pakiramdam.",
    YELLOW: "See a Barangay Health Worker or visit the RHU / Kumonsulta sa BHW o pumunta sa RHU.",
    RED: "Go to the nearest hospital now / Pumunta agad sa pinakamalapit na ospital.",
  };
  return (
    <div className={`${level === "RED" ? "relative overflow-hidden rounded-2xl border-2 border-triage-red bg-[linear-gradient(135deg,#B53B2A_0%,#8E2F24_58%,#6F211C_100%)] p-5 text-white shadow-[0_16px_34px_rgba(142,47,36,0.2)] sm:p-7" : `relative overflow-hidden rounded-2xl border-2 ${s.border} ${s.bg} p-5 shadow-[0_12px_28px_rgba(24,38,25,0.06)] sm:p-7`}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${level === "RED" ? "bg-[#FFD2C8]" : level === "YELLOW" ? "bg-[#D98A2B]" : "bg-[#3E8E41]"}`} aria-hidden="true" />
      <div className="flex items-start gap-4">
        <span className={level === "RED" ? "rounded-xl bg-white px-3 py-2 font-mono text-lg font-bold tracking-wide text-triage-red shadow-sm" : "shrink-0"}>
          <TriageBadge level={level} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`font-mono text-xs font-semibold uppercase tracking-[0.12em] ${level === "RED" ? "text-red-100" : s.text}`}>{s.label}</p>
          <h2 className={`mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl ${level === "RED" ? "text-white" : "text-ink"}`}>{message}</h2>
        </div>
      </div>
      <div className={`mt-6 rounded-2xl px-4 py-4 sm:px-5 ${level === "RED" ? "border border-white/30 bg-black/10" : "border border-border/60 bg-white/75"}`}>
        <p className={`font-mono text-xs font-semibold uppercase tracking-[0.1em] ${level === "RED" ? "text-red-100" : "text-ink-muted"}`}>What to do next / Ano ang susunod</p>
        <p className={`mt-2 text-base font-semibold leading-relaxed sm:text-lg ${level === "RED" ? "text-white" : "text-ink-secondary"}`}>{nextSteps[level]}</p>
        {level !== "RED" && <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{recommendation}</p>}
      </div>
    </div>
  );
}
