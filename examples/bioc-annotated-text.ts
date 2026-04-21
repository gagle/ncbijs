// Retrieve annotated PubMed and PMC articles from the BioC API.
// Shows named entity recognition for diseases, chemicals, genes, and mutations.

import { pmc, pubmed } from '@ncbijs/bioc';

async function main(): Promise<void> {
  const pmid = '33533846';

  console.log(`Fetching BioC annotations for PMID ${pmid}...\n`);

  const doc = await pubmed(pmid);
  console.log(`  Document ID: ${doc.id}`);
  console.log(`  Passages: ${doc.passages.length}\n`);

  for (const passage of doc.passages) {
    const type = passage.infons['type'] ?? 'unknown';
    console.log(`  [${type}] ${passage.text.slice(0, 80)}...`);
    console.log(`    Annotations: ${passage.annotations.length}`);

    for (const annotation of passage.annotations.slice(0, 5)) {
      const entityType = annotation.infons['type'] ?? 'unknown';
      const identifier = annotation.infons['identifier'] ?? '';
      console.log(`      ${entityType}: "${annotation.text}" (${identifier})`);
    }

    if (passage.annotations.length > 5) {
      console.log(`      ... and ${passage.annotations.length - 5} more`);
    }
  }

  console.log('\nFetching XML format...\n');

  const xml = await pubmed(pmid, 'xml');
  console.log(`  XML length: ${xml.length} characters`);

  console.log('\nFetching PMC article (PMC7096724)...\n');

  const pmcDoc = await pmc('PMC7096724');
  console.log(`  Document ID: ${pmcDoc.id}`);
  console.log(`  Passages: ${pmcDoc.passages.length}`);
}

main().catch(console.error);
