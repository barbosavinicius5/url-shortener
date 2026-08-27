import { randomBytes } from 'node:crypto';
import { LinkRecord, CreateLinkResponse, LinkStatsResponse } from '../types/link';
import { LinkStore } from '../stores/link-store';
import { getBaseUrl } from '../config';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 6;

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

function isValidUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface CreateLinkInput {
  url: string;
}

export interface ValidationError {
  valid: false;
  message: string;
}

export interface ValidInput {
  valid: true;
  url: string;
}

export type CreateLinkValidation = ValidationError | ValidInput;

export function validateCreateLink(body: unknown): CreateLinkValidation {
  if (body === null || body === undefined || typeof body !== 'object') {
    return { valid: false, message: 'Request body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;
  const url = obj['url'];

  if (url === undefined || url === null) {
    return { valid: false, message: 'url is required' };
  }

  if (!isValidUrl(url)) {
    return { valid: false, message: 'url must be a valid HTTP or HTTPS URL' };
  }

  return { valid: true, url };
}

export class ShortenerService {
  private readonly store: LinkStore;
  private readonly baseUrl: string;

  constructor(store: LinkStore, port: number) {
    this.store = store;
    this.baseUrl = getBaseUrl(port);
  }

  createLink(url: string): CreateLinkResponse {
    let code: string;
    do {
      code = generateCode();
    } while (this.store.hasCode(code));

    const record: LinkRecord = {
      code,
      originalUrl: url,
      hits: 0,
    };

    this.store.save(record);

    return {
      code,
      shortUrl: `${this.baseUrl}/${code}`,
    };
  }

  getByCode(code: string): LinkRecord | undefined {
    return this.store.getByCode(code);
  }

  findAndIncrement(code: string): LinkRecord | undefined {
    return this.store.incrementHits(code);
  }

  getStats(code: string): LinkStatsResponse | undefined {
    const record = this.store.getByCode(code);
    if (!record) {
      return undefined;
    }
    return {
      code: record.code,
      url: record.originalUrl,
      hits: record.hits,
    };
  }
}