import { LinkRecord, StatsResponse } from '../types/link.js';
import { LinkStore } from '../store/link-store.js';

const CODE_LENGTH = 6;
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHANUMERIC.charAt(Math.floor(Math.random() * ALPHANUMERIC.length));
  }
  return code;
}

export class UrlShortenerService {
  constructor(private readonly store: LinkStore) {}

  generateUniqueCode(): string {
    let code: string;
    do {
      code = generateCode();
    } while (this.store.find(code) !== undefined);
    return code;
  }

  createLink(url: string): LinkRecord {
    const code = this.generateUniqueCode();
    const link: LinkRecord = { code, url, hits: 0 };
    this.store.save(link);
    return { ...link };
  }

  findLink(code: string): LinkRecord | undefined {
    return this.store.find(code);
  }

  redirect(code: string): LinkRecord | undefined {
    const updated = this.store.incrementHits(code);
    return updated;
  }

  getStats(code: string): StatsResponse | undefined {
    const link = this.store.find(code);
    if (!link) {
      return undefined;
    }
    return { code: link.code, url: link.url, hits: link.hits };
  }
}