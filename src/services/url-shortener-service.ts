import { randomInt } from "node:crypto";
import {
  CreateShortUrlResponse,
  LinkRecord,
  StatsResponse,
  UrlStore,
  ValidationError,
} from "../types/url-shortener";

export const CODE_LENGTH = 6;
export const CODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

type CreateResult = CreateShortUrlResponse | ValidationError;

export class UrlShortenerService {
  private readonly store: UrlStore;
  private readonly port: number;

  constructor(store: UrlStore, port: number) {
    this.store = store;
    this.port = port;
  }

  createShortUrl(url: unknown): CreateResult {
    if (typeof url !== "string" || url.length === 0) {
      return { error: "url must start with http:// or https://" };
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "url must start with http:// or https://" };
    }

    const code = this.generateUniqueCode();
    const record: LinkRecord = { code, url, hits: 0 };
    this.store.save(record);

    return {
      code,
      shortUrl: `http://localhost:${this.port}/${code}`,
    };
  }

  redirect(code: string): LinkRecord | undefined {
    return this.store.incrementHits(code);
  }

  stats(code: string): StatsResponse | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateUniqueCode(): string {
    let code: string;
    do {
      code = this.randomCode();
    } while (this.store.has(code));
    return code;
  }

  private randomCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      const index = randomInt(0, CODE_ALPHABET.length);
      const char = CODE_ALPHABET[index];
      if (char === undefined) {
        throw new Error("failed to pick a character from the alphabet");
      }
      code += char;
    }
    return code;
  }
}