import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as i18nModule from './i18n';

// We need to mock the module before importing
vi.mock('svelte-i18n', () => {
  return {
    addMessages: vi.fn(),
    init: vi.fn(),
    locale: {
      set: vi.fn(),
      subscribe: vi.fn()
    },
    _: vi.fn()
  };
});

// Re-import svelte-i18n module to access mocks
import { init, locale } from 'svelte-i18n';

describe('i18n Setup', () => {
  let localStorageMock: { [key: string]: string } = {};
  
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    
    // Mock for localStorage
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => localStorageMock[key] || null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      }
    );
    
    // Mock for navigator.language
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with English as default when there is no saved preference or browser preference', () => {
    // Simulate unsupported browser language
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('invalid-lang');
    
    // Spy on the real implementation method
    const i18n = i18nModule.createI18nStore();
    const setLanguageSpy = vi.spyOn(i18n, 'setLanguage');
    
    i18n.initialize();
    
    expect(setLanguageSpy).toHaveBeenCalledWith('en');
  });

  it('should use the saved preference from localStorage if available', () => {
    // Set a saved preference
    localStorageMock['preferredLanguage'] = 'es';
    
    const i18n = i18nModule.createI18nStore();
    const setLanguageSpy = vi.spyOn(i18n, 'setLanguage');
    
    i18n.initialize();
    
    expect(setLanguageSpy).toHaveBeenCalledWith('es');
  });

  it('should use the browser language if there is no saved preference and the language is supported', () => {
    // Set browser language as Portuguese
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt');
    
    // Create a new i18n instance to avoid shared state issues
    const i18n = i18nModule.createI18nStore();
    const setLanguageSpy = vi.spyOn(i18n, 'setLanguage');
    
    i18n.initialize();
    
    expect(setLanguageSpy).toHaveBeenCalledWith('pt');
  });

  it('should verify that all language files are correctly registered', () => {
    // Test if main languages have translations
    const i18n = i18nModule.createI18nStore();
    expect(Object.keys(i18n.translations)).toContain('en');
    expect(Object.keys(i18n.translations)).toContain('es');
    expect(Object.keys(i18n.translations)).toContain('pt');
    
    // Test some translations
    expect(i18n.t('greeting', 'en')).toBe('Hello');
    expect(i18n.t('welcome', 'es')).toBe('Bienvenido a la aplicación');
    expect(i18n.t('language', 'pt')).toBe('Idioma');
  });

  it('should update localStorage and svelte-i18n locale when setLanguage is called', () => {
    const i18n = i18nModule.createI18nStore();
    
    i18n.setLanguage('pt');
    
    expect(localStorageMock['preferredLanguage']).toBe('pt');
    expect(locale.set).toHaveBeenCalledWith('pt');
  });

  it('should return the key itself when a translation is not found', () => {
    const i18n = i18nModule.createI18nStore();
    const nonExistentKey = 'non.existent.key' as any;
    
    expect(i18n.t(nonExistentKey, 'en')).toBe(nonExistentKey);
    expect(i18n.t(nonExistentKey, 'pt')).toBe(nonExistentKey);
    expect(i18n.t(nonExistentKey, 'es')).toBe(nonExistentKey);
  });

  it('should have consistent translation keys across all languages', () => {
    const i18n = i18nModule.createI18nStore();
    const enKeys = getAllKeys(i18n.translations.en);
    const ptKeys = getAllKeys(i18n.translations.pt);
    const esKeys = getAllKeys(i18n.translations.es);
    
    // Check if all English keys exist in other languages
    enKeys.forEach(key => {
      expect(ptKeys).toContain(key);
      expect(esKeys).toContain(key);
    });
    
    // Check that there are no extra keys in pt or es
    expect(ptKeys.length).toBe(enKeys.length);
    expect(esKeys.length).toBe(enKeys.length);
  });

  // Helper function to get all keys including nested ones
  function getAllKeys(obj: any, prefix = ''): string[] {
    return Object.keys(obj).reduce((keys: string[], key: string) => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        return [...keys, ...getAllKeys(value, newKey)];
      }
      
      return [...keys, newKey];
    }, []);
  }

  // Verifica se as mensagens específicas do timeframe de amplitude existem
  it('should contain all timeframe amplitude messages', () => {
    const i18n = i18nModule.createI18nStore();
    
    // Verifica para inglês
    expect(i18n.t('bitcoin.timeframe10mInfo', 'en')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1hInfo', 'en')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe4hInfo', 'en')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1dInfo', 'en')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1wInfo', 'en')).toBeTruthy();
    
    // Verifica para português
    expect(i18n.t('bitcoin.timeframe10mInfo', 'pt')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1hInfo', 'pt')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe4hInfo', 'pt')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1dInfo', 'pt')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1wInfo', 'pt')).toBeTruthy();
    
    // Verifica para espanhol
    expect(i18n.t('bitcoin.timeframe10mInfo', 'es')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1hInfo', 'es')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe4hInfo', 'es')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1dInfo', 'es')).toBeTruthy();
    expect(i18n.t('bitcoin.timeframe1wInfo', 'es')).toBeTruthy();
  });

  it('should initialize i18n correctly through the setupI18n function', () => {
    // Set a saved preference to test getInitialLocale
    localStorageMock['preferredLanguage'] = 'es';
    
    // Execute setupI18n
    i18nModule.setupI18n();
    
    // Verify that init was called with correct settings
    expect(init).toHaveBeenCalledWith({
      fallbackLocale: 'en',
      initialLocale: 'es'
    });
  });

  it('should use localStorage preference when available', () => {
    // Set a language preference in localStorage
    localStorageMock['preferredLanguage'] = 'pt';
    
    // Create a new i18n instance and initialize
    const i18n = i18nModule.createI18nStore();
    i18n.initialize();
    
    // Verify that localStorage method was called and locale was set
    expect(Storage.prototype.getItem).toHaveBeenCalledWith('preferredLanguage');
    expect(locale.set).toHaveBeenCalledWith('pt');
  });

  it('should use browser language when there is no preference in localStorage', () => {
    // Ensure there is no saved preference
    localStorageMock = {};
    
    // Set browser language
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES');
    
    // Create new instance and initialize
    const i18n = i18nModule.createI18nStore();
    i18n.initialize();
    
    // Verify that preference was stored based on browser language
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('preferredLanguage', 'es');
    expect(locale.set).toHaveBeenCalledWith('es');
  });
});