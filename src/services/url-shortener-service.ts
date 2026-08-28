import { randomInt } from "node:crypto";
import type { UrlStore } from "../types/url.js";

const CODE_LENGTH = 6;
const ALPHANUMERIC_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value === "") {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = randomInt(ALPHANUMERIC_CHARACTERS.length);
    code += ALPHANUMERIC_CHARACTERS[index]!;
  }
  return code;
}

export interface ShortenResult {
  code: string;
  shortUrl: string;
}

const MAX_RETRIES = 100;

export function shortenUrl(
  url: string,
  store: UrlStore,
  baseUrl: string,
  codeGenerator: () => string = generateCode,
): ShortenResult {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const code = codeGenerator();
    const existing = store.find(code);
    if (!existing) {
      store.save(url, code);
      return { code, shortUrl: `${baseUrl}/${code}` };
    }
  }
  throw new Error("Unable to generate unique code: maximum retries exceeded");
}