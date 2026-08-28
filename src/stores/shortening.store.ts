export type Shortening = {
  code: string;
  url: string;
  hits: number;
};

export interface ShorteningStore {
  has(code: string): boolean;
  find(code: string): Shortening | undefined;
  save(shortening: Shortening): void;
  incrementHits(code: string): Shortening | undefined;
}

export class InMemoryShorteningStore implements ShorteningStore {
  private readonly records: Map<string, Shortening> = new Map();

  has(code: string): boolean {
    return this.records.has(code);
  }

  find(code: string): Shortening | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    return { ...record };
  }

  save(shortening: Shortening): void {
    if (this.records.has(shortening.code)) {
      throw new Error(
        `A shortening with code "${shortening.code}" already exists.`
      );
    }
    this.records.set(shortening.code, { ...shortening });
  }

  incrementHits(code: string): Shortening | undefined {
    const record = this.records.get(code);
    if (record === undefined) {
      return undefined;
    }
    record.hits += 1;
    return { ...record };
  }
}