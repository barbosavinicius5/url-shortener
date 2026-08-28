import { UrlRecord, UrlStore } from "./types";

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MAX_GENERATION_ATTEMPTS = 100;

const HTTP_HTTPS_PREFIX_RE = /^https?:\/\//i;

export class UrlService {
  constructor(
    private readonly store: UrlStore,
    private readonly port: number,
  ) {}

  shorten(url: string): { success: true; code: string; shortUrl: string } | { success: false; error: string } {
    if (!HTTP_HTTPS_PREFIX_RE.test(url)) {
      return {
        success: false,
        error: 'URL must start with "http://" or "https://"',
      };
    }

    // Validate with new URL()
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: "URL is malformed",
      };
    }

    const code = this.generateUniqueCode();
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.save(record);

    return {
      success: true,
      code,
      shortUrl: `http://localhost:${this.port}/${code}`,
    };
  }

  redirect(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): UrlRecord | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { ...record };
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.generateCode();
      if (!this.store.findByCode(candidate)) {
        return candidate;
      }
    }
    throw new Error("Unable to generate unique code: code space exhausted");
  }

  private generateCode(): string {
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      const index = Math.floor(Math.random() * ALPHANUMERIC_CHARACTERS.length);
      code += ALPHANUMERIC_CHARACTERS[index];
    }
    return code;
  }
}