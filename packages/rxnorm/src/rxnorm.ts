import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './rxnorm-client';
import type { RxNormClientConfig } from './rxnorm-client';
import type {
  ConceptGroup,
  DrugGroup,
  DrugInteraction,
  InteractionConcept,
  RxConcept,
  RxConceptProperties,
  RxNormConfig,
} from './interfaces/rxnorm.interface';

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const REQUESTS_PER_SECOND = 2;

export class RxNorm {
  private readonly _config: RxNormClientConfig;

  constructor(config?: RxNormConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  public async rxcui(name: string): Promise<RxConcept | undefined> {
    const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(name)}`;
    const raw = await fetchJson<RawRxcuiResponse>(url, this._config);
    const group = raw.idGroup;

    if (!group?.rxnormId?.[0]) {
      return undefined;
    }

    return {
      rxcui: group.rxnormId[0],
      name: group.name ?? '',
      tty: '',
    };
  }

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

  public async relatedByType(
    rxcui: string,
    types: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<RxConcept>> {
    const ttyParam = types.join('+');
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

  public async drugs(name: string): Promise<DrugGroup> {
    const url = `${BASE_URL}/drugs.json?name=${encodeURIComponent(name)}`;
    const raw = await fetchJson<RawDrugsResponse>(url, this._config);
    const group = raw.drugGroup;

    return {
      name: group?.name ?? '',
      conceptGroup: (group?.conceptGroup ?? []).map(mapConceptGroup),
    };
  }

  public async spelling(name: string): Promise<ReadonlyArray<string>> {
    const url = `${BASE_URL}/spellingsuggestions.json?name=${encodeURIComponent(name)}`;
    const raw = await fetchJson<RawSpellingResponse>(url, this._config);

    return raw.suggestionGroup?.suggestionList?.suggestion ?? [];
  }

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

  public async ndcByRxcui(rxcui: string): Promise<ReadonlyArray<string>> {
    const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/ndcs.json`;
    const raw = await fetchJson<RawNdcResponse>(url, this._config);

    return raw.ndcGroup?.ndcList?.ndc ?? [];
  }
}

interface RawRxcuiResponse {
  readonly idGroup?: {
    readonly name?: string;
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
