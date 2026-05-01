import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ko from '../locales/ko.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import zhHans from '../locales/zh-Hans.json';
import ru from '../locales/ru.json';
import mn from '../locales/mn.json';
import vi from '../locales/vi.json';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh-Hans', 'ru', 'mn', 'vi'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  'zh-Hans': '中文 (简体)',
  ru: 'Русский',
  mn: 'Монгол хэл',
  vi: 'Tiếng Việt',
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  ja: '🇯🇵',
  'zh-Hans': '🇨🇳',
  ru: '🇷🇺',
  mn: '🇲🇳',
  vi: '🇻🇳',
};

function getDeviceLanguage(): SupportedLanguage {
  const locale = Localization.getLocales()[0]?.languageTag ?? 'en';
  const lang = locale.split('-')[0];
  const map: Record<string, SupportedLanguage> = {
    ko: 'ko', ja: 'ja', ru: 'ru', mn: 'mn', vi: 'vi',
    zh: 'zh-Hans',
  };
  return map[lang] ?? 'en';
}

export async function initI18n(): Promise<void> {
  const cached = await AsyncStorage.getItem('appLanguage') as SupportedLanguage | null;
  const lng = (cached && SUPPORTED_LANGUAGES.includes(cached)) ? cached : getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
      'zh-Hans': { translation: zhHans },
      ru: { translation: ru },
      mn: { translation: mn },
      vi: { translation: vi },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem('appLanguage', lang);
}

export default i18n;
