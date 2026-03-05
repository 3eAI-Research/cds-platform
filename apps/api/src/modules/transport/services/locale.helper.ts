/**
 * Locale helper — extracts localized text from JSON fields.
 *
 * Prisma stores localized text as JSON: { "de": "Wohnung", "en": "Apartment", ... }
 * This helper resolves the correct language based on Accept-Language header.
 *
 * Supported locales: de, en, fr, tr, ar, ru (matching seed data)
 * Fallback chain: requested locale → de → first available
 */

const SUPPORTED_LOCALES = ['de', 'en', 'fr', 'tr', 'ar', 'ru'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = 'de';

/**
 * Resolve localized text from a JSON field.
 */
export function resolveLocalizedText(
  json: unknown,
  locale: string,
): string {
  if (typeof json === 'string') return json;
  if (typeof json !== 'object' || json === null) return '';

  const record = json as Record<string, string>;
  const requestedLocale = normalizeLocale(locale);

  // Fallback chain: requested → de → first available
  return (
    record[requestedLocale] ??
    record[DEFAULT_LOCALE] ??
    Object.values(record)[0] ??
    ''
  );
}

/**
 * Extract locale from Accept-Language header.
 * Example: "de-DE,de;q=0.9,en;q=0.8" → "de"
 */
export function parseAcceptLanguage(header?: string): string {
  if (!header) return DEFAULT_LOCALE;

  const firstTag = header.split(',')[0]?.trim();
  if (!firstTag) return DEFAULT_LOCALE;

  return normalizeLocale(firstTag.split(';')[0] ?? DEFAULT_LOCALE);
}

function normalizeLocale(locale: string): SupportedLocale {
  // "de-DE" → "de", "en-US" → "en"
  const lang = locale.split('-')[0]?.toLowerCase() ?? DEFAULT_LOCALE;

  if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
    return lang as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}
