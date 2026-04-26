import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './rxnorm-client';
import type { RxNormClientConfig } from './rxnorm-client';
import type {
  ApproximateTermOptions,
  ConceptGroup,
  DrugGroup,
  RxClassDrugInfo,
  RxClassMember,
  RxConcept,
  RxConceptHistory,
  RxConceptProperties,
  RxNormConfig,
  RxProperty,
  RxTermCandidate,
} from './interfaces/rxnorm.interface';

const BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const REQUESTS_PER_SECOND = 2;

/** RxNorm REST API client for drug concept lookups, drug classes, and NDC codes. */
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

  /**
   * Find drug classes associated with a drug name using the RxClass API.
   * @param drugName - The drug name to search for.
   * @param relaSource - Relationship source (e.g., 'ATC', 'VA', 'MEDRT', 'FDASPL').
   */
  public async classByDrugName(
    drugName: string,
    relaSource?: string,
  ): Promise<ReadonlyArray<RxClassDrugInfo>> {
    let url = `${BASE_URL}/rxclass/class/byDrugName.json?drugName=${encodeURIComponent(drugName)}`;

    if (relaSource !== undefined) {
      url += `&relaSource=${encodeURIComponent(relaSource)}`;
    }

    const raw = await fetchJson<RawRxClassDrugInfoResponse>(url, this._config);

    return (raw.rxclassDrugInfoList?.rxclassDrugInfo ?? []).map(mapRxClassDrugInfo);
  }

  /**
   * Find drug classes associated with an RxCUI using the RxClass API.
   * @param rxcui - The RxCUI to find classes for.
   * @param relaSource - Relationship source (e.g., 'ATC', 'VA', 'MEDRT', 'FDASPL').
   */
  public async classByRxcui(
    rxcui: string,
    relaSource?: string,
  ): Promise<ReadonlyArray<RxClassDrugInfo>> {
    let url = `${BASE_URL}/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(rxcui)}`;

    if (relaSource !== undefined) {
      url += `&relaSource=${encodeURIComponent(relaSource)}`;
    }

    const raw = await fetchJson<RawRxClassDrugInfoResponse>(url, this._config);

    return (raw.rxclassDrugInfoList?.rxclassDrugInfo ?? []).map(mapRxClassDrugInfo);
  }

  /**
   * Fetch drug members of a drug class using the RxClass API.
   * @param classId - The class identifier (e.g., 'N02BA' for ATC).
   * @param relaSource - Relationship source (e.g., 'ATC', 'VA', 'MEDRT').
   */
  public async classMembers(
    classId: string,
    relaSource?: string,
  ): Promise<ReadonlyArray<RxClassMember>> {
    let url = `${BASE_URL}/rxclass/classMembers.json?classId=${encodeURIComponent(classId)}`;

    if (relaSource !== undefined) {
      url += `&relaSource=${encodeURIComponent(relaSource)}`;
    }

    const raw = await fetchJson<RawRxClassMembersResponse>(url, this._config);
    const members = raw.drugMemberGroup?.drugMember ?? [];

    return members.map((member) => ({
      rxcui: member.minConcept?.rxcui ?? '',
      name: member.minConcept?.name ?? '',
      tty: member.minConcept?.tty ?? '',
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

interface RawRxClassDrugInfoResponse {
  readonly rxclassDrugInfoList?: {
    readonly rxclassDrugInfo?: ReadonlyArray<RawRxClassDrugInfoEntry>;
  };
}

interface RawRxClassDrugInfoEntry {
  readonly minConcept?: {
    readonly rxcui?: string;
    readonly name?: string;
    readonly tty?: string;
  };
  readonly rxclassMinConceptItem?: {
    readonly classId?: string;
    readonly className?: string;
    readonly classType?: string;
  };
  readonly rela?: string;
  readonly relaSource?: string;
}

interface RawRxClassMembersResponse {
  readonly drugMemberGroup?: {
    readonly drugMember?: ReadonlyArray<{
      readonly minConcept?: {
        readonly rxcui?: string;
        readonly name?: string;
        readonly tty?: string;
      };
    }>;
  };
}

function mapRxClassDrugInfo(raw: RawRxClassDrugInfoEntry): RxClassDrugInfo {
  return {
    rxcui: raw.minConcept?.rxcui ?? '',
    drugName: raw.minConcept?.name ?? '',
    tty: raw.minConcept?.tty ?? '',
    classId: raw.rxclassMinConceptItem?.classId ?? '',
    className: raw.rxclassMinConceptItem?.className ?? '',
    classType: raw.rxclassMinConceptItem?.classType ?? '',
    rela: raw.rela ?? '',
    relaSource: raw.relaSource ?? '',
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

function extractRemappedRxcuis(concepts: ReadonlyArray<RawRemappedConcept>): ReadonlyArray<string> {
  const rxcuis: Array<string> = [];
  for (const concept of concepts) {
    if (concept.remappedRxCui) {
      rxcuis.push(concept.remappedRxCui);
    }
  }
  return rxcuis;
}
