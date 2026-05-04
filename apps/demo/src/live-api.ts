import { MeSH } from '@ncbijs/mesh';
import { Datasets } from '@ncbijs/datasets';
import { ClinVar } from '@ncbijs/clinvar';
import { PubChem } from '@ncbijs/pubchem';
import { convert } from '@ncbijs/id-converter';
import { flattenRecord } from './flatten-record';

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

    case 'gene-by-id': {
      const genesById = await datasets.geneById([Number(input)]);
      return {
        records: genesById.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'NCBI Datasets API v2',
      };
    }

    case 'taxonomy-lookup': {
      const taxReports = await datasets.taxonomy([input]);
      return {
        records: taxReports.map(flattenRecord),
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
