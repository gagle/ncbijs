import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson, fetchText } from './pubtator-client';
import type { PubTatorClientConfig } from './pubtator-client';
import type {
  AnnotateOptions,
  BioDocument,
  EntityMatch,
  EntityType,
  ExportOptions,
  PubtatorConfig,
  SearchOptions,
  SearchResult,
} from './interfaces/pubtator.interface';
import { parseBioC } from './parse-bioc';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api';
const REQUESTS_PER_SECOND = 3;

interface EntityApiResponse {
  readonly _id: string;
  readonly name: string;
  readonly biotype: string;
  readonly db_id: string;
  readonly db: string;
  readonly description: string;
  readonly match: string;
}

interface SearchApiResult {
  readonly pmid: number;
  readonly title: string;
  readonly journal: string;
  readonly date: string;
  readonly authors: ReadonlyArray<string>;
}

interface SearchApiResponse {
  readonly count: number;
  readonly current: number;
  readonly page_size: number;
  readonly results: ReadonlyArray<SearchApiResult>;
}

function appendParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value !== undefined) {
    params.set(key, value);
  }
}

/** Client for the PubTator3 API providing biomedical named entity recognition and search. */
export class PubTator {
  private readonly _config: PubTatorClientConfig;

  constructor(config?: PubtatorConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Search for biomedical entities by name with optional type filtering. */
  public async findEntity(
    query: string,
    entityType?: EntityType,
  ): Promise<ReadonlyArray<EntityMatch>> {
    const params = new URLSearchParams({ query });
    appendParam(params, 'type', entityType);

    const data = await fetchJson<ReadonlyArray<EntityApiResponse>>(
      `${BASE_URL}/entity/autocomplete/?${params.toString()}`,
      this._config,
    );

    return data.map((item) => ({
      id: item.db_id,
      name: item.name,
      type: item.biotype as EntityType,
    }));
  }

  /** Search PubTator3 for articles matching a free-text query. */
  public async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams({ text: query });
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.pageSize !== undefined) params.set('pagesize', String(options.pageSize));

    const data = await fetchJson<SearchApiResponse>(
      `${BASE_URL}/search/?${params.toString()}`,
      this._config,
    );

    return {
      total: data.count,
      page: data.current,
      pageSize: data.page_size,
      results: data.results.map((r) => ({
        pmid: String(r.pmid),
        title: r.title,
        journal: r.journal,
        year: r.date ? new Date(r.date).getFullYear() : 0,
        authors: r.authors,
      })),
    };
  }

  /** Export annotated BioC documents for the given PubMed IDs. */
  public async export(pmids: ReadonlyArray<string>, options?: ExportOptions): Promise<BioDocument> {
    const format = options?.format ?? 'json';
    const params = new URLSearchParams({ pmids: pmids.join(',') });
    if (options?.full !== undefined) params.set('full', String(options.full));

    const text = await fetchText(
      `${BASE_URL}/publications/export/bioc${format}?${params.toString()}`,
      this._config,
    );

    if (!text.trim()) return { documents: [] };
    return parseBioC(text);
  }

  /** Retrieve pre-computed annotations for the given PubMed IDs. */
  public async annotateByPmid(
    pmids: ReadonlyArray<string>,
    options?: AnnotateOptions,
  ): Promise<string> {
    const format = options?.format ?? 'pubtator';
    const params = new URLSearchParams({ pmids: pmids.join(',') });
    appendParam(params, 'concepts', options?.concept);

    return fetchText(
      `${BASE_URL}/publications/export/${format}?${params.toString()}`,
      this._config,
    );
  }

  /** Submit free text to PubTator3 for biomedical entity annotation. */
  public async annotateText(text: string, options?: AnnotateOptions): Promise<string> {
    const params = new URLSearchParams();
    appendParam(params, 'concepts', options?.concept);
    appendParam(params, 'type', options?.format);

    const query = params.toString();
    const url = query ? `${BASE_URL}/annotate/?${query}` : `${BASE_URL}/annotate/`;

    return fetchText(url, this._config, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
    });
  }
}
