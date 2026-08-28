import { randomInt } from "node:crypto";
import type { CreateShortUrlResult, ShortUrlRecord, UrlStore } from "../types/url";

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export class ShortenerService {
  constructor(private readonly store: UrlStore) {}

  static isValidUrl(url: unknown): url is string {
    return (
      typeof url === "string" &&
      (url.startsWith("http://") || url.startsWith("https://"))
    );
  }

  createShortUrl(url: string, port: number): CreateShortUrlResult {
    const code = this.generateUniqueCode();
    const record: ShortUrlRecord = { code, url, hits: 0 };
    this.store.save(record);

    return {
      code,
      shortUrl: `http://localhost:${port}/${code}`,
    };
  }

  redirect(code: string): ShortUrlRecord | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }

    this.store.incrementHits(code);
    return record;
  }

  getStats(code: string): ShortUrlRecord | undefined {
    return this.store.findByCode(code);
  }

  private generateUniqueCode(): string {
    let code: string;
    do {
      code = this.generateCode();
    } while (this.store.findByCode(code) !== undefined);

    return code;
  }

  private generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      code += ALPHANUMERIC_CHARACTERS[randomInt(ALPHANUMERIC_CHARACTERS.length)];
    }
    return code;
  }
}