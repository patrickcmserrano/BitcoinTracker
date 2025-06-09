import { expect, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Ensure DOM environment
beforeEach(() => {
  // Mock window object if needed
  if (typeof window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      writable: true
    });
  }
  
  // Mock document if needed
  if (typeof document === 'undefined') {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    Object.defineProperty(globalThis, 'document', {
      value: dom.window.document,
      writable: true
    });
  }
});

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
});