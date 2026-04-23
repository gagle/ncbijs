import {
  EUTILS_BASE_URL,
  EUTILS_REQUESTS_PER_SECOND,
  EUTILS_REQUESTS_PER_SECOND_WITH_KEY,
  appendEUtilsCredentials,
} from '@ncbijs/eutils/config';
import { TokenBucket } from '@ncbijs/rate-limiter';
import {
  readAllTags,
  readAllTagsWithAttributes,
  readBlock,
  readAllBlocksWithAttributes,
} from '@ncbijs/xml';
import { fetchJson } from './medgen-client';
import type { MedGenClientConfig } from './medgen-client';
import type {
  MedGenClinicalFeature,
  MedGenConcept,
  MedGenConfig,
  MedGenDefinition,
  MedGenGene,
  MedGenInheritance,
  MedGenName,
  MedGenSearchResult,
} from '../interfaces/medgen.interface';

/** MedGen medical genetics concept lookup client. */
export class MedGen {
  private readonly _config: MedGenClientConfig;

  constructor(config?: MedGenConfig) {
    const requestsPerSecond = config?.apiKey
      ? EUTILS_REQUESTS_PER_SECOND_WITH_KEY
      : EUTILS_REQUESTS_PER_SECOND;

    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      ...(config?.tool !== undefined && { tool: config.tool }),
      ...(config?.email !== undefined && { email: config.email }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond }),
    };
  }

  /** Search MedGen by text query and return matching concept IDs. */
  public async search(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<MedGenSearchResult> {
    const params = new URLSearchParams({
      db: 'medgen',
      term,
      retmode: 'json',
    });

    if (options?.retmax !== undefined) {
      params.set('retmax', String(options.retmax));
    }

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esearch.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESearchResponse>(url, this._config);

    return {
      total: Number(raw.esearchresult?.count ?? '0'),
      ids: raw.esearchresult?.idlist ?? [],
    };
  }

  /** Search MedGen and fetch full concept details in a single call. */
  public async searchAndFetch(
    term: string,
    options?: { readonly retmax?: number },
  ): Promise<ReadonlyArray<MedGenConcept>> {
    const searchResult = await this.search(term, options);

    if (searchResult.ids.length === 0) {
      return [];
    }

    return this.fetch(searchResult.ids);
  }

  /** Fetch MedGen concept details by their UIDs. */
  public async fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<MedGenConcept>> {
    if (ids.length === 0) {
      return [];
    }

    const params = new URLSearchParams({
      db: 'medgen',
      id: ids.join(','),
      retmode: 'json',
    });

    appendEUtilsCredentials(params, this._config);

    const url = `${EUTILS_BASE_URL}/esummary.fcgi?${params.toString()}`;
    const raw = await fetchJson<RawESummaryResponse>(url, this._config);

    const result = raw.result ?? {};
    const uids = result.uids ?? [];

    const concepts: Array<MedGenConcept> = [];

    for (const uid of uids) {
      const entry = getMedGenEntry(result, uid);

      if (entry === undefined || 'error' in entry) {
        continue;
      }

      concepts.push(mapMedGenConcept(entry));
    }

    return concepts;
  }
}

function getMedGenEntry(result: RawESummaryResult, uid: string): RawMedGenEntry | undefined {
  const entry: unknown = result[uid];

  if (entry === undefined || typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }

  return entry as RawMedGenEntry;
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

interface RawMedGenEntry {
  readonly uid?: string;
  readonly conceptid?: string;
  readonly title?: string;
  readonly definition?: { readonly value?: string };
  readonly semantictype?: { readonly value?: string };
  readonly conceptmeta?: string;
  readonly error?: string;
}

function mapMedGenConcept(raw: RawMedGenEntry): MedGenConcept {
  const conceptMeta = raw.conceptmeta ?? '';

  return {
    uid: raw.uid ?? '',
    conceptId: raw.conceptid ?? '',
    title: raw.title ?? '',
    definition: raw.definition?.value ?? '',
    semanticType: raw.semantictype?.value ?? '',
    associatedGenes: parseAssociatedGenes(conceptMeta),
    modesOfInheritance: parseModesOfInheritance(conceptMeta),
    clinicalFeatures: parseClinicalFeatures(conceptMeta),
    omimIds: parseOmimIds(conceptMeta),
    definitions: parseDefinitions(conceptMeta),
    names: parseNames(conceptMeta),
  };
}

function parseAssociatedGenes(xml: string): ReadonlyArray<MedGenGene> {
  const block = readBlock(xml, 'AssociatedGenes');

  if (block === undefined) {
    return [];
  }

  return readAllTagsWithAttributes(block, 'Gene').map((gene) => ({
    geneId: Number(gene.attributes['gene_id'] ?? '0') || 0,
    symbol: gene.text,
    chromosome: gene.attributes['chromosome'] ?? '',
    cytogeneticLocation: gene.attributes['cytogen_loc'] ?? '',
  }));
}

function parseModesOfInheritance(xml: string): ReadonlyArray<MedGenInheritance> {
  const block = readBlock(xml, 'ModesOfInheritance');

  if (block === undefined) {
    return [];
  }

  return readAllBlocksWithAttributes(block, 'ModeOfInheritance').map((mode) => ({
    name: mode.attributes['Name'] ?? '',
    cui: mode.attributes['CUI'] ?? '',
  }));
}

function parseClinicalFeatures(xml: string): ReadonlyArray<MedGenClinicalFeature> {
  const block = readBlock(xml, 'ClinicalFeatures');

  if (block === undefined) {
    return [];
  }

  return readAllBlocksWithAttributes(block, 'ClinicalFeature').map((feature) => ({
    name: feature.attributes['Name'] ?? '',
    hpoId: feature.attributes['SDUI'] ?? '',
    cui: feature.attributes['CUI'] ?? '',
  }));
}

function parseOmimIds(xml: string): ReadonlyArray<string> {
  return readAllTags(xml, 'MIM');
}

function parseDefinitions(xml: string): ReadonlyArray<MedGenDefinition> {
  const block = readBlock(xml, 'Definitions');

  if (block === undefined) {
    return [];
  }

  return readAllTagsWithAttributes(block, 'Definition').map((definition) => ({
    source: definition.attributes['SAB'] ?? '',
    text: definition.text,
  }));
}

function parseNames(xml: string): ReadonlyArray<MedGenName> {
  const block = readBlock(xml, 'Names');

  if (block === undefined) {
    return [];
  }

  return readAllTagsWithAttributes(block, 'Name').map((name) => ({
    name: name.text,
    source: name.attributes['SAB'] ?? '',
    type: name.attributes['type'] ?? '',
  }));
}
