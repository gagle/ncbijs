// Look up medical genetics concepts in MedGen, displaying clinical features,
// associated genes, modes of inheritance, and cross-references to OMIM.

import { MedGen } from '@ncbijs/medgen';

async function main(): Promise<void> {
  const medgen = new MedGen({
    apiKey: process.env['NCBI_API_KEY'],
  });

  console.log('Searching MedGen for "Marfan syndrome"...\n');

  const concepts = await medgen.searchAndFetch('Marfan syndrome', { retmax: 3 });

  for (const concept of concepts) {
    console.log(`  ${concept.conceptId}: ${concept.title}`);
    console.log(`  Type: ${concept.semanticType}`);

    if (concept.definition) {
      console.log(`  Definition: ${concept.definition.slice(0, 120)}...`);
    }

    if (concept.associatedGenes.length > 0) {
      console.log(`  Genes: ${concept.associatedGenes.map((gene) => gene.symbol).join(', ')}`);
    }

    if (concept.modesOfInheritance.length > 0) {
      console.log(
        `  Inheritance: ${concept.modesOfInheritance.map((mode) => mode.name).join(', ')}`,
      );
    }

    if (concept.clinicalFeatures.length > 0) {
      console.log(`  Clinical features (first 5):`);
      for (const feature of concept.clinicalFeatures.slice(0, 5)) {
        console.log(`    - ${feature.name} (${feature.hpoId})`);
      }
    }

    if (concept.omimIds.length > 0) {
      console.log(`  OMIM: ${concept.omimIds.join(', ')}`);
    }

    console.log('');
  }
}

main().catch(console.error);
