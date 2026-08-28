import { describe, expect, it } from 'vitest';

import { DEFAULT_PORT, loadConfig, resolvePort } from '../src/config.js';

describe('resolvePort', () => {
  it('falls back to the default port when PORT is not set', () => {
    expect(resolvePort(undefined)).toBe(DEFAULT_PORT);
  });

  it('falls back to the default port when PORT is empty', () => {
    expect(resolvePort('')).toBe(DEFAULT_PORT);
    expect(resolvePort('   ')).toBe(DEFAULT_PORT);
  });

  it('parses a valid PORT value', () => {
    expect(resolvePort('4100')).toBe(4100);
  });

  it('rejects non-numeric and out-of-range PORT values', () => {
    expect(() => resolvePort('abc')).toThrow();
    expect(() => resolvePort('3.5')).toThrow();
    expect(() => resolvePort('-1')).toThrow();
    expect(() => resolvePort('0')).toThrow();
    expect(() => resolvePort('65536')).toThrow();
  });
});

describe('loadConfig', () => {
  it('builds the base URL from the resolved port', () => {
    const config = loadConfig({ PORT: '4100' });

    expect(config.port).toBe(4100);
    expect(config.baseUrl).toBe('http://localhost:4100');
  });

  it('uses the default port when PORT is missing', () => {
    const config = loadConfig({});

    expect(config.port).toBe(DEFAULT_PORT);
    expect(config.baseUrl).toBe(`http://localhost:${DEFAULT_PORT}`);
  });
});