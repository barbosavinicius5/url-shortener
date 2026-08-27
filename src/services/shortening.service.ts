import { randomInt } from "node:crypto";

import type { ShorteningStore } from "../stores/shortening.store";
import type {
  CreateShorteningResponse,
  ShorteningRecord,
  ShorteningStatsResponse,
} from "../types/shortening";

export const CODE_LENGTH = 6;
export const CODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export type CreateShorteningResult =
  | { ok: true; data: CreateShorteningResponse }
  | { ok: false; error: string };

export type RedirectResult = { ok: true; url: string } | { ok: false };

export type StatsResult =
  | { ok: true; data: ShorteningStatsResponse }
  | { ok: false };

export interface ShorteningServiceOptions {
  store: ShorteningStore;
  port: number;
}

/**
 * A valid url is a non-empty string that starts exactly with `http://` or
 * `https://`. No full URL parsing, normalization or deduplication is applied:
 * the prefix rule is the product contract.
 */
export function isValidHttpUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    (value.startsWith("http://") || value.startsWith("https://"))
  );
}

function generateRandomCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Business rules for shortening: validation, code generation (with collision
 * retry), record creation, redirects and stats snapshots.
 */
export class ShorteningService {
  private readonly store: ShorteningStore;
  private readonly port: number;

  constructor(options: ShorteningServiceOptions) {
    this.store = options.store;
    this.port = options.port;
  }

  /** Validates the raw url value, creates the record and returns the response. */
  createShortening(rawUrl: unknown): CreateShorteningResult {
    if (!isValidHttpUrl(rawUrl)) {
      return {
        ok: false,
        error: "url must be a non-empty string starting with http:// or https://",
      };
    }
    const url = rawUrl;
    const code = this.generateUnusedCode();
    const record: ShorteningRecord = { code, url, hits: 0 };
    this.store.save(record);
    return {
      ok: true,
      data: { code, shortUrl: `http://localhost:${this.port}/${code}` },
    };
  }

  /** Resolves the redirect target, incrementing hits exactly once. */
  resolveRedirect(code: string): RedirectResult {
    const record = this.store.incrementHits(code);
    if (record === undefined) {
      return { ok: false };
    }
    return { ok: true, url: record.url };
  }

  /** Returns the stats snapshot without mutating the record. */
  getStats(code: string): StatsResult {
    const record = this.store.findByCode(code);
    if (record === undefined) {
      return { ok: false };
    }
    return {
      ok: true,
      data: { code: record.code, url: record.url, hits: record.hits },
    };
  }

  private generateUnusedCode(): string {
    let code = generateRandomCode();
    while (this.store.findByCode(code) !== undefined) {
      code = generateRandomCode();
    }
    return code;
  }
}