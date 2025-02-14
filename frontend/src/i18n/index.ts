import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import pt from '../locales/pt.json';
import en from '../locales/en.json';

const resources = {
  pt: {
    translation: pt,
  },
  en: {
    translation: en,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getLocales()[0]?.languageCode || 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    keySeparator: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;