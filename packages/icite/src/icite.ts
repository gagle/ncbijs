import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './icite-client';
import type { ICiteClientConfig } from './icite-client';
import type { ICiteConfig, ICitePublication } from './interfaces/icite.interface';

const BASE_URL = 'https://icite.od.nih.gov/api/pubs';
const REQUESTS_PER_SECOND = 2;
const MAX_PMIDS_PER_REQUEST = 1000;

export class ICite {
  private readonly _config: ICiteClientConfig;

  constructor(config?: ICiteConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  public async publications(
    pmids: ReadonlyArray<number>,
  ): Promise<ReadonlyArray<ICitePublication>> {
    if (pmids.length === 0) {
      return [];
    }

    if (pmids.length > MAX_PMIDS_PER_REQUEST) {
      throw new Error(`Maximum ${MAX_PMIDS_PER_REQUEST} PMIDs per request`);
    }

    const joined = pmids.join(',');
    const url = `${BASE_URL}?pmids=${encodeURIComponent(joined)}&format=json`;
    const raw = await fetchJson<RawICiteResponse>(url, this._config);

    return (raw.data ?? []).map(mapPublication);
  }
}

interface RawICiteResponse {
  readonly data?: ReadonlyArray<RawICitePublication>;
}

interface RawICitePublication {
  readonly pmid?: number;
  readonly year?: number;
  readonly title?: string;
  readonly authors?: string;
  readonly journal?: string;
  readonly is_research_article?: boolean;
  readonly relative_citation_ratio?: number | null;
  readonly nih_percentile?: number | null;
  readonly cited_by_clin?: ReadonlyArray<number>;
  readonly citation_count?: number;
  readonly references_count?: number;
  readonly expected_citations_per_year?: number | null;
  readonly field_citation_rate?: number | null;
  readonly is_clinical?: boolean;
  readonly cited_by?: ReadonlyArray<number>;
  readonly references?: ReadonlyArray<number>;
  readonly doi?: string;
}

function mapPublication(raw: RawICitePublication): ICitePublication {
  return {
    pmid: raw.pmid ?? 0,
    year: raw.year ?? 0,
    title: raw.title ?? '',
    authors: raw.authors ?? '',
    journal: raw.journal ?? '',
    isResearchArticle: raw.is_research_article ?? false,
    relativeCitationRatio: raw.relative_citation_ratio ?? undefined,
    nihPercentile: raw.nih_percentile ?? undefined,
    citedByCount: raw.citation_count ?? 0,
    referencesCount: raw.references_count ?? 0,
    expectedCitationsPerYear: raw.expected_citations_per_year ?? undefined,
    fieldCitationRate: raw.field_citation_rate ?? undefined,
    isClinicallyCited: raw.is_clinical ?? false,
    citedByPmids: raw.cited_by ?? [],
    referencesPmids: raw.references ?? [],
    doi: raw.doi ?? '',
  };
}
