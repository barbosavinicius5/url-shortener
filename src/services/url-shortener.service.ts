import crypto from "crypto";
import { InMemoryUrlStore } from "../store/in-memory-url.store";
import { ShortenResponse, StatsResponse } from "../types/url";

const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;

export interface UrlShortenerServiceConfig {
  baseUrl: string;
}

export class UrlShortenerService {
  private readonly store: InMemoryUrlStore;
  private readonly baseUrl: string;

  constructor(store: InMemoryUrlStore, config: UrlShortenerServiceConfig) {
    this.store = store;
    this.baseUrl = config.baseUrl;
  }

  validateUrl(input: unknown): string | null {
    if (typeof input !== "string") {
      return null;
    }
    if (!input.startsWith("http://") && !input.startsWith("https://")) {
      return null;
    }
    return input;
  }

  generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = crypto.randomInt(ALPHANUMERIC_CHARACTERS.length);
      code += ALPHANUMERIC_CHARACTERS[index];
    }
    return code;
  }

  createShortUrl(url: string): ShortenResponse {
    let code = this.generateCode();
    while (this.store.findByCode(code)) {
      code = this.generateCode();
    }
    this.store.create(code, url);
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  resolve(code: string): { url: string; record: { code: string; url: string; hits: number } } | null {
    const record = this.store.findByCode(code);
    if (!record) {
      return null;
    }
    return { url: record.url, record };
  }

  getStats(code: string): StatsResponse | null {
    const record = this.store.findByCode(code);
    if (!record) {
      return null;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  incrementHits(code: string): void {
    this.store.incrementHits(code);
  }
}