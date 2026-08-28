import { generateCode } from "../utils/code-generator.js";
import { isValidHttpUrl } from "../utils/url-validation.js";
import type {
  CodeGenerator,
  CreateShortUrlResult,
  UrlStats,
  UrlStore,
} from "../types/url.js";

export class InvalidUrlError extends Error {
  constructor() {
    super("A valid HTTP or HTTPS URL is required");
    this.name = "InvalidUrlError";
  }
}

export class UrlNotFoundError extends Error {
  constructor(code: string) {
    super(`Short code not found: ${code}`);
    this.name = "UrlNotFoundError";
  }
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly baseUrl: string,
    private readonly codeGenerator: CodeGenerator = generateCode,
  ) {}

  createShortUrl(body: unknown): CreateShortUrlResult {
    if (!this.isUrlBody(body)) {
      throw new InvalidUrlError();
    }

    const originalUrl = body.url;
    if (!isValidHttpUrl(originalUrl)) {
      throw new InvalidUrlError();
    }

    let code = this.codeGenerator();
    while (this.store.has(code)) {
      code = this.codeGenerator();
    }

    this.store.create({ code, url: originalUrl, hits: 0 });

    return {
      code,
      shortUrl: `${this.baseUrl}/${code}`,
    };
  }

  redirect(code: string) {
    const record = this.store.findByCode(code);
    if (!record) {
      throw new UrlNotFoundError(code);
    }

    return this.store.incrementHits(code) ?? record;
  }

  getStats(code: string): UrlStats {
    const record = this.store.findByCode(code);
    if (!record) {
      throw new UrlNotFoundError(code);
    }

    return {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
  }

  private isUrlBody(body: unknown): body is { url: string } {
    return (
      typeof body === "object" &&
      body !== null &&
      "url" in body &&
      typeof body.url === "string" &&
      body.url.trim().length > 0
    );
  }
}