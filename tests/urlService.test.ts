import { beforeEach, describe, expect, it } from "vitest";
import { UrlStore } from "../src/store/urlStore";
import {
  UrlService,
  UrlServiceError,
  validateUrl,
  type CodeGenerator,
} from "../src/services/urlService";

/** Controlled code generator that returns a fixed sequence for determinism. */
class SequenceGenerator implements CodeGenerator {
  private index = 0;
  constructor(private readonly codes: string[]) {}
  generate(_length: number): string {
    const code = this.codes[Math.min(this.index, this.codes.length - 1)];
    this.index += 1;
    return code;
  }
}

describe("validateUrl", () => {
  it("throws for undefined url", () => {
    expect(() => validateUrl(undefined)).toThrow(UrlServiceError);
  });

  it("throws for empty string", () => {
    expect(() => validateUrl("")).toThrow(UrlServiceError);
  });

  it("throws for non-string url", () => {
    expect(() => validateUrl(123)).toThrow(UrlServiceError);
  });

  it("throws for non-http(s) protocol", () => {
    expect(() => validateUrl("ftp://example.com")).toThrow(UrlServiceError);
  });

  it("throws for otherwise invalid url", () => {
    expect(() => validateUrl("http://")).toThrow(UrlServiceError);
  });

  it("accepts https url", () => {
    expect(validateUrl("https://example.com/page")).toBe("https://example.com/page");
  });

  it("accepts http url", () => {
    expect(validateUrl("http://example.com")).toBe("http://example.com");
  });
});

describe("UrlService", () => {
  let store: UrlStore;
  let service: UrlService;

  beforeEach(() => {
    store = new UrlStore();
    service = new UrlService(store, 3000, new SequenceGenerator(["abc123", "def456"]));
  });

  it("creates a record that starts with zero hits", () => {
    const result = service.create("https://example.com");
    expect(result.code).toBe("abc123");

    const stats = service.getStats(result.code);
    expect(stats?.hits).toBe(0);
  });

  it("redirect increments hits exactly once per successful access", () => {
    const { code } = service.create("https://example.com");

    service.redirect(code);
    const stats = service.getStats(code);
    expect(stats?.hits).toBe(1);

    service.redirect(code);
    expect(service.getStats(code)?.hits).toBe(2);
  });

  it("getStats does not increment hits", () => {
    const { code } = service.create("https://example.com");

    service.getStats(code);
    service.getStats(code);
    service.getStats(code);

    expect(service.getStats(code)?.hits).toBe(0);
  });

  it("redirect returns undefined for an unknown code and does not change state", () => {
    expect(service.redirect("unknown")).toBeUndefined();
    expect(store.exists("unknown")).toBe(false);
  });

  it("getStats returns undefined for an unknown code", () => {
    expect(service.getStats("unknown")).toBeUndefined();
  });

  it("generates distinct codes when a collision occurs", () => {
    const colliding = new UrlService(
      store,
      3000,
      new SequenceGenerator(["dup111", "dup111", "uniq22"]),
    );

    const a = colliding.create("https://a.com");
    const b = colliding.create("https://b.com");

    expect(a.code).not.toBe(b.code);
    expect(store.exists(a.code)).toBe(true);
    expect(store.exists(b.code)).toBe(true);
  });

  it("accepts the same url twice without deduplication", () => {
    const a = service.create("https://example.com/same");
    const b = service.create("https://example.com/same");

    expect(a.code).not.toBe(b.code);
    expect(a.shortUrl).toBe(`http://localhost:3000/${a.code}`);
  });
});