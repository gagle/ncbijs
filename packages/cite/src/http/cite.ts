import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchText } from './cite-client';
import type { CiteClientConfig } from './cite-client';
import type {
  CitationData,
  CitationFormat,
  CitationSource,
  CiteConfig,
  CSLData,
} from '../interfaces/cite.interface';

const BASE_URL = 'https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1';
const REQUEST_DELAY_MS = 334;
const REQUESTS_PER_SECOND = 3;

/** Client for the NCBI Literature Citation Exporter API. */
export class Cite {
  private readonly _config: CiteClientConfig;

  constructor(config?: CiteConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Fetch a formatted citation for a PubMed or PMC article. */
  public cite(id: string, format: 'csl', source?: CitationSource): Promise<CSLData>;
  public cite(id: string, format: 'citation', source?: CitationSource): Promise<CitationData>;
  public cite(id: string, format: 'ris' | 'medline', source?: CitationSource): Promise<string>;
  public cite(
    id: string,
    format: CitationFormat,
    source?: CitationSource,
  ): Promise<string | CSLData | CitationData> {
    return this.fetchCitation(id, format, source);
  }

  /** Fetch formatted citations for multiple articles, yielding results one at a time. */
  public async *citeMany(
    ids: ReadonlyArray<string>,
    format: CitationFormat,
    source?: CitationSource,
  ): AsyncIterableIterator<Readonly<{ id: string; citation: string | CSLData | CitationData }>> {
    for (const [index, id] of ids.entries()) {
      if (index > 0) {
        await delay(REQUEST_DELAY_MS);
      }

      const citation = await this.fetchCitation(id, format, source);
      yield { id, citation };
    }
  }

  private async fetchCitation(
    id: string,
    format: CitationFormat,
    source?: CitationSource,
  ): Promise<string | CSLData | CitationData> {
    if (!id) {
      throw new Error('id must not be empty');
    }

    const resolvedSource = source ?? 'pubmed';
    const url = buildCitationUrl(id, format, resolvedSource);

    let text: string;
    try {
      text = await fetchText(url, this._config);
    } catch (error: unknown) {
      if (isHttpError(error) && error.status === 404) {
        throw new Error(`Article not found: ${id}`, { cause: error });
      }
      throw error;
    }

    if (format === 'csl') {
      return parseJsonResponse<CSLData>(text, 'type');
    }

    if (format === 'citation') {
      return parseJsonResponse<CitationData>(text, 'id');
    }

    return text;
  }
}

function buildCitationUrl(id: string, format: CitationFormat, source: CitationSource): string {
  const url = new URL(`${BASE_URL}/${source}/`);
  url.searchParams.set('format', format);
  url.searchParams.set('id', id);
  return url.toString();
}

function parseJsonResponse<T>(text: string, requiredKey: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Citation Exporter API returned malformed JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || !(requiredKey in parsed)) {
    throw new Error('Citation Exporter API returned malformed JSON');
  }

  return parsed as T;
}

function isHttpError(error: unknown): error is { status: number } {
  return typeof error === 'object' && error !== null && 'status' in error;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
