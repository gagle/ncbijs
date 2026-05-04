// Autocomplete ICD-10, LOINC, and SNOMED codes using the Clinical Table
// Search API. Demonstrates basic search and extra field retrieval.

import { search } from '@ncbijs/clinical-tables';

async function main(): Promise<void> {
  console.log('ICD-10-CM: searching "diabetes"...\n');

  const icd10 = await search('icd10cm', 'diabetes');
  console.log(`  Total matches: ${icd10.totalCount}`);
  for (let i = 0; i < Math.min(5, icd10.codes.length); i++) {
    console.log(`  ${icd10.codes[i]}: ${icd10.displayStrings[i]}`);
  }

  console.log('\nLOINC: searching "glucose" with extra fields...\n');

  const loinc = await search('loinc_items', 'glucose', {
    maxList: 5,
    extraFields: ['COMPONENT', 'SYSTEM'],
  });
  console.log(`  Total matches: ${loinc.totalCount}`);
  for (let i = 0; i < loinc.codes.length; i++) {
    const extras = loinc.extras[i] ?? [];
    console.log(`  ${loinc.codes[i]}: ${loinc.displayStrings[i]}`);
    console.log(`    Component: ${extras[0] ?? 'N/A'}, System: ${extras[1] ?? 'N/A'}`);
  }

  console.log('\nRxTerms: searching "metformin"...\n');

  const rxterms = await search('rxterms', 'metformin', { maxList: 5 });
  console.log(`  Total matches: ${rxterms.totalCount}`);
  for (let i = 0; i < rxterms.codes.length; i++) {
    console.log(`  ${rxterms.codes[i]}: ${rxterms.displayStrings[i]}`);
  }

  console.log('\nSNOMED Problem List: searching "hypertension"...\n');

  const snomed = await search('snomed_problem_list', 'hypertension', { maxList: 5 });
  console.log(`  Total matches: ${snomed.totalCount}`);
  for (let i = 0; i < snomed.codes.length; i++) {
    console.log(`  ${snomed.codes[i]}: ${snomed.displayStrings[i]}`);
  }
}

main().catch(console.error);
