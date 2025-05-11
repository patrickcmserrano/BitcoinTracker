// Simplified internationalization (i18n) system
import { addMessages, init, locale, _ } from 'svelte-i18n';
import { writable } from 'svelte/store';

// Import locale files
import en from './locales/en';
import pt from './locales/pt';
import es from './locales/es';

// Language definitions
export const SUPPORTED_LANGUAGES = ['en', 'pt', 'es'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Basic translations for testing and reference
export const translations = { en, pt, es };

// Add messages to the dictionary
addMessages('en', translations.en);
addMessages('pt', translations.pt);
addMessages('es', translations.es);

// Initialize i18n with appropriate settings
export function setupI18n() {
  const initialLocale = getInitialLocale();
  
  init({
    fallbackLocale: 'en',
    initialLocale: initialLocale,
  });
}

type TranslationKey = keyof typeof translations['en'];

// Function to get the initial locale based on browser or localStorage
function getInitialLocale() {
  if (typeof window === 'undefined') {
    return 'en';
  }
  
  // Check if there's a preferred language stored in localStorage
  const savedLocale = localStorage.getItem('preferredLanguage');
  
  if (savedLocale && SUPPORTED_LANGUAGES.includes(savedLocale as SupportedLanguage)) {
    return savedLocale;
  }
  
  // Use browser language if available
  const browserLocale = navigator.language.split('-')[0];
  return SUPPORTED_LANGUAGES.includes(browserLocale as SupportedLanguage) ? browserLocale : 'en';
}

export function createI18nStore() {
  const { subscribe, set } = writable<SupportedLanguage>('en');

  const store = {
    subscribe,
    setLanguage(lang: SupportedLanguage) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('preferredLanguage', lang);
      }
      locale.set(lang);
      set(lang);
      return lang;
    },
    initialize() {
      // Get saved preference, if any
      const savedLang = typeof localStorage !== 'undefined' 
        ? localStorage.getItem('preferredLanguage') as SupportedLanguage 
        : null;
      
      if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
        this.setLanguage(savedLang);
        return;
      }
      
      // Try to use browser language
      if (typeof navigator !== 'undefined') {
        const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
        if (SUPPORTED_LANGUAGES.includes(browserLang)) {
          this.setLanguage(browserLang);
          return;
        }
      }
      
      // Use English as default
      this.setLanguage('en');
    },
    t(key: TranslationKey, lang: SupportedLanguage = 'en') {
      return translations[lang]?.[key] || key;
    },
    translations // Export translations for tests
  };

  return store;
}

export const i18n = createI18nStore();

// Configure on load
setupI18n();

export { _, locale };