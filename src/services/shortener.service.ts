import { randomInt } from "node:crypto";
import { ShorteningStore } from "../stores/shortening.store.js";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;

export type ShortenResult = {
  code: string;
  shortUrl: string;
};

export type ShortenStats = {
  code: string;
  url: string;
  hits: number;
};

export class ShortenerService {
  constructor(
    private readonly store: ShorteningStore,
    private readonly port: number,
  ) {}

  private generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    }
    return code;
  }

  private generateUniqueCode(): string {
    let code = this.generateCode();
    while (this.store.has(code)) {
      code = this.generateCode();
    }
    return code;
  }

  isValidUrl(url: unknown): url is string {
    if (typeof url !== "string") {
      return false;
    }
    return url.startsWith("http://") || url.startsWith("https://");
  }

  createShortening(url: string): ShortenResult {
    const code = this.generateUniqueCode();
    this.store.save({ code, url, hits: 0 });
    return {
      code,
      shortUrl: `http://localhost:${this.port}/${code}`,
    };
  }

  resolve(code: string): ShortenResult | undefined {
    const record = this.store.find(code);
    if (record === undefined) {
      return undefined;
    }
    this.store.incrementHits(code);
    return { code, shortUrl: record.url };
  }

  getStats(code: string): ShortenStats | undefined {
    const record = this.store.find(code);
    if (record === undefined) {
      return undefined;
    }
    return {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
  }
}