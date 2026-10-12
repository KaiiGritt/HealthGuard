export default function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-[#D9C886]/80 bg-[linear-gradient(180deg,#FFFDF6_0%,#FBF7E9_100%)] px-4 py-4 text-base leading-relaxed text-ink-muted shadow-[0_10px_26px_rgba(66,56,28,0.08)] sm:px-5 ${className}`}
      role="note"
      aria-label="Important medical disclaimer"
    >
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F5E3A0] text-sm font-bold text-[#5F4A16]" aria-hidden="true">
        !
      </span>
      <p>
        <span className="font-semibold text-ink-secondary">Important:</span> HealthGuard does not
        provide a medical diagnosis. It gives a preliminary health risk guide only. For any medical
        concern, consult a qualified health worker.
      </p>
    </div>
  );
}
