import type {
  AnnotateOptions,
  BiocOptions,
  BioDocument,
  EntityMatch,
  EntityType,
  ExportOptions,
  RelatedEntity,
  RelationType,
  SearchOptions,
  SearchResult,
} from './interfaces/pubtator.interface';
import { parseBioC } from './parse-bioc';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api';

interface EntityApiResponse {
  readonly id: string;
  readonly name: string;
  readonly type: EntityType;
  readonly score: number;
}

interface RelationApiResponse {
  readonly id: string;
  readonly name: string;
  readonly type: EntityType;
  readonly relation_type: RelationType;
  readonly pmids: ReadonlyArray<string>;
  readonly score: number;
}

interface SearchApiResult {
  readonly pmid: string;
  readonly title: string;
  readonly journal: string;
  readonly year: number;
  readonly authors: ReadonlyArray<string>;
}

interface SearchApiResponse {
  readonly total: number;
  readonly page: number;
  readonly pagesize: number;
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
      id: item.id,
      name: item.name,
      type: item.type,
      score: item.score,
    }));
  }

  public async findRelations(
    entityId: string,
    targetType: EntityType,
    relationType: RelationType,
  ): Promise<ReadonlyArray<RelatedEntity>> {
    const params = new URLSearchParams({
      e1: entityId,
      type: targetType,
      relation: relationType,
    });

    const data = await fetchJson<ReadonlyArray<RelationApiResponse>>(
      `${BASE_URL}/entity/relations/?${params.toString()}`,
      'PubTator3 relations search failed',
    );

    return data.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      relationType: item.relation_type,
      pmids: item.pmids,
      score: item.score,
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
      total: data.total,
      page: data.page,
      pageSize: data.pagesize,
      results: data.results.map((r) => ({
        pmid: r.pmid,
        title: r.title,
        journal: r.journal,
        year: r.year,
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

  readonly bioc = {
    pmc: async (id: string, options?: BiocOptions): Promise<BioDocument> => {
      const format = options?.format ?? 'json';
      const params = new URLSearchParams();
      appendParam(params, 'encoding', options?.encoding);

      const query = params.toString();
      const base = `${BASE_URL}/publications/pmc/${id}/bioc${format}`;
      const url = query ? `${base}?${query}` : base;

      const text = await fetchText(url, `PubTator3 BioC PMC fetch failed for ${id}`);
      return parseBioC(text);
    },

    pubmed: async (pmid: string, options?: BiocOptions): Promise<BioDocument> => {
      const format = options?.format ?? 'json';
      const params = new URLSearchParams();
      appendParam(params, 'encoding', options?.encoding);

      const query = params.toString();
      const base = `${BASE_URL}/publications/${pmid}/bioc${format}`;
      const url = query ? `${base}?${query}` : base;

      const text = await fetchText(url, `PubTator3 BioC fetch failed for ${pmid}`);
      return parseBioC(text);
    },
  };
}
