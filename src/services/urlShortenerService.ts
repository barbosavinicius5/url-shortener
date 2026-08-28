import { createHash, randomInt } from "node:crypto";
import {
  ShortUrlStore,
  ShortUrlRecord,
  CreateShortUrlResponse,
  ShortUrlStatsResponse,
  CodeGenerator,
} from "../types/url";

const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 1000;

export const defaultCodeGenerator: CodeGenerator = (): string => {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = randomInt(0, ALPHANUMERIC_CHARACTERS.length);
    code += ALPHANUMERIC_CHARACTERS[idx];
  }
  return code;
};

export function isValidUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return false;
  }
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export class UrlShortenerService {
  private readonly store: ShortUrlStore;
  private readonly generateCode: CodeGenerator;

  constructor(store: ShortUrlStore, generateCode?: CodeGenerator) {
    this.store = store;
    this.generateCode = generateCode ?? defaultCodeGenerator;
  }

  createShortUrl(
    url: string,
    baseUrl: string
  ): CreateShortUrlResponse {
    let code: string;
    let attempts = 0;

    do {
      code = this.generateCode();
      attempts++;
      if (attempts > MAX_GENERATION_ATTEMPTS) {
        throw new Error("Failed to generate a unique code after maximum attempts");
      }
    } while (this.store.find(code));

    const record: ShortUrlRecord = { code, url, hits: 0 };
    this.store.save(record);

    return {
      code,
      shortUrl: `${baseUrl}/${code}`,
    };
  }

  redirect(code: string): ShortUrlRecord | null {
    const record = this.store.incrementHits(code);
    return record ?? null;
  }

  getStats(code: string): ShortUrlStatsResponse | null {
    const record = this.store.find(code);
    if (!record) {
      return null;
    }
    return {
      code: record.code,
      url: record.url,
      hits: record.hits,
    };
  }
}