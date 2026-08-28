import { describe, it, expect } from 'vitest';
import { getPort, DEFAULT_PORT } from '../src/config/env';

describe('getPort', () => {
  it('returns default port 3000 when PORT is undefined', () => {
    expect(getPort({})).toBe(DEFAULT_PORT);
  });

  it('returns default port 3000 when PORT is an empty string', () => {
    expect(getPort({ PORT: '' })).toBe(DEFAULT_PORT);
  });

  it('returns parsed port when valid integer port is provided', () => {
    expect(getPort({ PORT: '4567' })).toBe(4567);
    expect(getPort({ PORT: '1' })).toBe(1);
    expect(getPort({ PORT: '65535' })).toBe(65535);
  });

  it('throws an error for port 0', () => {
    expect(() => getPort({ PORT: '0' })).toThrow('Invalid PORT');
  });

  it('throws an error for port exceeding 65535', () => {
    expect(() => getPort({ PORT: '65536' })).toThrow('Invalid PORT');
  });

  it('throws an error for negative port numbers', () => {
    expect(() => getPort({ PORT: '-1' })).toThrow('Invalid PORT');
  });

  it('throws an error for non-numeric port strings', () => {
    expect(() => getPort({ PORT: 'abc' })).toThrow('Invalid PORT');
    expect(() => getPort({ PORT: 'port3000' })).toThrow('Invalid PORT');
  });

  it('throws an error for decimal port numbers', () => {
    expect(() => getPort({ PORT: '3000.5' })).toThrow('Invalid PORT');
  });

  it('throws an error for strings with whitespace or special characters', () => {
    expect(() => getPort({ PORT: ' 3000 ' })).toThrow('Invalid PORT');
    expect(() => getPort({ PORT: '3000\n' })).toThrow('Invalid PORT');
  });
});