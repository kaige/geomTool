import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 根据环境设置基础路径
const basePath = process.env.NODE_ENV === 'production' ? '/geomTool/locales' : '/locales';

const loadTranslations = async () => {
  console.log('i18n dynamic loading 2nd version...');
  const [en, zh] = await Promise.all([
    fetch(`${basePath}/en.json`).then(res => res.json()),
    fetch(`${basePath}/zh.json`).then(res => res.json()),
  ]);

  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        zh: { translation: zh },
      },
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      interpolation: { escapeValue: false },
    });
};

loadTranslations();

export default i18n; 