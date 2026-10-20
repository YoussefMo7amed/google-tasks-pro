/**
 * useTranslation Hook
 * 
 * Ergonomic, type-safe React hook for accessing translations and language controls.
 */

import { useCallback, useMemo } from "react";
import { useRecoilState } from "recoil";
import { appLanguageAtom } from "../store/atoms";
import { I18nService } from "./i18n.service";
import { SUPPORTED_LANGUAGES, getLanguageDefinition } from "./locales";
import { LanguageCode, LanguageDirection, LanguageDefinition } from "./types";

export function useTranslation() {
  const [language, setLanguageState] = useRecoilState(appLanguageAtom);

  const langDef: LanguageDefinition = useMemo(() => {
    return getLanguageDefinition(language);
  }, [language]);

  const direction: LanguageDirection = langDef.direction;
  const isRtl = direction === "rtl";

  const changeLanguage = useCallback((newLang: LanguageCode) => {
    I18nService.saveLanguage(newLang);
    setLanguageState(newLang);
  }, [setLanguageState]);

  const toggleLanguage = useCallback(() => {
    const nextLang = language === "en" ? "ar" : "en";
    changeLanguage(nextLang);
  }, [language, changeLanguage]);

  const t = useCallback((keyPath: string, params?: Record<string, string | number>): string => {
    return I18nService.translate(language, keyPath, params);
  }, [language]);

  return {
    t,
    language,
    direction,
    isRtl,
    setLanguage: changeLanguage,
    toggleLanguage,
    currentLanguageName: langDef.nativeName,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}
