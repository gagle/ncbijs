import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './books-client';
import type { BooksClientConfig } from './books-client';
import type { BooksConfig, BooksRecord, BooksSearchResult } from './interfaces/books.interface';

const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const REQUESTS_PER_SECOND_DEFAULT = 3;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class Books {
  private readonly _config: BooksClientConfig;

  constructor(config?: BooksConfig) {
    const requestsPerSecond = config?.apiKey
      ? REQUESTS_PER_SECOND_WITH_KEY
      : REQUESTS_PER_SECOND_DEFAULT;

    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      ...(config?.tool !== undefined && { tool: config.tool }),
      ...(config?.email !== undefined && { email: config.email }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond }),
    };
  }

  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<BooksSearchResult> {
    const params = new URLSearchParams({
      db: 'books',
      term,
      retmode: 'json',
    });

    if (options?.retmax !== undefined) {
      params.set('retmax', String(options.retmax));
    }

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esearch.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESearchResponse>(url, this._config);

    return {
      total: Number(raw.esearchresult?.count ?? '0'),
      ids: raw.esearchresult?.idlist ?? [],
    };
  }

  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<BooksRecord>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<BooksRecord>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'books',
      id: ids.join(','),
      retmode: 'json',
    });

    appendCredentials(params, this._config);

    const url = `${BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const records: Array<BooksRecord> = [];

    for (const uid of uids) {
      const entry = getBooksEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      records.push(mapBooksRecord(entry));
    }

    return records;
  }
}

function getBooksEntry(result: RawESummaryResult, uid: string): RawBooksEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawBooksEntry;
}

function appendCredentials(params: URLSearchParams, config: BooksClientConfig): void {
  if (config.apiKey !== undefined) {
    params.set('api_key', config.apiKey);
  }

  if (config.tool !== undefined) {
    params.set('tool', config.tool);
  }

  if (config.email !== undefined) {
    params.set('email', config.email);
  }
}

interface RawESearchResponse {
  readonly esearchresult?: {
    readonly count?: string;
    readonly idlist?: ReadonlyArray<string>;
  };
}

interface RawESummaryResponse {
  readonly result?: RawESummaryResult;
}

type RawESummaryResult = Record<string, unknown> & {
  readonly uids?: ReadonlyArray<string>;
};

interface RawBooksEntry {
  readonly uid?: string;
  readonly title?: string;
  readonly pubdate?: string;
  readonly id?: string;
  readonly accessionid?: string;
  readonly parents?: string;
  readonly rtype?: string;
  readonly rid?: string;
  readonly text?: string;
  readonly bookid?: number;
  readonly bookaccessionid?: string;
  readonly chapterid?: number;
  readonly chapteraccessionid?: string;
  readonly book?: string;
  readonly navigation?: string;
  readonly error?: string;
}

function mapBooksRecord(raw: RawBooksEntry): BooksRecord {
  return {
    uid: raw.uid ?? '',
    title: raw.title ?? '',
    publicationDate: raw.pubdate ?? '',
    entryId: raw.id ?? '',
    accessionId: raw.accessionid ?? '',
    parents: raw.parents ?? '',
    resourceType: raw.rtype ?? '',
    resourceId: raw.rid ?? '',
    text: raw.text ?? '',
    bookId: raw.bookid ?? 0,
    bookAccessionId: raw.bookaccessionid ?? '',
    chapterId: raw.chapterid ?? 0,
    chapterAccessionId: raw.chapteraccessionid ?? '',
    bookName: raw.book ?? '',
    navigation: raw.navigation ?? '',
  };
}
