import { createHttpSource, createCompositeSource } from '@ncbijs/pipeline';
import type { Source } from '@ncbijs/pipeline';
import { parseMeshDescriptorXml } from '@ncbijs/mesh';
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import { parseGeneInfoTsv, parseTaxonomyDump } from '@ncbijs/datasets';
import { parseCompoundExtras } from '@ncbijs/pubchem';
import { parsePmcIdsCsv } from '@ncbijs/id-converter';
import type { DatasetInfo, EtlDatasetType } from './interfaces/etl.interface';

export interface DatasetDescriptor {
  readonly info: DatasetInfo;
  readonly createSource: () => Source<string> | Source<Record<string, string>>;
  readonly parse: (raw: string | Record<string, string>) => ReadonlyArray<object>;
}

const MESH_URL = 'https://nlmpubs.nlm.nih.gov/projects/mesh/MESH_FILES/xmlmesh/desc2025.xml';
const CLINVAR_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz';
const GENE_URL = 'https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_info.gz';
const TAXONOMY_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/taxdump.tar.gz';
const PUBCHEM_SMILES_URL = 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-SMILES.gz';
const PUBCHEM_INCHI_URL = 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-InChI-Key.gz';
const PUBCHEM_IUPAC_URL = 'https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-IUPAC.gz';
const PMC_IDS_URL = 'https://ftp.ncbi.nlm.nih.gov/pub/pmc/PMC-ids.csv.gz';

const REGISTRY: ReadonlyArray<DatasetDescriptor> = [
  {
    info: {
      id: 'mesh',
      name: 'MeSH Descriptors',
      description: 'Medical Subject Headings vocabulary with tree numbers and qualifiers',
      sourceUrls: [MESH_URL],
      format: 'xml',
      compressed: false,
      estimatedSize: '~360 MB',
      estimatedRecords: '~30K descriptors',
      updateFrequency: 'Annual',
    },
    createSource: () => createHttpSource(MESH_URL),
    parse: (raw) => parseMeshDescriptorXml(raw as string).descriptors,
  },
  {
    info: {
      id: 'clinvar',
      name: 'ClinVar Variants',
      description: 'Clinical variant significance and trait associations',
      sourceUrls: [CLINVAR_URL],
      format: 'tsv',
      compressed: true,
      estimatedSize: '~150 MB',
      estimatedRecords: '~2.5M submissions',
      updateFrequency: 'Weekly',
    },
    createSource: () => createHttpSource(CLINVAR_URL),
    parse: (raw) => parseVariantSummaryTsv(raw as string),
  },
  {
    info: {
      id: 'genes',
      name: 'Gene Info',
      description: 'Gene metadata including symbol, description, and taxonomy',
      sourceUrls: [GENE_URL],
      format: 'tsv',
      compressed: true,
      estimatedSize: '~600 MB',
      estimatedRecords: '~35M genes',
      updateFrequency: 'Daily',
    },
    createSource: () => createHttpSource(GENE_URL),
    parse: (raw) => parseGeneInfoTsv(raw as string),
  },
  {
    info: {
      id: 'taxonomy',
      name: 'Taxonomy',
      description: 'NCBI Taxonomy names and nodes hierarchy',
      sourceUrls: [TAXONOMY_URL],
      format: 'tar.gz',
      compressed: true,
      estimatedSize: '~80 MB',
      estimatedRecords: '~2.5M taxa',
      updateFrequency: 'Daily',
    },
    createSource: () => {
      throw new Error(
        'Taxonomy requires tar.gz extraction. Use loadTaxonomy() from @ncbijs/etl ' +
          'or provide pre-extracted names.dmp and nodes.dmp files via createCompositeSource().',
      );
    },
    parse: (raw) => {
      const composite = raw as Record<string, string>;
      return parseTaxonomyDump({
        namesDmp: composite['namesDmp'] ?? '',
        nodesDmp: composite['nodesDmp'] ?? '',
      });
    },
  },
  {
    info: {
      id: 'compounds',
      name: 'PubChem Compounds',
      description: 'Compound identifiers (SMILES, InChI Key, IUPAC name)',
      sourceUrls: [PUBCHEM_SMILES_URL, PUBCHEM_INCHI_URL, PUBCHEM_IUPAC_URL],
      format: 'tsv',
      compressed: true,
      estimatedSize: '~15 GB',
      estimatedRecords: '~115M compounds',
      updateFrequency: 'Weekly',
    },
    createSource: () =>
      createCompositeSource({
        cidSmiles: createHttpSource(PUBCHEM_SMILES_URL),
        cidInchiKey: createHttpSource(PUBCHEM_INCHI_URL),
        cidIupac: createHttpSource(PUBCHEM_IUPAC_URL),
      }),
    parse: (raw) => {
      const composite = raw as Record<string, string>;
      return parseCompoundExtras({
        cidSmiles: composite['cidSmiles'] ?? '',
        cidInchiKey: composite['cidInchiKey'] ?? '',
        cidIupac: composite['cidIupac'] ?? '',
      });
    },
  },
  {
    info: {
      id: 'id-mappings',
      name: 'PMC ID Mappings',
      description: 'PMID, PMCID, and DOI cross-reference mappings',
      sourceUrls: [PMC_IDS_URL],
      format: 'csv',
      compressed: true,
      estimatedSize: '~233 MB',
      estimatedRecords: '~9.5M mappings',
      updateFrequency: 'Regular',
    },
    createSource: () => createHttpSource(PMC_IDS_URL),
    parse: (raw) => parsePmcIdsCsv(raw as string),
  },
];

const REGISTRY_MAP = new Map<EtlDatasetType, DatasetDescriptor>(
  REGISTRY.map((descriptor) => [descriptor.info.id, descriptor]),
);

/** Get the dataset descriptor for a given dataset type. */
export function getDescriptor(dataset: EtlDatasetType): DatasetDescriptor {
  const descriptor = REGISTRY_MAP.get(dataset);

  if (descriptor === undefined) {
    throw new Error(`Unknown dataset: ${dataset}`);
  }

  return descriptor;
}

/** List all available datasets with their metadata. */
export function listDatasets(): ReadonlyArray<DatasetInfo> {
  return REGISTRY.map((descriptor) => descriptor.info);
}

/** Get metadata for a single dataset. */
export function getDataset(dataset: EtlDatasetType): DatasetInfo {
  return getDescriptor(dataset).info;
}

export { TAXONOMY_URL };
