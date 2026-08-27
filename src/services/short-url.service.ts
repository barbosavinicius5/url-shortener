import type {
  CreateShortUrlResponse,
  ShortUrlStatsResponse,
  ShortUrlStore,
} from "../types";
import { generateCode } from "../validation/url-validation";

const CODE_LENGTH = 6;
const MAX_CODE_GENERATION_ATTEMPTS = 100;

/** Thrown only in pathological cases (e.g. adversarial store); never part of the normal contract. */
export class CodeGenerationError extends Error {
  constructor() {
    super("Failed to generate a unique short code");
    this.name = "CodeGenerationError";
  }
}

export class ShortUrlService {
  constructor(
    private readonly store: ShortUrlStore,
    private readonly baseUrl: string,
  ) {}

  create(url: string): CreateShortUrlResponse {
    const code = this.reserveUniqueCode();
    this.store.set(code, { code, url, hits: 0 });
    return { code, shortUrl: `${this.baseUrl}/${code}` };
  }

  /** Resolves the redirect target, incrementing hits exactly once when found. */
  redirect(code: string): string | undefined {
    const record = this.store.incrementHits(code);
    return record?.url;
  }

  stats(code: string): ShortUrlStatsResponse | undefined {
    const record = this.store.get(code);
    if (!record) {
      return undefined;
    }
    return { code: record.code, url: record.url, hits: record.hits };
  }

  private reserveUniqueCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = generateCode(CODE_LENGTH);
      if (!this.store.has(code)) {
        return code;
      }
    }
    throw new CodeGenerationError();
  }
}