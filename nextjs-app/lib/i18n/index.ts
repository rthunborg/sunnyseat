'use client';

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { createElement } from 'react';
import { sv, type TranslationSchema } from './sv';
import { en } from './en';

export type Language = 'sv' | 'en';

const translations: Record<Language, TranslationSchema> = { sv, en };

const STORAGE_KEY = 'sunnyseat-lang';
const DEFAULT_LANG: Language = 'sv';

function detectLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANG;

  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang === 'en' || urlLang === 'sv') return urlLang;

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'sv') return stored;
  } catch {
    // sessionStorage unavailable
  }

  const browserLang = navigator.language?.toLowerCase();
  if (browserLang?.startsWith('en')) return 'en';

  return DEFAULT_LANG;
}

// External store for language state
let currentLang: Language = DEFAULT_LANG;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribeLang(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getLangSnapshot(): Language {
  return currentLang;
}

function getLangServerSnapshot(): Language {
  return DEFAULT_LANG;
}

function initLang() {
  currentLang = detectLanguage();
  emitChange();
}

function setLangExternal(lang: Language) {
  currentLang = lang;
  try {
    sessionStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // sessionStorage unavailable
  }
  document.documentElement.lang = lang;
  emitChange();
}

// Initialize on first client load
if (typeof window !== 'undefined') {
  initLang();
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return vars[key] != null ? String(vars[key]) : `{{${key}}}`;
  });
}

export function t(
  key: string,
  vars?: Record<string, string | number>,
  lang: Language = DEFAULT_LANG
): string {
  const dict = translations[lang];

  if (vars && 'count' in vars) {
    const count = Number(vars.count);
    const pluralKey = count === 1 ? `${key}_one` : `${key}_other`;
    const pluralValue = getNestedValue(dict as unknown as Record<string, unknown>, pluralKey);
    if (pluralValue !== pluralKey) {
      return interpolate(pluralValue, vars);
    }
  }

  const value = getNestedValue(dict as unknown as Record<string, unknown>, key);
  return interpolate(value, vars);
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: DEFAULT_LANG,
  setLanguage: () => {},
  t: (key, vars) => t(key, vars),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribeLang, getLangSnapshot, getLangServerSnapshot);

  const setLanguage = useCallback((lang: Language) => {
    setLangExternal(lang);
  }, []);

  const translate = useCallback(
    (key: string, vars?: Record<string, string | number>) => t(key, vars, language),
    [language]
  );

  return createElement(
    LanguageContext.Provider,
    { value: { language, setLanguage, t: translate } },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export type { TranslationSchema };
export type TranslationKey = string;
