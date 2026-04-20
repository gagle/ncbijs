// Use PubTator to find gene entities matching "BRCA1", then find disease relations.

import { ENTITY_TYPES, RELATION_TYPES, PubTator } from '@ncbijs/pubtator';

async function main(): Promise<void> {
  const pubtator = new PubTator();

  const geneMatches = await pubtator.findEntity('BRCA1', ENTITY_TYPES.Gene);
  console.log(`Gene matches for "BRCA1" (${geneMatches.length}):\n`);

  for (const match of geneMatches.slice(0, 5)) {
    console.log(`  ${match.name} (${match.id}) — score: ${match.score}`);
  }

  const topGene = geneMatches[0];
  if (!topGene) {
    console.log('\nNo gene matches found.');
    return;
  }

  console.log(`\nDisease relations for ${topGene.name} (${topGene.id}):\n`);

  const relations = await pubtator.findRelations(
    topGene.id,
    ENTITY_TYPES.Disease,
    RELATION_TYPES.Associate,
  );

  for (const relation of relations.slice(0, 10)) {
    const pmidCount = relation.pmids.length;
    console.log(`  ${relation.name} — ${pmidCount} PMIDs (score: ${relation.score})`);
  }
}

main().catch(console.error);
