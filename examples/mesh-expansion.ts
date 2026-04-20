// Load the MeSH tree, look up "Asthma", expand to narrower terms, and build a PubMed query.
// Requires: place a mesh-tree.json file in packages/mesh/data/ (see @ncbijs/mesh README).

import { readFile } from 'node:fs/promises';
import { MeSH } from '@ncbijs/mesh';
import type { MeshTreeData } from '@ncbijs/mesh';

async function main(): Promise<void> {
  const raw = await readFile(
    new URL('../packages/mesh/data/mesh-tree.json', import.meta.url),
    'utf-8',
  );
  const meshTreeData = JSON.parse(raw) as MeshTreeData;
  const mesh = new MeSH(meshTreeData);

  const descriptor = mesh.lookup('Asthma');
  if (!descriptor) {
    console.log('Asthma not found in MeSH tree');
    return;
  }

  console.log(`Descriptor: ${descriptor.name} (${descriptor.id})`);
  console.log(`Tree numbers: ${descriptor.treeNumbers.join(', ')}\n`);

  const narrowerTerms = mesh.expand('Asthma');
  console.log(`Narrower terms (${narrowerTerms.length}):`);
  for (const term of narrowerTerms) {
    console.log(`  - ${term}`);
  }

  const query = narrowerTerms.map((term) => `"${term}"[Mesh]`).join(' OR ');
  console.log(`\nExpanded PubMed query:\n  ${query}`);
}

main().catch(console.error);
