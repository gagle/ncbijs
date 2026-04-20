import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './pubchem-client';
import type { PubChemClientConfig } from './pubchem-client';
import type {
  CompoundDescription,
  CompoundProperty,
  CompoundSynonyms,
  PubChemConfig,
} from './interfaces/pubchem.interface';

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
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

function mapCompoundProperty(raw: RawPropertyResponse): CompoundProperty {
  const property = raw.PropertyTable?.Properties?.[0] ?? {};

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
