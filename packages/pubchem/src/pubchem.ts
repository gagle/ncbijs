import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './pubchem-client';
import type { PubChemClientConfig } from './pubchem-client';
import type {
  AnnotationData,
  AnnotationRecord,
  AnnotationSection,
  AssayRecord,
  AssaySummary,
  CompoundDescription,
  CompoundProperty,
  CompoundSynonyms,
  PubChemConfig,
  SubstanceRecord,
  SubstanceSynonyms,
} from './interfaces/pubchem.interface';

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const PUG_VIEW_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view';
const REQUESTS_PER_SECOND = 5;

const COMPOUND_PROPERTIES = [
  'MolecularFormula',
  'MolecularWeight',
  'IUPACName',
  'CanonicalSMILES',
  'IsomericSMILES',
  'InChI',
  'InChIKey',
  'XLogP',
  'ExactMass',
  'MonoisotopicMass',
  'TPSA',
  'Complexity',
  'HBondDonorCount',
  'HBondAcceptorCount',
  'RotatableBondCount',
  'HeavyAtomCount',
].join(',');

export class PubChem {
  private readonly _config: PubChemClientConfig;

  constructor(config?: PubChemConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  public async compoundByCid(cid: number): Promise<CompoundProperty> {
    const url = `${BASE_URL}/compound/cid/${encodeURIComponent(cid)}/property/${COMPOUND_PROPERTIES}/JSON`;
    const raw = await fetchJson<RawPropertyResponse>(url, this._config);

    return mapCompoundProperty(raw);
  }

  public async compoundByName(name: string): Promise<CompoundProperty> {
    const url = `${BASE_URL}/compound/name/${encodeURIComponent(name)}/property/${COMPOUND_PROPERTIES}/JSON`;
    const raw = await fetchJson<RawPropertyResponse>(url, this._config);

    return mapCompoundProperty(raw);
  }

  public async compoundByCidBatch(
    cids: ReadonlyArray<number>,
  ): Promise<ReadonlyArray<CompoundProperty>> {
    if (cids.length === 0) {
      return [];
    }

    const joined = cids.join(',');
    const url = `${BASE_URL}/compound/cid/${encodeURIComponent(joined)}/property/${COMPOUND_PROPERTIES}/JSON`;
    const raw = await fetchJson<RawPropertyResponse>(url, this._config);

    return (raw.PropertyTable?.Properties ?? []).map(mapCompoundPropertyEntry);
  }

  public async compoundBySmiles(smiles: string): Promise<CompoundProperty> {
    const url = `${BASE_URL}/compound/smiles/${encodeURIComponent(smiles)}/property/${COMPOUND_PROPERTIES}/JSON`;
    const raw = await fetchJson<RawPropertyResponse>(url, this._config);

    return mapCompoundProperty(raw);
  }

  public async compoundByInchiKey(inchiKey: string): Promise<CompoundProperty> {
    const url = `${BASE_URL}/compound/inchikey/${encodeURIComponent(inchiKey)}/property/${COMPOUND_PROPERTIES}/JSON`;
    const raw = await fetchJson<RawPropertyResponse>(url, this._config);

    return mapCompoundProperty(raw);
  }

  public async cidsByName(name: string): Promise<ReadonlyArray<number>> {
    const url = `${BASE_URL}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const raw = await fetchJson<RawCidResponse>(url, this._config);

    return raw.IdentifierList?.CID ?? [];
  }

  public async synonyms(cid: number): Promise<CompoundSynonyms> {
    const url = `${BASE_URL}/compound/cid/${encodeURIComponent(cid)}/synonyms/JSON`;
    const raw = await fetchJson<RawSynonymsResponse>(url, this._config);
    const information = raw.InformationList?.Information?.[0];

    return {
      cid: information?.CID ?? 0,
      synonyms: information?.Synonym ?? [],
    };
  }

  public async description(cid: number): Promise<CompoundDescription> {
    const url = `${BASE_URL}/compound/cid/${encodeURIComponent(cid)}/description/JSON`;
    const raw = await fetchJson<RawDescriptionResponse>(url, this._config);
    const information = raw.InformationList?.Information?.[0];

    return {
      cid: information?.CID ?? 0,
      title: information?.Title ?? '',
      description: information?.Description ?? '',
    };
  }

  public async substanceBySid(sid: number): Promise<SubstanceRecord> {
    const url = `${BASE_URL}/substance/sid/${encodeURIComponent(sid)}/description/JSON`;
    const raw = await fetchJson<RawSubstanceDescriptionResponse>(url, this._config);

    return mapSubstanceRecord(raw.InformationList?.Information?.[0]);
  }

  public async substanceBySidBatch(
    sids: ReadonlyArray<number>,
  ): Promise<ReadonlyArray<SubstanceRecord>> {
    if (sids.length === 0) {
      return [];
    }

    const joined = sids.join(',');
    const url = `${BASE_URL}/substance/sid/${encodeURIComponent(joined)}/description/JSON`;
    const raw = await fetchJson<RawSubstanceDescriptionResponse>(url, this._config);

    return (raw.InformationList?.Information ?? []).map(mapSubstanceRecord);
  }

  public async substanceByName(name: string): Promise<SubstanceRecord> {
    const url = `${BASE_URL}/substance/name/${encodeURIComponent(name)}/description/JSON`;
    const raw = await fetchJson<RawSubstanceDescriptionResponse>(url, this._config);

    return mapSubstanceRecord(raw.InformationList?.Information?.[0]);
  }

  public async substanceSynonyms(sid: number): Promise<SubstanceSynonyms> {
    const url = `${BASE_URL}/substance/sid/${encodeURIComponent(sid)}/synonyms/JSON`;
    const raw = await fetchJson<RawSubstanceSynonymsResponse>(url, this._config);
    const information = raw.InformationList?.Information?.[0];

    return {
      sid: information?.SID ?? 0,
      synonyms: information?.Synonym ?? [],
    };
  }

  public async sidsByName(name: string): Promise<ReadonlyArray<number>> {
    const url = `${BASE_URL}/substance/name/${encodeURIComponent(name)}/sids/JSON`;
    const raw = await fetchJson<RawSidResponse>(url, this._config);

    return raw.IdentifierList?.SID ?? [];
  }

  public async assayByAid(aid: number): Promise<AssayRecord> {
    const url = `${BASE_URL}/assay/aid/${encodeURIComponent(aid)}/description/JSON`;
    const raw = await fetchJson<RawAssayDescriptionResponse>(url, this._config);

    return mapAssayRecord(raw.PC_AssayContainer?.[0]);
  }

  public async assayByAidBatch(aids: ReadonlyArray<number>): Promise<ReadonlyArray<AssayRecord>> {
    if (aids.length === 0) {
      return [];
    }

    const joined = aids.join(',');
    const url = `${BASE_URL}/assay/aid/${encodeURIComponent(joined)}/description/JSON`;
    const raw = await fetchJson<RawAssayDescriptionResponse>(url, this._config);

    return (raw.PC_AssayContainer ?? []).map(mapAssayRecord);
  }

  public async assaySummary(aid: number): Promise<AssaySummary> {
    const url = `${BASE_URL}/assay/aid/${encodeURIComponent(aid)}/sids/JSON`;
    const raw = await fetchJson<RawAssaySidsResponse>(url, this._config);
    const information = raw.InformationList?.Information?.[0];

    return {
      aid: information?.AID ?? 0,
      name: '',
      sidCount: information?.SID?.length ?? 0,
      cidCount: information?.CID?.length ?? 0,
    };
  }

  public async compoundAnnotations(cid: number, heading?: string): Promise<AnnotationRecord> {
    let url = `${PUG_VIEW_BASE_URL}/data/compound/${encodeURIComponent(cid)}/JSON`;
    if (heading !== undefined) {
      url += `?heading=${encodeURIComponent(heading)}`;
    }
    const raw = await fetchJson<RawPugViewResponse>(url, this._config);

    return mapAnnotationRecord(raw.Record);
  }

  public async substanceAnnotations(sid: number, heading?: string): Promise<AnnotationRecord> {
    let url = `${PUG_VIEW_BASE_URL}/data/substance/${encodeURIComponent(sid)}/JSON`;
    if (heading !== undefined) {
      url += `?heading=${encodeURIComponent(heading)}`;
    }
    const raw = await fetchJson<RawPugViewResponse>(url, this._config);

    return mapAnnotationRecord(raw.Record);
  }

  public async assayAnnotations(aid: number, heading?: string): Promise<AnnotationRecord> {
    let url = `${PUG_VIEW_BASE_URL}/data/bioassay/${encodeURIComponent(aid)}/JSON`;
    if (heading !== undefined) {
      url += `?heading=${encodeURIComponent(heading)}`;
    }
    const raw = await fetchJson<RawPugViewResponse>(url, this._config);

    return mapAnnotationRecord(raw.Record);
  }
}

interface RawPropertyResponse {
  readonly PropertyTable?: {
    readonly Properties?: ReadonlyArray<RawCompoundProperty>;
  };
}

interface RawCompoundProperty {
  readonly CID?: number;
  readonly MolecularFormula?: string;
  readonly MolecularWeight?: number;
  readonly IUPACName?: string;
  readonly CanonicalSMILES?: string;
  readonly IsomericSMILES?: string;
  readonly InChI?: string;
  readonly InChIKey?: string;
  readonly XLogP?: number;
  readonly ExactMass?: number;
  readonly MonoisotopicMass?: number;
  readonly TPSA?: number;
  readonly Complexity?: number;
  readonly HBondDonorCount?: number;
  readonly HBondAcceptorCount?: number;
  readonly RotatableBondCount?: number;
  readonly HeavyAtomCount?: number;
}

interface RawCidResponse {
  readonly IdentifierList?: {
    readonly CID?: ReadonlyArray<number>;
  };
}

interface RawSynonymsResponse {
  readonly InformationList?: {
    readonly Information?: ReadonlyArray<{
      readonly CID?: number;
      readonly Synonym?: ReadonlyArray<string>;
    }>;
  };
}

interface RawDescriptionResponse {
  readonly InformationList?: {
    readonly Information?: ReadonlyArray<{
      readonly CID?: number;
      readonly Title?: string;
      readonly Description?: string;
    }>;
  };
}

interface RawSubstanceDescriptionResponse {
  readonly InformationList?: {
    readonly Information?: ReadonlyArray<RawSubstanceInformation>;
  };
}

interface RawSubstanceInformation {
  readonly SID?: number;
  readonly SourceName?: string;
  readonly SourceID?: string;
  readonly Description?: string;
}

interface RawSubstanceSynonymsResponse {
  readonly InformationList?: {
    readonly Information?: ReadonlyArray<{
      readonly SID?: number;
      readonly Synonym?: ReadonlyArray<string>;
    }>;
  };
}

interface RawSidResponse {
  readonly IdentifierList?: {
    readonly SID?: ReadonlyArray<number>;
  };
}

interface RawAssayDescriptionResponse {
  readonly PC_AssayContainer?: ReadonlyArray<RawAssayContainer>;
}

interface RawAssayContainer {
  readonly assay?: {
    readonly descr?: RawAssayDescription;
  };
}

interface RawAssayDescription {
  readonly aid?: { readonly id?: number };
  readonly aid_source?: {
    readonly db?: {
      readonly name?: string;
      readonly source_id?: { readonly str?: string };
    };
  };
  readonly name?: string;
  readonly description?: ReadonlyArray<string>;
  readonly protocol?: ReadonlyArray<string>;
}

interface RawAssaySidsResponse {
  readonly InformationList?: {
    readonly Information?: ReadonlyArray<{
      readonly AID?: number;
      readonly SID?: ReadonlyArray<number>;
      readonly CID?: ReadonlyArray<number>;
    }>;
  };
}

function mapSubstanceRecord(raw?: RawSubstanceInformation): SubstanceRecord {
  return {
    sid: raw?.SID ?? 0,
    sourceName: raw?.SourceName ?? '',
    sourceId: raw?.SourceID ?? '',
    description: raw?.Description ?? '',
  };
}

function mapAssayRecord(raw?: RawAssayContainer): AssayRecord {
  const descr = raw?.assay?.descr;
  return {
    aid: descr?.aid?.id ?? 0,
    name: descr?.name ?? '',
    description: (descr?.description ?? []).join(' '),
    protocol: (descr?.protocol ?? []).join(' '),
    sourceName: descr?.aid_source?.db?.name ?? '',
    sourceId: descr?.aid_source?.db?.source_id?.str ?? '',
  };
}

function mapCompoundProperty(raw: RawPropertyResponse): CompoundProperty {
  return mapCompoundPropertyEntry(raw.PropertyTable?.Properties?.[0] ?? {});
}

function mapCompoundPropertyEntry(property: RawCompoundProperty): CompoundProperty {
  return {
    cid: property.CID ?? 0,
    molecularFormula: property.MolecularFormula ?? '',
    molecularWeight: property.MolecularWeight ?? 0,
    iupacName: property.IUPACName ?? '',
    canonicalSmiles: property.CanonicalSMILES ?? '',
    isomericSmiles: property.IsomericSMILES ?? '',
    inchi: property.InChI ?? '',
    inchiKey: property.InChIKey ?? '',
    xLogP: property.XLogP ?? 0,
    exactMass: property.ExactMass ?? 0,
    monoisotopicMass: property.MonoisotopicMass ?? 0,
    tpsa: property.TPSA ?? 0,
    complexity: property.Complexity ?? 0,
    hBondDonorCount: property.HBondDonorCount ?? 0,
    hBondAcceptorCount: property.HBondAcceptorCount ?? 0,
    rotatableBondCount: property.RotatableBondCount ?? 0,
    heavyAtomCount: property.HeavyAtomCount ?? 0,
  };
}

interface RawPugViewResponse {
  readonly Record?: RawPugViewRecord;
}

interface RawPugViewRecord {
  readonly RecordType?: string;
  readonly RecordNumber?: number;
  readonly RecordTitle?: string;
  readonly Section?: ReadonlyArray<RawPugViewSection>;
}

interface RawPugViewSection {
  readonly TOCHeading?: string;
  readonly Description?: string;
  readonly Section?: ReadonlyArray<RawPugViewSection>;
  readonly Information?: ReadonlyArray<RawPugViewInformation>;
}

interface RawPugViewInformation {
  readonly ReferenceNumber?: number;
  readonly Name?: string;
  readonly Value?: RawPugViewValue;
  readonly URL?: string;
}

interface RawPugViewValue {
  readonly StringWithMarkup?: ReadonlyArray<{ readonly String?: string }>;
  readonly Number?: ReadonlyArray<number>;
}

function mapAnnotationRecord(raw?: RawPugViewRecord): AnnotationRecord {
  return {
    recordType: raw?.RecordType ?? '',
    recordNumber: raw?.RecordNumber ?? 0,
    recordTitle: raw?.RecordTitle ?? '',
    sections: (raw?.Section ?? []).map(mapAnnotationSection),
  };
}

function mapAnnotationSection(raw: RawPugViewSection): AnnotationSection {
  return {
    tocHeading: raw.TOCHeading ?? '',
    description: raw.Description ?? '',
    sections: (raw.Section ?? []).map(mapAnnotationSection),
    information: (raw.Information ?? []).map(mapAnnotationData),
  };
}

function mapAnnotationData(raw: RawPugViewInformation): AnnotationData {
  const stringValue = raw.Value?.StringWithMarkup?.[0]?.String ?? '';
  const numberValue = raw.Value?.Number?.[0];
  const value = stringValue || (numberValue !== undefined ? String(numberValue) : '');

  return {
    referenceNumber: raw.ReferenceNumber ?? 0,
    name: raw.Name ?? '',
    value,
    url: raw.URL ?? '',
  };
}
