import { UrlRecord } from '../types/url';

export interface UrlStore {
  create(record: UrlRecord): void;
  findByCode(code: string): UrlRecord | undefined;
  incrementHits(code: string): UrlRecord | undefined;
}