import { randomInt } from 'node:crypto';
import { UrlStore } from '../store/url.store';

export const CODE_LENGTH = 6;
export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateUniqueCode(store: UrlStore): string {
  let code: string;
  do {
    code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
  } while (store.has(code));
  return code;
}