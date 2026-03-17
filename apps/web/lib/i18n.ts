import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import all translation files
import en from '../public/locales/en.json';
import es from '../public/locales/es.json';
import fr from '../public/locales/fr.json';
import de from '../public/locales/de.json';
import pt from '../public/locales/pt.json';
import ar from '../public/locales/ar.json';
import hi from '../public/locales/hi.json';
import zh from '../public/locales/zh.json';
import ja from '../public/locales/ja.json';
import ko from '../public/locales/ko.json';
import ru from '../public/locales/ru.json';
import tr from '../public/locales/tr.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'en-GB': { translation: en },
      es: { translation: es },
      'es-MX': { translation: es },
      fr: { translation: fr },
      'fr-CA': { translation: fr },
      de: { translation: de },
      pt: { translation: pt },
      'pt-BR': { translation: pt },
      ar: { translation: ar },
      hi: { translation: hi },
      zh: { translation: zh },
      'zh-TW': { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      ru: { translation: ru },
      tr: { translation: tr },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
