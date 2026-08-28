import type { UrlRecord, UrlStore, ShortenResult } from "../types/url";
import { generateUniqueCode } from "../utils/codeGenerator";

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
    Object.setPrototypeOf(this, InvalidUrlError.prototype);
  }
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly port: number,
  ) {}

  shorten(rawUrl: unknown): ShortenResult {
    if (typeof rawUrl !== "string" || rawUrl.length === 0) {
      throw new InvalidUrlError("URL is required");
    }

    if (!/^https?:\/\//i.test(rawUrl)) {
      throw new InvalidUrlError("URL must start with http:// or https://");
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new InvalidUrlError("Invalid URL format");
    }

    if (!/^https?:$/i.test(parsed.protocol)) {
      throw new InvalidUrlError("URL must use http or https protocol");
    }

    const code = generateUniqueCode((c) => this.store.has(c));
    const record: UrlRecord = { code, url: rawUrl, hits: 0 };
    this.store.save(record);

    const shortUrl = `http://localhost:${this.port}/${code}`;
    return { code, shortUrl };
  }

  redirect(code: string): UrlRecord | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    this.store.incrementHits(code);
    return record;
  }

  getStats(code: string): UrlRecord | undefined {
    return this.store.get(code);
  }
}