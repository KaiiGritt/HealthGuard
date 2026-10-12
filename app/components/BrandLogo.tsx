type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  withText?: boolean;
  dark?: boolean;
  textClassName?: string;
};

export function BrandLogo({
  className = "",
  compact = false,
  withText = false,
  dark = false,
  textClassName = "",
}: BrandLogoProps) {
  const text = (
    <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
      <span className="brand-subtitle block text-[9px] text-slate-500/80">
        Irosin community health
      </span>
      <span className={`brand-wordmark brand-wordmark--tight ${compact ? "text-lg" : "text-[2rem]"} ${textClassName}`}>
        <span className={dark ? "text-white" : "text-slate-900"}>Health</span>
        <span className={dark ? "text-white" : "text-brand-dark"}>Guard</span>
      </span>
    </div>
  );

  return (
    <div className={`flex items-center ${withText ? "gap-3" : "gap-0"} ${className}`}>
      <img
        src="/logo.png"
        alt="HealthGuard logo"
        className={compact ? "h-[42px] w-[42px] shrink-0 object-contain" : "h-[84px] w-[84px] shrink-0 object-contain"}
      />

      {withText ? text : null}
    </div>
  );
}
