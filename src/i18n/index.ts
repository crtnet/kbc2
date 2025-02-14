import { getLocales } from 'expo-localization';
import pt from '../locales/pt.json';
import en from '../locales/en.json';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
};

const language = getLocales()[0].languageCode;

export default {
  resources,
  lng: language,
  fallbackLng: 'pt',
  interpolation: {
    escapeValue: false,
  },
};