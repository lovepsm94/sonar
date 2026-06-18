'use client';
import { useEffect, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import type { Lang } from '@/game/types';
import i18n, { type I18nKey } from './i18n';

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'vi';
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'vi';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // On mount switch to the saved/detected language. The server prerenders the 'vi'
  // fallback and the first client render matches it, so there's no hydration mismatch.
  useEffect(() => {
    const saved = (localStorage.getItem('sonar.lang') as Lang | null) ?? detectLang();
    if (saved !== i18n.language) void i18n.changeLanguage(saved);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey) => string;
}

/** Thin wrapper over react-i18next so the app keeps a stable { lang, setLang, t } API. */
export function useI18n(): I18nValue {
  const { t, i18n: inst } = useTranslation();
  const lang: Lang = inst.language?.toLowerCase().startsWith('en') ? 'en' : 'vi';
  const setLang = (l: Lang) => {
    localStorage.setItem('sonar.lang', l);
    void inst.changeLanguage(l);
  };
  return { lang, setLang, t: (key: I18nKey) => t(key) as string };
}
