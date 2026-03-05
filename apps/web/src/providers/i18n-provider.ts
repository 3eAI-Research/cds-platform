import type { I18nProvider } from "@refinedev/core";
import i18n from "../i18n";

export const i18nProvider: I18nProvider = {
  translate: (key: string, options?: Record<string, unknown>) => {
    return i18n.t(key, options as Record<string, string>) as string;
  },
  changeLocale: (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("cds-lang", lang);
    return Promise.resolve();
  },
  getLocale: () => {
    return i18n.language;
  },
};
