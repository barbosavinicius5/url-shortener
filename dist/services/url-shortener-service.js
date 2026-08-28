const CODE_LENGTH = 6;
const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function generateCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
}
function generateUniqueCode(store) {
    let code;
    do {
        code = generateCode();
    } while (store.findByCode(code) !== undefined);
    return code;
}
export class UrlShortenerService {
    store;
    baseUrl;
    constructor(store, port) {
        this.store = store;
        this.baseUrl = `http://localhost:${port}`;
    }
    create(url) {
        if (typeof url !== 'string') {
            return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
        }
        const trimmed = url.trim();
        if (trimmed === '') {
            return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
        }
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
            return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
        }
        try {
            new URL(trimmed);
        }
        catch {
            return { ok: false, error: 'url must be a valid HTTP or HTTPS URL' };
        }
        const code = generateUniqueCode(this.store);
        this.store.save({ code, url: trimmed, hits: 0 });
        return {
            ok: true,
            value: { code, shortUrl: `${this.baseUrl}/${code}` },
        };
    }
    resolve(code) {
        const result = this.store.incrementHits(code);
        if (result === undefined) {
            return { ok: false };
        }
        return { ok: true, value: result };
    }
    getStats(code) {
        const record = this.store.findByCode(code);
        if (record === undefined) {
            return { ok: false };
        }
        return {
            ok: true,
            value: { code: record.code, url: record.url, hits: record.hits },
        };
    }
}
//# sourceMappingURL=url-shortener-service.js.map