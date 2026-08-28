import { describe, it, expect } from "vitest";
import { MemoryUrlStore } from "../src/store/memoryUrlStore";
import {
  UrlShortenerService,
  InvalidUrlError,
} from "../src/services/urlShortenerService";
import { generateCode } from "../src/utils/codeGenerator";
import { parsePort } from "../src/config";

describe("MemoryUrlStore", () => {
  it("saves and retrieves records", () => {
    const store = new MemoryUrlStore();
    store.save({ code: "abc123", url: "https://example.com", hits: 0 });
    const record = store.get("abc123");
    expect(record).toEqual({
      code: "abc123",
      url: "https://example.com",
      hits: 0,
    });
  });

  it("returns undefined for non-existent code", () => {
    const store = new MemoryUrlStore();
    expect(store.get("nonexist")).toBeUndefined();
  });

  it("throws on duplicate save (no silent overwrite)", () => {
    const store = new MemoryUrlStore();
    store.save({ code: "abc123", url: "https://example.com", hits: 0 });
    expect(() =>
      store.save({ code: "abc123", url: "https://other.com", hits: 0 }),
    ).toThrow();
    // original record should be untouched
    const record = store.get("abc123");
    expect(record?.url).toBe("https://example.com");
  });

  it("has returns true for existing and false for missing", () => {
    const store = new MemoryUrlStore();
    store.save({ code: "abc123", url: "https://example.com", hits: 0 });
    expect(store.has("abc123")).toBe(true);
    expect(store.has("nonexist")).toBe(false);
  });

  it("incrementHits increments by one and returns updated record", () => {
    const store = new MemoryUrlStore();
    store.save({ code: "abc123", url: "https://example.com", hits: 0 });
    const record = store.incrementHits("abc123");
    expect(record).toEqual({
      code: "abc123",
      url: "https://example.com",
      hits: 1,
    });
    // verify internal state
    const fetched = store.get("abc123");
    expect(fetched?.hits).toBe(1);
  });

  it("incrementHits returns undefined for non-existent code", () => {
    const store = new MemoryUrlStore();
    expect(store.incrementHits("nonexist")).toBeUndefined();
  });

  it("get returns a copy (not a reference to the internal record)", () => {
    const store = new MemoryUrlStore();
    store.save({ code: "abc123", url: "https://example.com", hits: 0 });
    const record1 = store.get("abc123");
    const record2 = store.get("abc123");
    expect(record1).not.toBe(record2);
    expect(record1).toEqual(record2);
  });
});

describe("UrlShortenerService", () => {
  it("shorten creates a valid short URL with 6-char alphanumeric code", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    const result = service.shorten("https://example.com");
    expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
    expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    expect(store.has(result.code)).toBe(true);
  });

  it("shorten throws InvalidUrlError for missing url", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(() => service.shorten(undefined)).toThrow(InvalidUrlError);
    expect(() => service.shorten("")).toThrow(InvalidUrlError);
  });

  it("shorten throws InvalidUrlError for non-string url", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(() => service.shorten(42)).toThrow(InvalidUrlError);
    expect(() => service.shorten(null)).toThrow(InvalidUrlError);
  });

  it("shorten throws InvalidUrlError for non-http protocol (ftp://)", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(() => service.shorten("ftp://example.com")).toThrow(InvalidUrlError);
  });

  it("shorten throws InvalidUrlError for httpx:// (fake protocol)", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(() => service.shorten("httpx://example.com")).toThrow(
      InvalidUrlError,
    );
  });

  it("shorten throws InvalidUrlError for malformed URL", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(() => service.shorten("https://")).toThrow(InvalidUrlError);
    expect(() => service.shorten("http://")).toThrow(InvalidUrlError);
  });

  it("shorten accepts uppercase HTTP protocol", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    const result = service.shorten("HTTP://example.com");
    expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
  });

  it("redirect increments hits and returns the record", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    const result = service.shorten("https://example.com");
    const record = service.redirect(result.code);
    expect(record).toBeDefined();
    expect(record!.url).toBe("https://example.com");
    const stats = service.getStats(result.code);
    expect(stats!.hits).toBe(1);
  });

  it("redirect returns undefined for non-existent code", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(service.redirect("nonexist")).toBeUndefined();
  });

  it("getStats returns record without incrementing hits", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    const result = service.shorten("https://example.com");
    const stats1 = service.getStats(result.code);
    expect(stats1!.hits).toBe(0);
    const stats2 = service.getStats(result.code);
    expect(stats2!.hits).toBe(0);
  });

  it("getStats returns undefined for non-existent code", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    expect(service.getStats("nonexist")).toBeUndefined();
  });

  it("multiple shorten calls produce unique codes", () => {
    const store = new MemoryUrlStore();
    const service = new UrlShortenerService(store, 3000);
    const codes: string[] = [];
    for (let i = 0; i < 50; i++) {
      const result = service.shorten(`https://example.com/${i}`);
      codes.push(result.code);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("generateCode", () => {
  it("generates a 6-character alphanumeric code", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
    }
  });
});

describe("parsePort", () => {
  it("returns default port 3000 when value is undefined", () => {
    expect(parsePort(undefined)).toBe(3000);
  });

  it("returns default port 3000 when value is empty", () => {
    expect(parsePort("")).toBe(3000);
  });

  it("returns parsed port for valid value", () => {
    expect(parsePort("8080")).toBe(8080);
  });

  it("returns default port for non-numeric value", () => {
    expect(parsePort("abc")).toBe(3000);
  });

  it("returns default port for zero", () => {
    expect(parsePort("0")).toBe(3000);
  });

  it("returns default port for negative value", () => {
    expect(parsePort("-1")).toBe(3000);
  });
});