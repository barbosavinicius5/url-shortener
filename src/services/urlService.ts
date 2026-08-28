import { randomInt } from "node:crypto";
import type { CreateUrlResponse, StatsResponse, UrlRecord } from "../types/url";
import type { UrlStore } from "../store/urlStore";

export const CODE_LENGTH = 6;
export const ALPHANUMERIC_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MAX_GENERATION_ATTEMPTS = 1000;

/** Strategy used to generate a short code of a given length. */
export interface CodeGenerator {
  generate(length: number): string;
}

/** Default cryptographically-safe alphanumeric code generator. */
export class DefaultCodeGenerator implements CodeGenerator {
  generate(length: number): string {
    let code = "";
    for (let i = 0; i < length; i++) {
      const index = randomInt(0, ALPHANUMERIC_CHARACTERS.length);
      code += ALPHANUMERIC_CHARACTERS[index];
    }
    return code;
  }
}

/** Error thrown for invalid input or generation failures. */
export class UrlServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlServiceError";
  }
}

/** Validate and normalize the untrusted URL coming from the request body. */
export function validateUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) {
    throw new UrlServiceError("url is required and must be a non-empty string");
  }
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    throw new UrlServiceError("url must start with http:// or https://");
  }
  try {
    // eslint-disable-next-line no-new
    new URL(raw);
  } catch {
    throw new UrlServiceError("url is not a valid URL");
  }
  return raw;
}

function buildShortUrl(port: number, code: string): string {
  return `http://localhost:${port}/${code}`;
}

/**
 * Coordinates validation, code generation, creation, redirection and stats.
 */
export class UrlService {
  private readonly codeGenerator: CodeGenerator;

  constructor(
    private readonly store: UrlStore,
    private readonly port: number,
    codeGenerator: CodeGenerator = new DefaultCodeGenerator(),
  ) {
    this.codeGenerator = codeGenerator;
  }

  create(rawUrl: unknown): CreateUrlResponse {
    const url = validateUrl(rawUrl);
    const code = this.generateUniqueCode();
    this.store.save({ code, url, hits: 0 });
    return { code, shortUrl: buildShortUrl(this.port, code) };
  }

  redirect(code: string): UrlRecord | undefined {
    const existing = this.store.findByCode(code);
    if (!existing) {
      return undefined;
    }
    return this.store.incrementHits(code);
  }

  getStats(code: string): StatsResponse | undefined {
    const record = this.store.findByCode(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const code = this.codeGenerator.generate(CODE_LENGTH);
      if (!this.store.findByCode(code)) {
        return code;
      }
    }
    throw new UrlServiceError("Unable to generate a unique short code");
  }
}