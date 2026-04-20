import type {
  AnnotateOptions,
  BioDocument,
  EntityMatch,
  EntityType,
  ExportOptions,
  SearchOptions,
  SearchResult,
} from './interfaces/pubtator.interface.js';
import { parseBioC } from './parse-bioc.js';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api';

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

async function assertOk(response: Response, errorPrefix: string): Promise<void> {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const detail = body ? `: ${body.slice(0, 200)}` : '';
    throw new Error(`${errorPrefix}: HTTP ${response.status}${detail}`);
  }
}

async function fetchJson<T>(url: string, errorPrefix: string): Promise<T> {
  const response = await fetch(url);
  await assertOk(response, errorPrefix);
  return response.json() as Promise<T>;
}

async function fetchText(url: string, errorPrefix: string, init?: RequestInit): Promise<string> {
  const response = init !== undefined ? await fetch(url, init) : await fetch(url);
  await assertOk(response, errorPrefix);
  return response.text();
}

function appendParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value !== undefined) {
    params.set(key, value);
  }
}

export class PubTator {
  public async findEntity(
    query: string,
    entityType?: EntityType,
  ): Promise<ReadonlyArray<EntityMatch>> {
    const params = new URLSearchParams({ query });
    appendParam(params, 'type', entityType);

    const data = await fetchJson<ReadonlyArray<EntityApiResponse>>(
      `${BASE_URL}/entity/autocomplete/?${params.toString()}`,
      'PubTator3 entity search failed',
    );

    return data.map((item) => ({
      id: item.db_id,
      name: item.name,
      type: item.biotype as EntityType,
    }));
  }

  public async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams({ text: query });
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.pageSize !== undefined) params.set('pagesize', String(options.pageSize));

    const data = await fetchJson<SearchApiResponse>(
      `${BASE_URL}/search/?${params.toString()}`,
      'PubTator3 search failed',
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

  public async export(pmids: ReadonlyArray<string>, options?: ExportOptions): Promise<BioDocument> {
    const format = options?.format ?? 'json';
    const params = new URLSearchParams({ pmids: pmids.join(',') });
    if (options?.full !== undefined) params.set('full', String(options.full));

    const text = await fetchText(
      `${BASE_URL}/publications/export/bioc${format}?${params.toString()}`,
      'PubTator3 export failed',
    );

    if (!text.trim()) return { documents: [] };
    return parseBioC(text);
  }

  public async annotateByPmid(
    pmids: ReadonlyArray<string>,
    options?: AnnotateOptions,
  ): Promise<string> {
    const params = new URLSearchParams({ pmids: pmids.join(',') });
    appendParam(params, 'concepts', options?.concept);
    appendParam(params, 'type', options?.format);

    return fetchText(
      `${BASE_URL}/publications/annotate?${params.toString()}`,
      'PubTator3 annotate failed',
    );
  }

  public async annotateText(text: string, options?: AnnotateOptions): Promise<string> {
    const params = new URLSearchParams();
    appendParam(params, 'concepts', options?.concept);
    appendParam(params, 'type', options?.format);

    const query = params.toString();
    const url = query ? `${BASE_URL}/annotate/text/?${query}` : `${BASE_URL}/annotate/text/`;

    return fetchText(url, 'PubTator3 text annotation failed', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: text,
    });
  }
}
