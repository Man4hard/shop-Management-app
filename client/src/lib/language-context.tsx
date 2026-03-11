import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Language, t as translate, isRtl } from "./i18n";
import type { Business } from "@shared/schema";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (section: string, key: string) => string;
  isRtl: boolean;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (section, key) => key,
  isRtl: false,
  dir: "ltr",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved === "ur" ? "ur" : "en") as Language;
  });

  const { data: business } = useQuery<Business>({ queryKey: ["/api/business"] });

  useEffect(() => {
    if (business?.language) {
      const newLang = business.language === "ur" ? "ur" : "en";
      setLangState(newLang as Language);
      localStorage.setItem("app-language", newLang);
    }
  }, [business?.language]);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app-language", newLang);
  }, []);

  useEffect(() => {
    const rtl = isRtl(lang);
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    if (rtl) {
      document.documentElement.classList.add("rtl");
    } else {
      document.documentElement.classList.remove("rtl");
    }
  }, [lang]);

  const tFunc = useCallback(
    (section: string, key: string) => translate(section as any, key, lang),
    [lang]
  );

  const value: LanguageContextType = {
    lang,
    setLang,
    t: tFunc,
    isRtl: isRtl(lang),
    dir: isRtl(lang) ? "rtl" : "ltr",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
