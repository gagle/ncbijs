// Use PubTator to find gene entities matching "BRCA1", then export BioC annotations
// for publications to discover associated diseases and chemicals.

import { ENTITY_TYPES, PubTator } from '@ncbijs/pubtator';

async function main(): Promise<void> {
  const pubtator = new PubTator();

  const geneMatches = await pubtator.findEntity('BRCA1', ENTITY_TYPES.Gene);
  console.log(`Gene matches for "BRCA1" (${geneMatches.length}):\n`);

  for (const match of geneMatches.slice(0, 5)) {
    console.log(`  ${match.name} (${match.id})`);
  }

  const topGene = geneMatches[0];
  if (!topGene) {
    console.log('\nNo gene matches found.');
    return;
  }

  console.log(`\nSearching PubTator for publications about ${topGene.name}...\n`);

  const searchResult = await pubtator.search(topGene.name, { page: 1, pageSize: 5 });
  console.log(`Found ${searchResult.total} publications. Top ${searchResult.results.length}:\n`);

  const pmids = searchResult.results.map((result) => result.pmid);

  for (const result of searchResult.results) {
    console.log(`  PMID ${result.pmid}: ${result.title.slice(0, 80)}...`);
  }

  console.log(`\nExporting BioC annotations for ${pmids.length} articles...\n`);

  const bioc = await pubtator.export(pmids);

  for (const document of bioc.documents) {
    const annotations = document.passages.flatMap((passage) => passage.annotations);
    const byType = new Map<string, Array<string>>();

    for (const annotation of annotations) {
      const existing = byType.get(annotation.type) ?? [];
      if (!existing.includes(annotation.text)) {
        existing.push(annotation.text);
      }
      byType.set(annotation.type, existing);
    }

    console.log(`  PMID ${document.id} — ${annotations.length} annotations:`);
    for (const [type, entities] of byType) {
      console.log(`    ${type}: ${entities.slice(0, 5).join(', ')}`);
    }
    console.log();
  }
}

main().catch(console.error);
