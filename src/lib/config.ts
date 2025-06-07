/**
 * Configuration module for managing environment variables and API keys
 * This module provides a secure way to handle sensitive information
 */

interface AppConfig {
  taapiSecretKey: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Gets the TAAPI secret key from environment variables or localStorage
 * In production, this should come from environment variables
 * In development, it can be stored in localStorage for convenience
 */
function getTaapiSecretKey(): string {
  // First try environment variables (for production)
  if (import.meta.env.VITE_TAAPI_SECRET) {
    return import.meta.env.VITE_TAAPI_SECRET;
  }

  // Fall back to localStorage (for development only)
  if (typeof window !== 'undefined' && !import.meta.env.PROD) {
    const storedKey = localStorage.getItem('TAAPI_SECRET_KEY');
    if (storedKey) {
      return storedKey;
    }
  }

  // If no key is found, throw an error with helpful message
  throw new Error(
    'TAAPI secret key not found. ' +
    'For production: Set VITE_TAAPI_SECRET environment variable. ' +
    'For development: Use setTaapiSecretKey() function or set VITE_TAAPI_SECRET.'
  );
}

/**
 * Sets the TAAPI secret key in localStorage (development only)
 * This is a convenience function for development
 */
export function setTaapiSecretKey(key: string): void {
  if (import.meta.env.PROD) {
    console.warn('setTaapiSecretKey() should not be used in production');
    return;
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('TAAPI_SECRET_KEY', key);
    console.log('TAAPI secret key stored in localStorage');
  }
}

/**
 * Removes the TAAPI secret key from localStorage
 */
export function clearTaapiSecretKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('TAAPI_SECRET_KEY');
    console.log('TAAPI secret key removed from localStorage');
  }
}

/**
 * Gets the application configuration
 */
export function getAppConfig(): AppConfig {
  return {
    taapiSecretKey: getTaapiSecretKey(),
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  };
}

/**
 * Validates if the TAAPI secret key is available
 */
export function isTaapiConfigured(): boolean {
  try {
    getTaapiSecretKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Development helper to show configuration status
 */
export function showConfigStatus(): void {
  if (import.meta.env.PROD) {
    return; // Don't show in production
  }

  console.group('🔧 App Configuration Status');
  console.log('Environment:', import.meta.env.DEV ? 'Development' : 'Production');
  console.log('TAAPI Configured:', isTaapiConfigured());
  
  if (isTaapiConfigured()) {
    const key = getTaapiSecretKey();
    console.log('TAAPI Key Source:', 
      import.meta.env.VITE_TAAPI_SECRET ? 'Environment Variable' : 'localStorage'
    );
    console.log('TAAPI Key Preview:', key.substring(0, 8) + '...');
  } else {
    console.warn('⚠️ TAAPI not configured. Use setTaapiSecretKey() to set your API key.');
  }
  
  console.groupEnd();
}
