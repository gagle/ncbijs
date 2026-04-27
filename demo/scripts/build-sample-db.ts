import { MeSH } from '@ncbijs/mesh';
import { Datasets } from '@ncbijs/datasets';
import { ClinVar } from '@ncbijs/clinvar';
import { convert } from '@ncbijs/id-converter';
import { DuckDbFileStorage } from '@ncbijs/store';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA_DIR = resolve(import.meta.dirname, '..', 'public', 'data');
const DB_PATH = resolve(DATA_DIR, 'ncbijs.duckdb');

mkdirSync(DATA_DIR, { recursive: true });

try {
  rmSync(DB_PATH);
} catch {
  // noop
}

const EUTILS_CONFIG = { tool: 'ncbijs-demo', email: 'demo@ncbijs.dev' };

const storage = await DuckDbFileStorage.open(DB_PATH);

console.log('Fetching MeSH descriptors...');
const mesh = new MeSH({ descriptors: [] });
const meshTerms = [
  'Asthma',
  'Diabetes Mellitus',
  'Breast Neoplasms',
  'Alzheimer Disease',
  'Hypertension',
  'Obesity',
  'Melanoma',
  'Leukemia',
  'HIV Infections',
  'Parkinson Disease',
  'Schizophrenia',
  'Arthritis',
  'Epilepsy',
  'Tuberculosis',
  'Malaria',
  'Influenza',
  'Pneumonia',
  'Hepatitis',
  'Anemia',
  'Lymphoma',
  'Migraine',
  'Psoriasis',
  'Autism',
  'Depression',
  'CRISPR',
  'Genomics',
  'Proteomics',
  'Metabolomics',
  'Immunotherapy',
  'Gene Therapy',
];
const meshDescriptors: Array<Record<string, unknown>> = [];
const seenMeshIds = new Set<string>();
for (const term of meshTerms) {
  try {
    const results = await mesh.lookupOnline(term);
    for (const descriptor of results) {
      if (!seenMeshIds.has(descriptor.id)) {
        seenMeshIds.add(descriptor.id);
        meshDescriptors.push(descriptor as unknown as Record<string, unknown>);
      }
    }
  } catch {
    // noop
  }
}
await storage.writeRecords('mesh', meshDescriptors);
console.log(`  mesh: ${String(meshDescriptors.length)} descriptors`);

console.log('Fetching gene reports...');
const datasets = new Datasets();
const geneSymbols = [
  'BRCA1',
  'BRCA2',
  'TP53',
  'EGFR',
  'KRAS',
  'BRAF',
  'MYC',
  'PIK3CA',
  'PTEN',
  'RB1',
  'APC',
  'VHL',
  'ALK',
  'RET',
  'ERBB2',
  'MET',
  'NF1',
  'CDH1',
  'NOTCH1',
  'HIF1A',
  'ESR1',
  'AR',
  'CFTR',
  'HBB',
  'HTT',
  'FMR1',
  'DMD',
  'APOE',
  'ACE2',
  'IL6',
];
try {
  const genes = await datasets.geneBySymbol(geneSymbols, 'human');
  await storage.writeRecords('genes', genes as unknown as ReadonlyArray<Record<string, unknown>>);
  console.log(`  genes: ${String(genes.length)} records`);
} catch (error: unknown) {
  console.error('  genes: failed -', error instanceof Error ? error.message : error);
}

console.log('Fetching ClinVar variants...');
const clinvar = new ClinVar(EUTILS_CONFIG);
const clinvarSearchTerms = [
  'BRCA1[gene]',
  'BRCA2[gene]',
  'TP53[gene]',
  'KRAS[gene]',
  'CFTR[gene]',
  'PTEN[gene]',
];
const allVariants: Array<Record<string, unknown>> = [];
const seenVariantUids = new Set<string>();
for (const term of clinvarSearchTerms) {
  try {
    const variants = await clinvar.searchAndFetch(term, { retmax: 10 });
    for (const variant of variants) {
      if (!seenVariantUids.has(variant.uid)) {
        seenVariantUids.add(variant.uid);
        allVariants.push(variant as unknown as Record<string, unknown>);
      }
    }
  } catch {
    // noop
  }
}
await storage.writeRecords('clinvar', allVariants);
console.log(`  clinvar: ${String(allVariants.length)} variants`);

console.log('Fetching ID mappings...');
const pmids = [
  '35296856',
  '33533846',
  '34726479',
  '36624488',
  '33567185',
  '35589842',
  '34234092',
  '35478308',
  '33442069',
  '35891725',
  '34504350',
  '33826820',
  '35662405',
  '34175474',
  '36027812',
  '33603233',
  '35480654',
  '34404795',
  '36098477',
  '33649036',
];
try {
  const mappings = await convert(pmids);
  await storage.writeRecords(
    'id-mappings',
    mappings as unknown as ReadonlyArray<Record<string, unknown>>,
  );
  console.log(`  id-mappings: ${String(mappings.length)} records`);
} catch (error: unknown) {
  console.error('  id-mappings: failed -', error instanceof Error ? error.message : error);
}

console.log('Fetching taxonomy reports...');
const taxonomyTerms = [
  'human',
  'mouse',
  'rat',
  'zebrafish',
  'fruit fly',
  'roundworm',
  'yeast',
  'E. coli',
  'chicken',
  'dog',
  'cat',
  'pig',
  'cow',
  'horse',
  'rabbit',
];
try {
  const taxReports = await datasets.taxonomy(taxonomyTerms);
  await storage.writeRecords(
    'taxonomy',
    taxReports as unknown as ReadonlyArray<Record<string, unknown>>,
  );
  console.log(`  taxonomy: ${String(taxReports.length)} records`);
} catch (error: unknown) {
  console.error('  taxonomy: failed -', error instanceof Error ? error.message : error);
}

console.log('Fetching PubChem compounds...');
const { PubChem } = await import('@ncbijs/pubchem');
const pubchem = new PubChem();
const compoundNames = [
  'aspirin',
  'ibuprofen',
  'acetaminophen',
  'caffeine',
  'metformin',
  'atorvastatin',
  'omeprazole',
  'amoxicillin',
  'lisinopril',
  'amlodipine',
  'losartan',
  'simvastatin',
  'levothyroxine',
  'prednisone',
  'gabapentin',
];
const allCompounds: Array<Record<string, unknown>> = [];
for (const name of compoundNames) {
  try {
    const compound = await pubchem.compoundByName(name);
    allCompounds.push(compound as unknown as Record<string, unknown>);
  } catch {
    // noop
  }
}
await storage.writeRecords('compounds', allCompounds);
console.log(`  compounds: ${String(allCompounds.length)} records`);

const stats = await storage.getStats();
console.log('\nDatabase summary:');
for (const stat of stats) {
  if (stat.recordCount > 0) {
    console.log(`  ${stat.dataset}: ${String(stat.recordCount)} records`);
  }
}

await storage.close();
console.log(`\nWritten to ${DB_PATH}`);
