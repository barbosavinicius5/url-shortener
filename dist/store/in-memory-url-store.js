export class InMemoryUrlStore {
    records = new Map();
    save(record) {
        this.records.set(record.code, { ...record });
    }
    findByCode(code) {
        const record = this.records.get(code);
        if (record === undefined) {
            return undefined;
        }
        return { ...record };
    }
    incrementHits(code) {
        const record = this.records.get(code);
        if (record === undefined) {
            return undefined;
        }
        record.hits += 1;
        return { ...record };
    }
}
//# sourceMappingURL=in-memory-url-store.js.map