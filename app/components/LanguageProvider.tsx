"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type InterfaceLanguage = "en" | "fil" | "both";

export const STORAGE_KEY = "healthguard-language";
export const DEFAULT_LANGUAGE: InterfaceLanguage = "en";
const LANGUAGE_CHANGE_EVENT = "healthguard-language-change";

type LanguageContextValue = {
  language: InterfaceLanguage;
  setLanguage: (next: InterfaceLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => undefined,
});

export function isInterfaceLanguage(value: string | null | undefined): value is InterfaceLanguage {
  return value === "en" || value === "fil" || value === "both";
}

export function localizedText(language: InterfaceLanguage, english: string, filipino: string) {
  if (language === "fil") return filipino;
  if (language === "both") return `${english} / ${filipino}`;
  return english;
}

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  };
}

function getLanguageSnapshot(): InterfaceLanguage {
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return isInterfaceLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

function getServerLanguageSnapshot() {
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  useEffect(() => {
    document.documentElement.lang = language === "fil" ? "fil" : "en";
  }, [language]);

  const setLanguage = useCallback((next: InterfaceLanguage) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next === "fil" ? "fil" : "en";
    window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useInterfaceLanguage() {
  return useContext(LanguageContext);
}
