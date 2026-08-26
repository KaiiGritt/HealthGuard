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
    <div className={`${level === "RED" ? "rounded-md border-2 border-triage-red bg-triage-red p-6 text-white sm:p-8" : `rounded-xl border-2 ${s.border} ${s.bg} p-7 sm:p-8`}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className={level === "RED" ? "rounded-sm bg-white px-3 py-2 font-mono text-lg font-bold tracking-wide text-triage-red" : ""}>
          <TriageBadge level={level} />
        </span>
        <div>
          <p className={`font-mono text-sm uppercase tracking-wide ${level === "RED" ? "text-red-100" : s.text}`}>{s.label}</p>
          <h2 className={`mt-2 font-display text-2xl leading-snug sm:text-3xl ${level === "RED" ? "text-white" : "text-ink"}`}>{message}</h2>
        </div>
      </div>
      <div className={`mt-6 rounded-md px-5 py-4 ${level === "RED" ? "border border-white/30 bg-black/10" : "border border-border/60 bg-card/80"}`}>
        <p className={`font-mono text-sm uppercase tracking-wide ${level === "RED" ? "text-red-100" : "text-ink-muted"}`}>What to do next / Ano ang susunod</p>
        <p className={`mt-2 text-lg font-semibold leading-relaxed ${level === "RED" ? "text-white" : "text-ink-secondary"}`}>{nextSteps[level]}</p>
        {level !== "RED" && <p className="mt-2 text-base leading-relaxed text-ink-muted">{recommendation}</p>}
      </div>
    </div>
  );
}
