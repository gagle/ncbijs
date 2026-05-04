// Fetch full compound annotations from PubChem PUG View, including GHS
// classification, pharmacology, and patent data.

import { PubChem } from '@ncbijs/pubchem';

async function main(): Promise<void> {
  const pubchem = new PubChem();

  console.log('Fetching aspirin (CID 2244) annotations...\n');

  const record = await pubchem.compoundAnnotations(2244);
  console.log(`  Record: ${record.recordTitle} (${record.recordType} #${record.recordNumber})`);
  console.log(`  Top-level sections (${record.sections.length}):`);
  for (const section of record.sections.slice(0, 10)) {
    console.log(`    - ${section.tocHeading}`);
  }

  console.log('\nFetching GHS Classification section...\n');

  const ghs = await pubchem.compoundAnnotations(2244, 'GHS Classification');
  for (const section of ghs.sections) {
    console.log(`  ${section.tocHeading}:`);
    for (const info of section.information.slice(0, 5)) {
      console.log(`    ${info.name}: ${info.value.slice(0, 80)}`);
    }
  }

  console.log('\nFetching substance annotations (SID 12345)...\n');

  const substance = await pubchem.substanceAnnotations(12345);
  console.log(`  Record: ${substance.recordTitle}`);
  console.log(`  Sections: ${substance.sections.length}`);
}

main().catch(console.error);
