import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { de } from "./de";
import { en } from "./en";
import { tr } from "./tr";

const savedLang = localStorage.getItem("cds-lang") || "de";

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Supported languages (EU official + Turkish)
export const SUPPORTED_LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "bg", label: "Български", flag: "🇧🇬" },
  { code: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { code: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", label: "Slovenščina", flag: "🇸🇮" },
  { code: "lt", label: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", label: "Latviešu", flag: "🇱🇻" },
  { code: "et", label: "Eesti", flag: "🇪🇪" },
  { code: "mt", label: "Malti", flag: "🇲🇹" },
  { code: "ga", label: "Gaeilge", flag: "🇮🇪" },
];

export default i18n;
