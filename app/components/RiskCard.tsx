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
  return (
    <div className={`rounded-xl border-2 ${s.border} ${s.bg} p-7 sm:p-8`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <TriageBadge level={level} />
        <div>
          <p className={`font-mono text-sm uppercase tracking-wide ${s.text}`}>{s.label}</p>
          <h2 className="mt-2 font-display text-2xl leading-snug text-ink sm:text-3xl">{message}</h2>
        </div>
      </div>
      <div className="mt-6 rounded-md border border-border/60 bg-card/80 px-5 py-4">
        <p className="font-mono text-sm uppercase tracking-wide text-ink-muted">Recommended action</p>
        <p className="mt-2 text-lg leading-relaxed text-ink-secondary">{recommendation}</p>
      </div>
    </div>
  );
}
