import { UrlRecord } from '../domain/types';

export class UrlStore {
  private readonly records = new Map<string, UrlRecord>();

  find(code: string): UrlRecord | undefined {
    return this.records.get(code);
  }

  save(record: UrlRecord): void {
    this.records.set(record.code, record);
  }
}