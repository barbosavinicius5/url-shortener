import { randomInt } from 'node:crypto';
import type { LinkRecord, LinkStats, LinkStore } from '../domain/link.js';

const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 100;
const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export type CodeGenerator = () => string;

export class InvalidUrlError extends Error {
  constructor() {
    super('URL must start with http:// or https://');
    this.name = 'InvalidUrlError';
  }
}

function generateRandomCode(): string {
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHANUMERIC_CHARS[randomInt(ALPHANUMERIC_CHARS.length)];
  }
  return code;
}

export class LinkService {
  constructor(
    private readonly store: LinkStore,
    private readonly codeGenerator: CodeGenerator = generateRandomCode,
  ) {}

  createLink(url: string): LinkRecord {
    if (!this.isValidUrl(url)) {
      throw new InvalidUrlError();
    }

    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const code = this.codeGenerator();
      if (!this.store.get(code)) {
        const record: LinkRecord = { code, url, hits: 0 };
        this.store.save(record);
        return record;
      }
    }

    throw new Error('Unable to generate a unique short code');
  }

  resolveAndCount(code: string): string | undefined {
    const record = this.store.incrementHits(code);
    return record?.url;
  }

  getStats(code: string): LinkStats | undefined {
    const record = this.store.get(code);
    return record ? { code: record.code, url: record.url, hits: record.hits } : undefined;
  }

  private isValidUrl(url: string): boolean {
    return typeof url === 'string' && url.length > 0 && /^https?:\/\//i.test(url);
  }
}