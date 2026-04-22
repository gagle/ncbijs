import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './icite-client';
import type { ICiteClientConfig } from './icite-client';
import type { ICiteConfig, ICitePublication } from './interfaces/icite.interface';

const BASE_URL = 'https://icite.od.nih.gov/api/pubs';
const REQUESTS_PER_SECOND = 2;
const MAX_PMIDS_PER_REQUEST = 1000;

/** NIH iCite API client for retrieving citation metrics and influence data. */
export class ICite {
  private readonly _config: ICiteClientConfig;

  constructor(config?: ICiteConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /**
   * Fetch citation metrics for one or more publications by PMID.
   * @param pmids - Array of PubMed IDs (maximum 1000 per request).
   */
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

  /**
   * Fetch full citation metrics for all publications that cite a given article.
   * @param pmid - PubMed ID of the article whose citers to retrieve.
   */
  public async citedBy(pmid: number): Promise<ReadonlyArray<ICitePublication>> {
    const [source] = await this.publications([pmid]);
    if (!source || source.citedByPmids.length === 0) {
      return [];
    }

    return this._fetchInBatches(source.citedByPmids);
  }

  /**
   * Fetch full citation metrics for all publications referenced by a given article.
   * @param pmid - PubMed ID of the article whose references to retrieve.
   */
  public async references(pmid: number): Promise<ReadonlyArray<ICitePublication>> {
    const [source] = await this.publications([pmid]);
    if (!source || source.referencesPmids.length === 0) {
      return [];
    }

    return this._fetchInBatches(source.referencesPmids);
  }

  private async _fetchInBatches(
    pmids: ReadonlyArray<number>,
  ): Promise<ReadonlyArray<ICitePublication>> {
    const results: Array<ICitePublication> = [];

    for (let offset = 0; offset < pmids.length; offset += MAX_PMIDS_PER_REQUEST) {
      const batch = pmids.slice(offset, offset + MAX_PMIDS_PER_REQUEST);
      const publications = await this.publications(batch);
      results.push(...publications);
    }

    return results;
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
  readonly citations_per_year?: number | null;
  readonly is_clinical?: boolean;
  readonly provisional?: boolean;
  readonly human?: number;
  readonly animal?: number;
  readonly molecular_cellular?: number;
  readonly apt?: number;
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
    citationsPerYear: raw.citations_per_year ?? undefined,
    isClinicallyCited: raw.is_clinical ?? false,
    provisional: raw.provisional ?? false,
    human: raw.human ?? 0,
    animal: raw.animal ?? 0,
    molecularCellular: raw.molecular_cellular ?? 0,
    apt: raw.apt ?? 0,
    citedByPmids: raw.cited_by ?? [],
    referencesPmids: raw.references ?? [],
    doi: raw.doi ?? '',
  };
}
