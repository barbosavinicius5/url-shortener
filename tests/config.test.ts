import { describe, it, expect, beforeEach } from 'vitest';
import { getPort, getBaseUrl } from '../src/config';

describe('config', () => {
  it('returns 3000 when PORT is not set', () => {
    expect(getPort({})).toBe(3000);
  });

  it('returns 3000 when PORT is empty string', () => {
    expect(getPort({ PORT: '' })).toBe(3000);
  });

  it('returns the PORT value when set', () => {
    expect(getPort({ PORT: '4173' })).toBe(4173);
  });

  it('throws for invalid PORT (non-positive)', () => {
    expect(() => getPort({ PORT: '0' })).toThrow();
  });

  it('throws for invalid PORT (negative)', () => {
    expect(() => getPort({ PORT: '-1' })).toThrow();
  });

  it('throws for non-numeric PORT', () => {
    expect(() => getPort({ PORT: 'abc' })).toThrow();
  });

  it('throws for PORT > 65535', () => {
    expect(() => getPort({ PORT: '70000' })).toThrow();
  });

  it('getBaseUrl uses provided port', () => {
    expect(getBaseUrl(3000)).toBe('http://localhost:3000');
    expect(getBaseUrl(4173)).toBe('http://localhost:4173');
  });
});