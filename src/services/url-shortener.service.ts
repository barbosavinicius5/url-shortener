import {
  AppConfig,
  CreateShortUrlInput,
  CreateShortUrlResponse,
  StatsResponse,
  UrlRecord,
  UrlStore,
} from "../types";
import { CodeGenerator, generateRandomCode } from "../utils/code-generator";

const HTTP_URL_PREFIX_PATTERN = /^https?:\/\//;
const MAX_CODE_GENERATION_ATTEMPTS = 1000;

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

/**
 * Spec rule: prefix-based validation only — a non-empty string starting
 * with "http://" or "https://". No broader URL policy is applied here.
 */
export function isValidHttpUrl(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && HTTP_URL_PREFIX_PATTERN.test(value);
}

export class UrlShortenerService {
  private readonly store: UrlStore;
  private readonly config: AppConfig;
  private readonly generateCode: CodeGenerator;

  constructor(
    store: UrlStore,
    config: AppConfig,
    generateCode: CodeGenerator = generateRandomCode,
  ) {
    this.store = store;
    this.config = config;
    this.generateCode = generateCode;
  }

  createShortUrl(input: CreateShortUrlInput): CreateShortUrlResponse {
    if (!isValidHttpUrl(input.url)) {
      throw new InvalidUrlError('"url" must be a non-empty string starting with "http://" or "https://"');
    }

    const code = this.generateUniqueCode();
    this.store.save({ code, url: input.url, hits: 0 });

    return {
      code,
      shortUrl: this.buildShortUrl(code),
      hits: 0,
    };
  }

  getRedirect(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.find(code);
    if (record === undefined) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateUniqueCode(): string {
    let attempts = 0;
    let code = this.generateCode();
    while (this.store.find(code) !== undefined) {
      attempts += 1;
      if (attempts >= MAX_CODE_GENERATION_ATTEMPTS) {
        throw new Error(
          `unable to generate a unique short code after ${MAX_CODE_GENERATION_ATTEMPTS} attempts`,
        );
      }
      code = this.generateCode();
    }
    return code;
  }

  private buildShortUrl(code: string): string {
    return `http://localhost:${this.config.port}/${code}`;
  }
}