// Multi-package workflow: Look up a compound in PubChem, find related literature
// via PubTator entity search, and export biomedical annotations. Combines
// @ncbijs/pubchem + @ncbijs/pubtator.

import { PubChem } from '@ncbijs/pubchem';
import { PubTator } from '@ncbijs/pubtator';

async function main(): Promise<void> {
  const pubchem = new PubChem();
  const pubtator = new PubTator();

  console.log('Step 1: Looking up metformin in PubChem...\n');

  const compound = await pubchem.compoundByName('metformin');

  console.log(`  CID: ${compound.cid}`);
  console.log(`  Formula: ${compound.molecularFormula}`);
  console.log(`  Weight: ${compound.molecularWeight} g/mol`);
  console.log(`  IUPAC: ${compound.iupacName}`);
  console.log(`  SMILES: ${compound.canonicalSmiles}`);

  const synonyms = await pubchem.synonyms(compound.cid);
  console.log(`  Synonyms: ${synonyms.synonyms.slice(0, 5).join(', ')}`);

  console.log('\nStep 2: Searching PubTator for metformin-related publications...\n');

  const searchResult = await pubtator.search('metformin', { page: 1, pageSize: 5 });
  console.log(`  Found ${searchResult.total} publications. Top ${searchResult.results.length}:\n`);

  const pmids = searchResult.results.map((result) => result.pmid);

  for (const result of searchResult.results) {
    console.log(`  PMID ${result.pmid}: ${result.title.slice(0, 75)}...`);
  }

  console.log('\nStep 3: Exporting entity annotations from these publications...\n');

  const bioc = await pubtator.export(pmids);

  const entityCounts = new Map<string, number>();

  for (const document of bioc.documents) {
    const annotations = document.passages.flatMap((passage) => passage.annotations);

    for (const annotation of annotations) {
      const current = entityCounts.get(annotation.type) ?? 0;
      entityCounts.set(annotation.type, current + 1);
    }
  }

  console.log('  Entity type summary across all articles:');
  for (const [type, count] of entityCounts) {
    console.log(`    ${type}: ${count} mentions`);
  }
}

main().catch(console.error);
