import { UrlStore } from "../store/url-store";
import { buildShortUrl } from "../config";

export type CodeGenerator = () => string;

export interface CreateShortUrlResult {
  code: string;
  shortUrl: string;
}

export interface UrlStats {
  code: string;
  url: string;
  hits: number;
}

export interface UrlServiceOptions {
  store?: UrlStore;
  generateCode?: CodeGenerator;
  baseUrl: string;
}

const CODE_LENGTH = 6;
const CODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MAX_CODE_ATTEMPTS = 10;

function defaultCodeGenerator(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET.charAt(index);
  }
  return code;
}

export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

export class CodeCollisionError extends Error {
  constructor() {
    super("Failed to generate a unique code after maximum attempts.");
    this.name = "CodeCollisionError";
  }
}

export class UrlService {
  private readonly store: UrlStore;
  private readonly generateCode: CodeGenerator;
  private readonly baseUrl: string;

  constructor(options: UrlServiceOptions) {
    this.store = options.store ?? new UrlStore();
    this.generateCode = options.generateCode ?? defaultCodeGenerator;
    this.baseUrl = options.baseUrl;
  }

  createShortUrl(url: unknown): CreateShortUrlResult {
    const validatedUrl = this.validateUrl(url);

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.generateCode();
      if (this.store.has(code)) {
        continue;
      }
      this.store.save({ code, url: validatedUrl, hits: 0 });
      return { code, shortUrl: buildShortUrl(this.baseUrl, code) };
    }

    throw new CodeCollisionError();
  }

  redirectToUrl(code: string): string | null {
    const record = this.store.get(code);
    if (record === undefined) {
      return null;
    }
    this.store.incrementHits(code);
    return record.url;
  }

  getStats(code: string): UrlStats | null {
    const record = this.store.get(code);
    if (record === undefined) {
      return null;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private validateUrl(url: unknown): string {
    if (url === undefined || url === null) {
      throw new UrlValidationError("url is required");
    }
    if (typeof url !== "string") {
      throw new UrlValidationError("url must be a string");
    }
    if (url.trim().length === 0) {
      throw new UrlValidationError("url must not be empty");
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      throw new UrlValidationError(
        "url must start with http:// or https://",
      );
    }
    return url;
  }
}