/**
 * Supported Languages Registry
 * 
 * Open registry for all available languages.
 * To add a new language, simply import its dictionary here and add it to SUPPORTED_LANGUAGES!
 */

import { LanguageDefinition } from "../types";
import { en } from "./en";
import { ar } from "./ar";

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    direction: "ltr",
    messages: en,
  },
  {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    direction: "rtl",
    messages: ar,
  },
];

export const DEFAULT_LANGUAGE = "en";

export function getLanguageDefinition(code: string): LanguageDefinition {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return found || SUPPORTED_LANGUAGES[0];
}
