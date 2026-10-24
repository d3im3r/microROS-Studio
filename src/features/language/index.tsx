"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { translateText, type Language } from "./messages";

const LanguageContext = createContext<{ language: Language; select: (language: Language) => void }>({ language: "en", select: () => {} });
const STORAGE_KEY = "microros-language";
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    try { if (localStorage.getItem(STORAGE_KEY) === "es") setLanguage("es"); } catch { /* Works without browser storage. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  function select(next: Language) {
    setLanguage(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the in-memory preference. */ }
  }
  return <LanguageContext.Provider value={{ language, select }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  const { language, select } = useContext(LanguageContext);
  // Text only: never alter project values, message types, generated code or React elements.
  const translate = useCallback(<T,>(value: T): T => (typeof value === "string" ? translateText(value, language) : value) as T, [language]);
  return { language, select, translate };
}
export function LanguageToggle() {
  const { language, select } = useLanguage();
  const label = language === "en" ? "Switch to Spanish" : "Cambiar a inglés";
  return <Button variant="outline" size="sm" className="shrink-0 gap-1.5 px-2" aria-label={label} title={label} onClick={() => select(language === "en" ? "es" : "en")}><Languages size={15}/><span>{language.toUpperCase()}</span></Button>;
}
