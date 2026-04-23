// Normalize drug names using RxNorm, look up concept properties,
// check drug-drug interactions, and map NDC codes.

import { RxNorm } from '@ncbijs/rxnorm';

async function main(): Promise<void> {
  const rxnorm = new RxNorm();

  console.log('Looking up "aspirin"...\n');

  const concept = await rxnorm.rxcui('aspirin');
  console.log(`  RxCUI: ${concept?.rxcui}\n`);

  if (concept) {
    const props = await rxnorm.properties(concept.rxcui);
    console.log(`  Name: ${props.name}`);
    console.log(`  TTY: ${props.tty}`);
    console.log(`  Language: ${props.language}`);

    console.log('\nRelated concepts (brand names):\n');

    const related = await rxnorm.relatedByType(concept.rxcui, ['BN']);
    for (const relatedConcept of related.slice(0, 5)) {
      console.log(`  ${relatedConcept.rxcui}: ${relatedConcept.name} (${relatedConcept.tty})`);
    }

    console.log('\nNDC codes:\n');

    const ndcs = await rxnorm.ndcByRxcui(concept.rxcui);
    console.log(`  Found ${ndcs.length} NDC(s): ${ndcs.slice(0, 5).join(', ')}`);

    console.log('\nDrug interactions:\n');

    const interactions = await rxnorm.interaction(concept.rxcui);
    for (const ix of interactions.slice(0, 3)) {
      console.log(`  ${ix.description.slice(0, 100)}`);
      console.log(`    Severity: ${ix.severity}`);
    }
  }

  console.log('\nSpelling suggestions for "asprin":\n');

  const suggestions = await rxnorm.spelling('asprin');
  console.log(`  Suggestions: ${suggestions.join(', ')}`);

  console.log('\nDrug group for "metformin":\n');

  const group = await rxnorm.drugs('metformin');
  console.log(`  Drug: ${group.name}`);
  for (const cg of group.conceptGroup.slice(0, 3)) {
    console.log(`  TTY ${cg.tty}: ${cg.conceptProperties.length} concepts`);
  }
}

main().catch(console.error);
