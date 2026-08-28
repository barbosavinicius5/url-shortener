import { randomInt } from "node:crypto";
import { LinkStore } from "../storage/link-store";
import { AppConfig } from "../config/environment";
import { ShortenResult, LinkStats, UrlLink } from "../domain/url-link";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;

const URL_PATTERN = /^https?:\/\//i;

export class UrlShortenerService {
  constructor(
    private readonly store: LinkStore,
    private readonly config: AppConfig
  ) {}

  createShortLink(url: string): ShortenResult {
    if (typeof url !== "string" || url.trim() === "") {
      throw new ValidationError("url is required");
    }

    if (!URL_PATTERN.test(url)) {
      throw new ValidationError("url must start with http:// or https://");
    }

    const code = this.generateUniqueCode();
    const link: UrlLink = { code, url, hits: 0 };
    this.store.save(link);

    return {
      code,
      shortUrl: `${this.config.baseUrl}/${code}`,
    };
  }

  getOriginalUrl(code: string): string | undefined {
    const link = this.store.get(code);
    if (!link) {
      return undefined;
    }
    return link.url;
  }

  recordHit(code: string): void {
    this.store.incrementHits(code);
  }

  getStats(code: string): LinkStats | undefined {
    const link = this.store.get(code);
    if (!link) {
      return undefined;
    }
    return {
      code: link.code,
      url: link.url,
      hits: link.hits,
    };
  }

  private generateUniqueCode(): string {
    for (let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
      const code = this.generateCode();
      if (!this.store.has(code)) {
        return code;
      }
    }
    throw new Error("Failed to generate a unique short code after maximum attempts");
  }

  private generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = randomInt(0, ALPHABET.length);
      code += ALPHABET[index];
    }
    return code;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}