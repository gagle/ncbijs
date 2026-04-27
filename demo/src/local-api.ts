import { MeSH } from '@ncbijs/mesh';
import { Datasets } from '@ncbijs/datasets';
import { ClinVar } from '@ncbijs/clinvar';
import { PubChem } from '@ncbijs/pubchem';
import { createConverter } from '@ncbijs/id-converter';
import { DuckDbWasmStorage } from './duckdb-wasm-storage';
import { flattenRecord } from './flatten-record';

const storage = new DuckDbWasmStorage();

const mesh = MeSH.fromStorage(storage);
const datasets = Datasets.fromStorage(storage);
const clinvar = ClinVar.fromStorage(storage);
const pubchem = PubChem.fromStorage(storage);
const convertIds = createConverter(storage);

export interface LocalResult {
  readonly records: ReadonlyArray<Record<string, unknown>>;
  readonly latencyMs: number;
  readonly endpoint: string;
}

export async function queryLocal(handler: string, input: string): Promise<LocalResult> {
  const start = performance.now();

  switch (handler) {
    case 'mesh-lookup': {
      const descriptors = await mesh.lookupOnline(input);
      return {
        records: descriptors.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'MeSH.fromStorage()',
      };
    }

    case 'gene-search': {
      const genes = await datasets.geneBySymbol([input], 'human');
      return {
        records: genes.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'Datasets.fromStorage()',
      };
    }

    case 'gene-by-id': {
      const genesById = await datasets.geneById([Number(input)]);
      return {
        records: genesById.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'Datasets.fromStorage()',
      };
    }

    case 'taxonomy-lookup': {
      const taxReports = await datasets.taxonomy([input]);
      return {
        records: taxReports.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'Datasets.fromStorage()',
      };
    }

    case 'clinvar-search': {
      const variants = await clinvar.searchAndFetch(input, { retmax: 20 });
      return {
        records: variants.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'ClinVar.fromStorage()',
      };
    }

    case 'compound-lookup': {
      const compound = await pubchem.compoundByCid(Number(input));
      return {
        records: [flattenRecord(compound)],
        latencyMs: performance.now() - start,
        endpoint: 'PubChem.fromStorage()',
      };
    }

    case 'id-convert': {
      const mappings = await convertIds([input]);
      return {
        records: mappings.map(flattenRecord),
        latencyMs: performance.now() - start,
        endpoint: 'createConverter(storage)',
      };
    }

    default:
      throw new Error(`Unknown handler: ${handler}`);
  }
}
