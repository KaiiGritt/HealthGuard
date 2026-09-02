"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type InterfaceLanguage = "en" | "fil" | "both";

export const STORAGE_KEY = "healthguard-language";
export const DEFAULT_LANGUAGE: InterfaceLanguage = "en";

type LanguageContextValue = {
  language: InterfaceLanguage;
  setLanguage: (next: InterfaceLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => undefined,
});

function isValidLanguage(value: string | null): value is InterfaceLanguage {
  return value === "en" || value === "fil" || value === "both";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<InterfaceLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, DEFAULT_LANGUAGE);
    document.documentElement.lang = "en";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextLanguage = language === "en" ? "en" : "en";
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    document.documentElement.lang = "en";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: (next: InterfaceLanguage) => setLanguageState(next),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useInterfaceLanguage() {
  return useContext(LanguageContext);
}
