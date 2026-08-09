import en from './locales/en.json';
import ar from './locales/ar.json';
import type { Locale } from '@/stores/locale-store';

const dictionaries = { en, ar } as const;

type Dictionary = typeof en;

function getByPath(obj: Dictionary, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function translate(locale: Locale, key: string): string {
  return getByPath(dictionaries[locale], key) ?? getByPath(dictionaries.en, key) ?? key;
}

export function useTranslation(locale: Locale) {
  return {
    t: (key: string) => translate(locale, key),
    locale,
    dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const),
  };
}
