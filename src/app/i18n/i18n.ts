import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './vi.json';
import en from './en.json';

/** All translation keys (derived from the VI resource — EN must stay in parity). */
export type I18nKey = keyof typeof vi;

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: { vi: { translation: vi }, en: { translation: en } },
    lng: 'vi',                 // initial (client provider switches to saved/detected)
    fallbackLng: 'vi',
    keySeparator: false,        // our keys contain dots, e.g. 'home.create'
    nsSeparator: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18next;
