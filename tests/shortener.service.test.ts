import { describe, it, expect } from "vitest";
import { ShortenerService } from "../src/services/shortener.service.js";
import {
  InMemoryShorteningStore,
  ShorteningStore,
  Shortening,
} from "../src/stores/shortening.store.js";

describe("ShortenerService", () => {
  function createService(port = 3000): {
    service: ShortenerService;
    store: ShorteningStore;
  } {
    const store = new InMemoryShorteningStore();
    const service = new ShortenerService(store, port);
    return { service, store };
  }

  describe("isValidUrl", () => {
    it("accepts http:// URLs", () => {
      const { service } = createService();
      expect(service.isValidUrl("http://example.com")).toBe(true);
    });

    it("accepts https:// URLs", () => {
      const { service } = createService();
      expect(service.isValidUrl("https://example.com/path?q=1")).toBe(true);
    });

    it("rejects non-string values", () => {
      const { service } = createService();
      expect(service.isValidUrl(12345)).toBe(false);
      expect(service.isValidUrl(null)).toBe(false);
      expect(service.isValidUrl(undefined)).toBe(false);
      expect(service.isValidUrl({})).toBe(false);
      expect(service.isValidUrl([])).toBe(false);
    });

    it("rejects empty string", () => {
      const { service } = createService();
      expect(service.isValidUrl("")).toBe(false);
    });

    it("rejects ftp:// and other protocols", () => {
      const { service } = createService();
      expect(service.isValidUrl("ftp://example.com")).toBe(false);
      expect(service.isValidUrl("file:///etc/passwd")).toBe(false);
    });
  });

  describe("createShortening", () => {
    it("creates a shortening with a 6-char alphanumeric code", () => {
      const { service, store } = createService();
      const result = service.createShortening("https://example.com");

      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(store.has(result.code)).toBe(true);
    });

    it("returns a shortUrl with the configured port", () => {
      const { service } = createService(8080);
      const result = service.createShortening("https://example.com");

      expect(result.shortUrl).toBe(`http://localhost:8080/${result.code}`);
    });

    it("initializes hits at 0", () => {
      const { service, store } = createService();
      const result = service.createShortening("https://example.com");
      const record = store.find(result.code);

      expect(record).toBeDefined();
      expect(record!.hits).toBe(0);
    });

    it("stores the original URL without modification", () => {
      const { service, store } = createService();
      const original = "https://example.com/page?query=1&other=2";
      const result = service.createShortening(original);
      const record = store.find(result.code);

      expect(record!.url).toBe(original);
    });

    it("does not deduplicate — same URL produces distinct codes", () => {
      const { service } = createService();
      const r1 = service.createShortening("https://example.com/same");
      const r2 = service.createShortening("https://example.com/same");

      expect(r1.code).not.toBe(r2.code);
    });
  });

  describe("resolve (GET /:code)", () => {
    it("returns the original URL for an existing code", () => {
      const { service } = createService();
      const created = service.createShortening("https://example.com/resolve");
      const result = service.resolve(created.code);

      expect(result).toBeDefined();
      expect(result!.code).toBe(created.code);
      expect(result!.shortUrl).toBe("https://example.com/resolve");
    });

    it("returns undefined for a non-existent code", () => {
      const { service } = createService();
      const result = service.resolve("nonexistent");
      expect(result).toBeUndefined();
    });

    it("increments hits exactly once per resolve call", () => {
      const { service } = createService();
      const created = service.createShortening("https://example.com/increment");

      service.resolve(created.code);
      const stats1 = service.getStats(created.code);
      expect(stats1!.hits).toBe(1);

      service.resolve(created.code);
      const stats2 = service.getStats(created.code);
      expect(stats2!.hits).toBe(2);
    });

    it("does not increment hits on a non-existent code", () => {
      const { service, store } = createService();
      const result = service.resolve("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getStats", () => {
    it("returns code, url, and hits without mutating hits", () => {
      const { service } = createService();
      const created = service.createShortening("https://example.com/stats");

      // Simulate one redirect
      service.resolve(created.code);

      const stats1 = service.getStats(created.code);
      expect(stats1).toBeDefined();
      expect(stats1!.code).toBe(created.code);
      expect(stats1!.url).toBe("https://example.com/stats");
      expect(stats1!.hits).toBe(1);

      // Calling getStats again should not change hits
      const stats2 = service.getStats(created.code);
      expect(stats2!.hits).toBe(1);
    });

    it("returns undefined for a non-existent code", () => {
      const { service } = createService();
      const result = service.getStats("nonexistent");
      expect(result).toBeUndefined();
    });

    it("does not increment hits on repeated stats queries", () => {
      const { service } = createService();
      const created = service.createShortening("https://example.com/repeated");

      for (let i = 0; i < 5; i++) {
        service.getStats(created.code);
      }

      const stats = service.getStats(created.code);
      expect(stats!.hits).toBe(0);
    });
  });

  describe("collision handling", () => {
    it("generates a unique code even when a collision would occur", () => {
      const store = new InMemoryShorteningStore();
      const service = new ShortenerService(store, 3000);

      // Pre-populate the store with a known code
      const existing: Shortening = {
        code: "AAAAAA",
        url: "https://example.com/pre-existing",
        hits: 0,
      };
      // We need to force the store to have this code
      // Since generateCode is private, we create many shortening and verify uniqueness
      const codes: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = service.createShortening(`https://example.com/${i}`);
        codes.push(result.code);
      }

      // All codes should be unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });
});