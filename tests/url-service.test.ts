import { describe, it, expect } from "vitest";
import { UrlStore } from "../src/store/url-store";
import {
  UrlService,
  UrlValidationError,
  CodeCollisionError,
} from "../src/services/url-service";

describe("UrlService", () => {
  describe("createShortUrl — happy path", () => {
    it("creates a short URL with a 6-character alphanumeric code", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
      expect(result.shortUrl).toBe(`http://localhost:3000/${result.code}`);
    });

    it("saves the URL record with hits: 0", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");
      const stats = service.getStats(result.code);
      expect(stats).not.toBeNull();
      expect(stats!.hits).toBe(0);
    });

    it("accepts http:// URLs", () => {
      const service = new UrlService({
        store: new UrlStore(),
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("http://example.com");
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it("accepts https:// URLs", () => {
      const service = new UrlService({
        store: new UrlStore(),
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");
      expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it("generates different codes for the same URL", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const a = service.createShortUrl("https://example.com");
      const b = service.createShortUrl("https://example.com");
      expect(a.code).not.toBe(b.code);
    });
  });

  describe("createShortUrl — collision retry", () => {
    it("retries on collision and persists the first available code", () => {
      const store = new UrlStore();
      const codes = ["ABC123", "ABC123", "XYZ789"];
      let index = 0;
      const generateCode = () => codes[index++] ?? "ZZZ000";
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
        generateCode,
      });

      const first = service.createShortUrl("https://example.com");
      expect(first.code).toBe("ABC123");

      const second = service.createShortUrl("https://other.com");
      expect(second.code).toBe("XYZ789");
    });

    it("throws CodeCollisionError when all attempts collide", () => {
      const store = new UrlStore();
      const generateCode = () => "COLLID";
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
        generateCode,
      });

      // First create succeeds
      service.createShortUrl("https://example.com");

      // Subsequent creates always collide
      expect(() => service.createShortUrl("https://other.com")).toThrow(
        CodeCollisionError,
      );
    });
  });

  describe("validateUrl", () => {
    const makeService = () =>
      new UrlService({ store: new UrlStore(), baseUrl: "http://localhost:3000" });

    it("rejects undefined with 'url is required'", () => {
      expect(() => makeService().createShortUrl(undefined)).toThrow(
        "url is required",
      );
    });

    it("rejects null with 'url is required'", () => {
      expect(() => makeService().createShortUrl(null)).toThrow(
        "url is required",
      );
    });

    it("rejects empty string with 'url must not be empty'", () => {
      expect(() => makeService().createShortUrl("")).toThrow(
        "url must not be empty",
      );
    });

    it("rejects whitespace-only string with 'url must not be empty'", () => {
      expect(() => makeService().createShortUrl("   ")).toThrow(
        "url must not be empty",
      );
    });

    it("rejects non-string values with 'url must be a string'", () => {
      expect(() => makeService().createShortUrl(123)).toThrow(
        "url must be a string",
      );
      expect(() => makeService().createShortUrl({})).toThrow(
        "url must be a string",
      );
      expect(() => makeService().createShortUrl(true)).toThrow(
        "url must be a string",
      );
    });

    it("rejects URLs not starting with http:// or https://", () => {
      expect(() => makeService().createShortUrl("ftp://example.com")).toThrow(
        "url must start with http:// or https://",
      );
      expect(() => makeService().createShortUrl("example.com")).toThrow(
        "url must start with http:// or https://",
      );
    });

    it("throws UrlValidationError for invalid input (type check)", () => {
      expect(() => makeService().createShortUrl(undefined)).toThrow(
        UrlValidationError,
      );
    });
  });

  describe("redirectToUrl", () => {
    it("returns the URL for an existing code", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");
      const url = service.redirectToUrl(result.code);
      expect(url).toBe("https://example.com");
    });

    it("returns null for a non-existent code", () => {
      const service = new UrlService({
        store: new UrlStore(),
        baseUrl: "http://localhost:3000",
      });
      expect(service.redirectToUrl("NONEXI")).toBeNull();
    });

    it("increments hits exactly once per redirect", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");

      service.redirectToUrl(result.code);
      service.redirectToUrl(result.code);

      const stats = service.getStats(result.code);
      expect(stats!.hits).toBe(2);
    });
  });

  describe("getStats", () => {
    it("returns stats without incrementing hits", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");

      const stats1 = service.getStats(result.code);
      expect(stats1).toEqual({
        code: result.code,
        url: "https://example.com",
        hits: 0,
      });

      service.redirectToUrl(result.code);

      const stats2 = service.getStats(result.code);
      expect(stats2!.hits).toBe(1);
    });

    it("returns null for a non-existent code", () => {
      const service = new UrlService({
        store: new UrlStore(),
        baseUrl: "http://localhost:3000",
      });
      expect(service.getStats("NONEXI")).toBeNull();
    });

    it("returns exactly code, url, and hits", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      const result = service.createShortUrl("https://example.com");
      const stats = service.getStats(result.code);
      expect(stats).not.toBeNull();
      expect(Object.keys(stats!)).toHaveLength(3);
      expect(stats).toHaveProperty("code");
      expect(stats).toHaveProperty("url");
      expect(stats).toHaveProperty("hits");
    });
  });

  describe("default code generator", () => {
    it("generates 6-character alphanumeric codes consistently", () => {
      const store = new UrlStore();
      const service = new UrlService({
        store,
        baseUrl: "http://localhost:3000",
      });
      for (let i = 0; i < 20; i++) {
        const result = service.createShortUrl(`https://example.com/${i}`);
        expect(result.code).toMatch(/^[A-Za-z0-9]{6}$/);
      }
    });
  });
});