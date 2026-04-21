import type { LitVarPublication, LitVarVariant } from './interfaces/litvar.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/litvar2-api';

interface RawVariantResult {
  readonly rsid: string;
  readonly hgvs_list: ReadonlyArray<string>;
  readonly gene: string;
  readonly pmid_count: number;
}

interface RawVariantResponse {
  readonly results: ReadonlyArray<RawVariantResult>;
}

export async function variant(rsid: string): Promise<LitVarVariant> {
  if (!rsid) {
    throw new Error('rsid must not be empty');
  }

  const url = `${BASE_URL}/variant/get/litvar/${encodeURIComponent(rsid)}%23%23`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`LitVar API returned status ${response.status}`);
  }

  const raw: RawVariantResponse = await response.json();

  if (!raw.results || raw.results.length === 0) {
    throw new Error(`No variant found for ${rsid}`);
  }

  const result = raw.results[0]!;

  return {
    rsid: result.rsid,
    hgvs: result.hgvs_list,
    gene: result.gene,
    publicationCount: result.pmid_count,
  };
}

export async function publications(rsid: string): Promise<ReadonlyArray<LitVarPublication>> {
  if (!rsid) {
    throw new Error('rsid must not be empty');
  }

  const url = `${BASE_URL}/variant/publications/litvar/${encodeURIComponent(rsid)}%23%23`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`LitVar API returned status ${response.status}`);
  }

  const raw: ReadonlyArray<LitVarPublication> = await response.json();

  return raw;
}
