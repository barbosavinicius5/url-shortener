import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PORT, resolvePort } from '../src/server';

afterEach(() => {
  delete process.env.PORT;
});

describe('port resolution', () => {
  it('defaults to 3000', () => expect(resolvePort(undefined)).toBe(DEFAULT_PORT));
  it('uses a valid configured port', () => expect(resolvePort('4567')).toBe(4567));
  it('falls back for invalid values', () => {
    expect(resolvePort('0')).toBe(DEFAULT_PORT);
    expect(resolvePort('65536')).toBe(DEFAULT_PORT);
    expect(resolvePort('not-a-port')).toBe(DEFAULT_PORT);
  });
});
