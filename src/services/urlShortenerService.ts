import { randomBytes } from 'crypto';
import { UrlRecord, UrlStore } from '../types/url';

const CODE_LENGTH = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const DEFAULT_PORT = 3000;

export function generateCodeBytes(): Buffer {
  return randomBytes(CODE_LENGTH);
}

export function bytesToCode(bytes: Buffer): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export function generateUniqueCode(store: UrlStore): string {
  let code: string;
  do {
    const bytes = generateCodeBytes();
    code = bytesToCode(bytes);
  } while (store.findByCode(code) !== undefined);
  return code;
}

export function validateUrl(url: unknown): string | null {
  if (typeof url !== 'string') {
    return 'url must be a string';
  }
  if (url.length === 0) {
    return 'url must not be empty';
  }
  if (!/^https?:\/\//i.test(url)) {
    return 'url must start with http:// or https://';
  }
  return null;
}

export function getPort(): number {
  const envPort = process.env.PORT;
  if (envPort === undefined || envPort === '' || envPort === 'undefined') {
    return DEFAULT_PORT;
  }
  const port = parseInt(envPort, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${envPort}". Must be a positive integer between 1 and 65535.`);
  }
  return port;
}

export function createShortUrlRecord(url: string, store: UrlStore, port: number): UrlRecord {
  const code = generateUniqueCode(store);
  const record: UrlRecord = { code, url, hits: 0 };
  store.save(record);
  return record;
}

export function buildShortUrl(code: string, port: number): string {
  return `http://localhost:${port}/${code}`;
}