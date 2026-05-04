// Look up "Asthma" in MeSH via SPARQL and expand to narrower terms for query building.
// Uses the NLM MeSH SPARQL endpoint — no local data file needed.

import { MeSH } from '@ncbijs/mesh';
import type { SparqlResult } from '@ncbijs/mesh';

async function main(): Promise<void> {
  const mesh = new MeSH({ descriptors: [] });

  // 1. Look up Asthma descriptor via SPARQL
  console.log('Looking up "Asthma" in MeSH...\n');

  const lookupResult: SparqlResult = await mesh.sparql(`
    PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT ?descriptor ?label ?treeNumber
    WHERE {
      ?descriptor a meshv:TopicalDescriptor ;
                  rdfs:label ?label ;
                  meshv:treeNumber ?treeNumber .
      FILTER(str(?label) = "Asthma")
    }
  `);

  if (lookupResult.results.bindings.length === 0) {
    console.log('Asthma not found in MeSH.');
    return;
  }

  const firstBinding = lookupResult.results.bindings[0]!;
  const descriptorName = firstBinding['label']!.value;
  const treeNumberUri = firstBinding['treeNumber']!.value;
  const treeNumber = treeNumberUri.slice(treeNumberUri.lastIndexOf('/') + 1);

  console.log(`Descriptor: ${descriptorName}`);
  console.log(`Tree number: ${treeNumber}\n`);

  // 2. Find all narrower (descendant) terms using tree number prefix
  console.log('Expanding to narrower terms...\n');

  const expandResult: SparqlResult = await mesh.sparql(`
    PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT DISTINCT ?label
    WHERE {
      ?descriptor a meshv:TopicalDescriptor ;
                  rdfs:label ?label ;
                  meshv:treeNumber ?tn .
      FILTER(STRSTARTS(str(?tn), "${treeNumberUri}."))
    }
    ORDER BY ?label
  `);

  const narrowerTerms = expandResult.results.bindings.map((binding) => binding['label']!.value);

  console.log(`Narrower terms (${narrowerTerms.length}):`);
  for (const term of narrowerTerms) {
    console.log(`  - ${term}`);
  }

  // 3. Build expanded PubMed query
  const allTerms = [descriptorName, ...narrowerTerms];
  const query = allTerms.map((term) => `"${term}"[Mesh]`).join(' OR ');
  console.log(`\nExpanded PubMed query:\n  ${query}`);
}

main().catch(console.error);
