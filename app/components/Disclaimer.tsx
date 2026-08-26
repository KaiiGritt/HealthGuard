export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`rounded-md border border-border bg-surface px-5 py-4 text-base leading-relaxed text-ink-muted ${className}`}
    >
      <span className="font-semibold text-ink-secondary">Important:</span> HealthGuard does
      not provide a medical diagnosis. It gives a preliminary health risk guide only. For
      any medical concern, consult a qualified health worker.
    </p>
  );
}
