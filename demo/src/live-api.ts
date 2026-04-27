import { MeSH } from '@ncbijs/mesh';
import { Datasets } from '@ncbijs/datasets';
import { ClinVar } from '@ncbijs/clinvar';
import { PubChem } from '@ncbijs/pubchem';
import { convert } from '@ncbijs/id-converter';

const EUTILS_CONFIG = { tool: 'ncbijs-demo', email: 'demo@ncbijs.dev' };

const mesh = new MeSH({ descriptors: [] });
const datasets = new Datasets();
const clinvar = new ClinVar(EUTILS_CONFIG);
const pubchem = new PubChem();

export interface LiveResult {
  readonly records: ReadonlyArray<Record<string, unknown>>;
  readonly latencyMs: number;
  readonly endpoint: string;
}

export async function queryLive(handler: string, input: string): Promise<LiveResult> {
  const start = performance.now();

  switch (handler) {
    case 'mesh-lookup': {
      const descriptors = await mesh.lookupOnline(input);
      return {
        records: descriptors.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'MeSH Lookup API',
      };
    }

    case 'gene-search': {
      const genes = await datasets.geneBySymbol([input], 'human');
      return {
        records: genes.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'NCBI Datasets API v2',
      };
    }

    case 'clinvar-search': {
      const variants = await clinvar.searchAndFetch(input, { retmax: 20 });
      return {
        records: variants.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'ClinVar E-utilities',
      };
    }

    case 'compound-lookup': {
      const compound = await pubchem.compoundByCid(Number(input));
      return {
        records: [flattenRecord(compound)],
        latencyMs: performance.now() - start,
        endpoint: 'PubChem PUG REST',
      };
    }

    case 'id-convert': {
      const mappings = await convert([input]);
      return {
        records: mappings.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'PMC ID Converter API',
      };
    }

    default:
      throw new Error(`Unknown handler: ${handler}`);
  }
}

function summarizeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map(summarizeValue);
    return items.length <= 3
      ? items.join('; ')
      : `${items.slice(0, 3).join('; ')} (+${items.length - 3})`;
  }
  const obj = value as Record<string, unknown>;
  if ('text' in obj && typeof obj['text'] === 'string') {
    return obj['text'];
  }
  if ('title' in obj && typeof obj['title'] === 'string') {
    return obj['title'];
  }
  if ('name' in obj && typeof obj['name'] === 'string') {
    return obj['name'];
  }
  if ('lastName' in obj) {
    const parts = [obj['foreName'], obj['lastName']].filter(Boolean);
    return parts.join(' ') || String(obj['collectiveName'] ?? '');
  }
  if ('year' in obj) {
    const parts = [obj['year'], obj['month'], obj['day']].filter(Boolean);
    return parts.join('-');
  }
  const keys = Object.keys(obj);
  const preview = keys
    .slice(0, 3)
    .map((key) => `${key}: ${summarizeValue(obj[key])}`)
    .join(', ');
  return keys.length > 3 ? `${preview} ...` : preview;
}

function flattenRecord(record: unknown): Record<string, unknown> {
  if (typeof record !== 'object' || record === null) {
    return { value: record };
  }
  const flat: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    flat[key] = summarizeValue(value);
  }
  return flat;
}
