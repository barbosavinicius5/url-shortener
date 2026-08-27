import { CreateShortUrlResult, UrlRecord, UrlStore } from '../types/url';

export const CODE_LENGTH = 6;
export const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export class ServiceValidationError extends Error {}
export class CodeNotFoundError extends Error {}

export type CodeGenerator = () => string;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export class UrlShortenerService {
  constructor(
    private readonly store: UrlStore,
    private readonly port: number,
    private readonly codeGenerator: CodeGenerator = randomCode
  ) {}

  create(input: unknown): CreateShortUrlResult {
    if (!this.isValidInput(input)) {
      throw new ServiceValidationError('Forneça uma URL HTTP ou HTTPS válida');
    }
    let code: string;
    do {
      code = this.codeGenerator();
    } while (this.store.get(code));
    const record: UrlRecord = { code, url: input.url, hits: 0 };
    this.store.save(record);
    return { code, shortUrl: `http://localhost:${this.port}/${code}` };
  }

  stats(code: string): Pick<UrlRecord, 'code' | 'url' | 'hits'> {
    const record = this.store.get(code);
    if (!record) throw new CodeNotFoundError('Código não encontrado');
    return { code: record.code, url: record.url, hits: record.hits };
  }

  redirect(code: string): string {
    const record = this.store.incrementHits(code);
    if (!record) throw new CodeNotFoundError('Código não encontrado');
    return record.url;
  }

  private isValidInput(input: unknown): input is { url: string } {
    if (!input || typeof input !== 'object' || !('url' in input)) return false;
    const value = (input as { url: unknown }).url;
    return typeof value === 'string' && value.trim().length > 0 && /^https?:\/\//i.test(value);
  }
}