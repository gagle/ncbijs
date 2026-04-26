import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './rxnorm-client';
import type { RxNormClientConfig } from './rxnorm-client';
import type {
  ApproximateTermOptions,
  ConceptGroup,
  DrugGroup,
  DrugInteraction,
  InteractionConcept,
  RxConcept,
  RxConceptHistory,
  RxConceptProperties,
  RxNormConfig,
  RxProperty,
  RxTermCandidate,
} from './interfaces/rxnorm.interface';

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const REQUESTS_PER_SECOND = 2;

/** RxNorm REST API client for drug concept lookups, interactions, and NDC codes. */
export class RxNorm {
  private readonly _config: RxNormClientConfig;

  constructor(config?: RxNormConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Look up the RxCUI for a drug by exact name match. */
  public async rxcui(name: string): Promise<RxConcept | undefined> {
    const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(name)}`;
    const raw = await fetchJson<RawRxcuiResponse>(url, this._config);
    const group = raw.idGroup;

    if (!group?.rxnormId?.[0]) {
      return undefined;
    }

    return {
      rxcui: group.rxnormId[0],
      name: '',
      tty: '',
    };
  }

  /** Fetch detailed properties for an RxNorm concept by RxCUI. */
  public async properties(rxcui: string): Promise<RxConceptProperties> {
    const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
    const raw = await fetchJson<RawPropertiesResponse>(url, this._config);
    const props = raw.properties;

    return {
      rxcui: props?.rxcui ?? '',
      name: props?.name ?? '',
      synonym: props?.synonym ?? '',
      tty: props?.tty ?? '',
      language: props?.language ?? '',
      suppress: props?.suppress ?? '',
    };
  }

  /**
   * Fetch related concepts filtered by term type (TTY).
   * @param rxcui - The RxCUI to find related concepts for.
   * @param types - Term types to filter by (e.g., 'SBD', 'SCD', 'IN').
   */
  public async relatedByType(
    rxcui: string,
    types: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<RxConcept>> {
    const ttyParam = types.join(' ');
    const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=${encodeURIComponent(ttyParam)}`;
    const raw = await fetchJson<RawRelatedResponse>(url, this._config);
    const groups = raw.relatedGroup?.conceptGroup ?? [];

    const concepts: Array<RxConcept> = [];
    for (const group of groups) {
      for (const prop of group.conceptProperties ?? []) {
        concepts.push({
          rxcui: prop.rxcui ?? '',
          name: prop.name ?? '',
          tty: prop.tty ?? '',
        });
      }
    }

    return concepts;
  }

  /** Fetch drug concepts associated with a drug name. */
  public async drugs(name: string): Promise<DrugGroup> {
    const url = `${BASE_URL}/drugs.json?name=${encodeURIComponent(name)}`;
    const raw = await fetchJson<RawDrugsResponse>(url, this._config);
    const group = raw.drugGroup;

    return {
      name: group?.name ?? '',
      conceptGroup: (group?.conceptGroup ?? []).map(mapConceptGroup),
    };
  }

  /** Fetch spelling suggestions for a drug name. */
  public async spelling(name: string): Promise<ReadonlyArray<string>> {
    const url = `${BASE_URL}/spellingsuggestions.json?name=${encodeURIComponent(name)}`;
    const raw = await fetchJson<RawSpellingResponse>(url, this._config);

    return raw.suggestionGroup?.suggestionList?.suggestion ?? [];
  }

  /**
   * Fetch known drug-drug interactions for an RxCUI.
   * @deprecated The RxNav Drug Interaction API was discontinued January 2, 2024.
   * This method will throw an HTTP error. Use external interaction databases instead.
   */
  public async interaction(rxcui: string): Promise<ReadonlyArray<DrugInteraction>> {
    const url = `${BASE_URL}/interaction/interaction.json?rxcui=${encodeURIComponent(rxcui)}`;
    const raw = await fetchJson<RawInteractionResponse>(url, this._config);
    const typeGroups = raw.interactionTypeGroup ?? [];

    const interactions: Array<DrugInteraction> = [];
    for (const typeGroup of typeGroups) {
      for (const interactionType of typeGroup.interactionType ?? []) {
        for (const pair of interactionType.interactionPair ?? []) {
          interactions.push({
            description: pair.description ?? '',
            severity: pair.severity ?? '',
            interactionConcept: (pair.interactionConcept ?? []).map(mapInteractionConcept),
          });
        }
      }
    }

    return interactions;
  }

  /** Fetch NDC (National Drug Code) identifiers for an RxCUI. */
  public async ndcByRxcui(rxcui: string): Promise<ReadonlyArray<string>> {
    const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/ndcs.json`;
    const raw = await fetchJson<RawNdcResponse>(url, this._config);

    return raw.ndcGroup?.ndcList?.ndc ?? [];
  }

  /** Fuzzy drug name lookup returning ranked candidates with scores. */
  public async approximateTerm(
    name: string,
    options?: ApproximateTermOptions,
  ): Promise<ReadonlyArray<RxTermCandidate>> {
    let url = `${BASE_URL}/approximateTerm.json?term=${encodeURIComponent(name)}`;

    if (options?.maxEntries !== undefined) {
      url += `&maxEntries=${encodeURIComponent(String(options.maxEntries))}`;
    }

    if (options?.option !== undefined) {
      url += `&option=${encodeURIComponent(String(options.option))}`;
    }

    const raw = await fetchJson<RawApproximateTermResponse>(url, this._config);
    const candidates = raw.approximateGroup?.candidate ?? [];

    return candidates.map((candidate) => ({
      rxcui: candidate.rxcui ?? '',
      name: candidate.name ?? '',
      score: Number(candidate.score ?? '0'),
      rank: Number(candidate.rank ?? '0'),
    }));
  }

  /** Get historical status of an RxCUI including remapping information. */
  public async history(rxcui: string): Promise<RxConceptHistory> {
    const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/historystatus.json`;
    const raw = await fetchJson<RawHistoryResponse>(url, this._config);
    const attributes = raw.rxcuiStatusHistory?.attributes;
    const meta = raw.rxcuiStatusHistory?.metaData;
    const derived = raw.rxcuiStatusHistory?.derivedConcepts?.remappedConcept ?? [];

    return {
      rxcui: attributes?.rxcui ?? '',
      name: attributes?.name ?? '',
      status: meta?.status ?? '',
      remappedTo: extractRemappedRxcuis(derived),
    };
  }

  /**
   * Fetch all properties for an RxCUI filtered by property category.
   * @param rxcui - The RxCUI to fetch properties for.
   * @param properties - Property categories to include (e.g., 'NAMES', 'SOURCES').
   */
  public async allProperties(
    rxcui: string,
    properties: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<RxProperty>> {
    const propParam = properties.join(' ');
    const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/allProperties.json?prop=${encodeURIComponent(propParam)}`;
    const raw = await fetchJson<RawAllPropertiesResponse>(url, this._config);

    return (raw.propConceptGroup?.propConcept ?? []).map((prop) => ({
      category: prop.propCategory ?? '',
      name: prop.propName ?? '',
      value: prop.propValue ?? '',
    }));
  }
}

interface RawRxcuiResponse {
  readonly idGroup?: {
    readonly rxnormId?: ReadonlyArray<string>;
  };
}

interface RawPropertiesResponse {
  readonly properties?: {
    readonly rxcui?: string;
    readonly name?: string;
    readonly synonym?: string;
    readonly tty?: string;
    readonly language?: string;
    readonly suppress?: string;
  };
}

interface RawRelatedResponse {
  readonly relatedGroup?: {
    readonly conceptGroup?: ReadonlyArray<RawConceptGroup>;
  };
}

interface RawConceptGroup {
  readonly tty?: string;
  readonly conceptProperties?: ReadonlyArray<RawConceptProps>;
}

interface RawConceptProps {
  readonly rxcui?: string;
  readonly name?: string;
  readonly tty?: string;
}

interface RawDrugsResponse {
  readonly drugGroup?: {
    readonly name?: string;
    readonly conceptGroup?: ReadonlyArray<RawConceptGroup>;
  };
}

interface RawSpellingResponse {
  readonly suggestionGroup?: {
    readonly suggestionList?: {
      readonly suggestion?: ReadonlyArray<string>;
    };
  };
}

interface RawInteractionResponse {
  readonly interactionTypeGroup?: ReadonlyArray<{
    readonly interactionType?: ReadonlyArray<{
      readonly interactionPair?: ReadonlyArray<RawInteractionPair>;
    }>;
  }>;
}

interface RawInteractionPair {
  readonly description?: string;
  readonly severity?: string;
  readonly interactionConcept?: ReadonlyArray<RawInteractionConcept>;
}

interface RawInteractionConcept {
  readonly minConceptItem?: {
    readonly rxcui?: string;
    readonly name?: string;
    readonly tty?: string;
  };
  readonly sourceConceptItem?: {
    readonly id?: string;
    readonly name?: string;
  };
}

interface RawNdcResponse {
  readonly ndcGroup?: {
    readonly ndcList?: {
      readonly ndc?: ReadonlyArray<string>;
    };
  };
}

interface RawApproximateTermResponse {
  readonly approximateGroup?: {
    readonly candidate?: ReadonlyArray<RawApproximateCandidate>;
  };
}

interface RawApproximateCandidate {
  readonly rxcui?: string;
  readonly name?: string;
  readonly score?: string;
  readonly rank?: string;
}

interface RawHistoryResponse {
  readonly rxcuiStatusHistory?: {
    readonly metaData?: {
      readonly status?: string;
    };
    readonly attributes?: {
      readonly rxcui?: string;
      readonly name?: string;
    };
    readonly derivedConcepts?: {
      readonly remappedConcept?: ReadonlyArray<RawRemappedConcept>;
    };
  };
}

interface RawRemappedConcept {
  readonly remappedRxCui?: string;
}

interface RawAllPropertiesResponse {
  readonly propConceptGroup?: {
    readonly propConcept?: ReadonlyArray<RawPropConcept>;
  };
}

interface RawPropConcept {
  readonly propCategory?: string;
  readonly propName?: string;
  readonly propValue?: string;
}

function mapConceptGroup(raw: RawConceptGroup): ConceptGroup {
  return {
    tty: raw.tty ?? '',
    conceptProperties: (raw.conceptProperties ?? []).map((prop) => ({
      rxcui: prop.rxcui ?? '',
      name: prop.name ?? '',
      tty: prop.tty ?? '',
    })),
  };
}

function mapInteractionConcept(raw: RawInteractionConcept): InteractionConcept {
  return {
    rxcui: raw.minConceptItem?.rxcui ?? '',
    name: raw.minConceptItem?.name ?? '',
    tty: raw.minConceptItem?.tty ?? '',
    sourceConceptId: raw.sourceConceptItem?.id ?? '',
    sourceConceptName: raw.sourceConceptItem?.name ?? '',
  };
}

function extractRemappedRxcuis(concepts: ReadonlyArray<RawRemappedConcept>): ReadonlyArray<string> {
  const rxcuis: Array<string> = [];
  for (const concept of concepts) {
    if (concept.remappedRxCui) {
      rxcuis.push(concept.remappedRxCui);
    }
  }
  return rxcuis;
}
