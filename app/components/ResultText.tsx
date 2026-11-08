"use client";

import { useInterfaceLanguage } from "./LanguageProvider";

type ResultTextProps = {
  english: string;
  filipino: string;
  className?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  role?: "status" | "note";
};

export default function ResultText({
  english,
  filipino,
  className,
  as = "span",
  role,
}: ResultTextProps) {
  const { language } = useInterfaceLanguage();
  const Element = as;

  if (language === "en") {
    return <Element className={className} role={role}>{english}</Element>;
  }
  if (language === "fil") {
    return <Element className={className} role={role}>{filipino}</Element>;
  }

  return (
    <Element className={className} role={role}>
      <span className="block">{english}</span>
      <span className="mt-0.5 block">{filipino}</span>
    </Element>
  );
}
