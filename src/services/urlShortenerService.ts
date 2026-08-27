import { UrlStore } from "../store/urlStore";
import { CreateShortUrlInput, CreateShortUrlResult, UrlRecord } from "../types/url";

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const DEFAULT_PORT = 3000;

export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUrlError";
  }
}

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * ALPHANUMERIC_CHARACTERS.length);
    const char = ALPHANUMERIC_CHARACTERS[index];
    if (char !== undefined) {
      code += char;
    }
  }
  return code;
}

export class UrlShortenerService {
  private readonly store: UrlStore;

  constructor(store: UrlStore) {
    this.store = store;
  }

  private generateUniqueCode(): string {
    let code = generateCode();
    while (this.store.has(code)) {
      code = generateCode();
    }
    return code;
  }

  createShortUrl(input: CreateShortUrlInput, port: number = DEFAULT_PORT): CreateShortUrlResult {
    if (!isValidHttpUrl(input?.url)) {
      throw new InvalidUrlError("A valid http:// or https:// URL is required");
    }
    const url = input.url as string;
    const code = this.generateUniqueCode();
    const record: UrlRecord = { code, url, hits: 0 };
    this.store.set(record);
    return {
      code,
      shortUrl: `http://localhost:${port}/${code}`,
    };
  }

  redirect(code: string): UrlRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): { code: string; url: string; hits: number } | undefined {
    const record = this.store.get(code);
    if (record === undefined) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }
}