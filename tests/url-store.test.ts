import { describe, expect, it } from 'vitest';
import { UrlStore } from '../src/store/url-store';

describe('UrlStore', () => {
  it('creates, finds, and increments records', () => {
    const store = new UrlStore();
    expect(store.findByCode('missing')).toBeUndefined();
    store.create('https://example.com', 'abc123');
    expect(store.findByCode('abc123')).toEqual({ code: 'abc123', url: 'https://example.com', hits: 0 });
    expect(store.incrementHits('abc123')).toEqual({ code: 'abc123', url: 'https://example.com', hits: 1 });
    expect(store.incrementHits('unknown')).toBeUndefined();
  });
});