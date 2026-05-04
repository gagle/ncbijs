// Search DailyMed for drug labels (SPLs), drug names, NDC codes,
// and Established Pharmacologic Classes.

import { DailyMed } from '@ncbijs/dailymed';

async function main(): Promise<void> {
  const dailymed = new DailyMed();

  console.log('Searching drug names for "aspirin"...\n');

  const names = await dailymed.drugNames('aspirin', { pageSize: 5 });
  console.log(`  Found ${names.pagination.totalElements} total drug names`);
  for (const entry of names.data) {
    console.log(`  ${entry.drugName} (${entry.nameType})`);
  }

  console.log('\nSearching SPLs for "metformin"...\n');

  const spls = await dailymed.spls('metformin', { pageSize: 5 });
  console.log(`  Found ${spls.pagination.totalElements} total SPLs`);
  for (const spl of spls.data) {
    console.log(`  ${spl.setId}: ${spl.title} (v${spl.splVersion})`);
  }

  console.log('\nSearching NDC codes for "ibuprofen"...\n');

  const ndcs = await dailymed.ndcs('ibuprofen', { pageSize: 5 });
  console.log(`  Found ${ndcs.pagination.totalElements} total NDCs`);
  for (const ndc of ndcs.data) {
    console.log(`  ${ndc.ndc}`);
  }

  console.log('\nListing drug classes...\n');

  const classes = await dailymed.drugClasses({ pageSize: 5 });
  console.log(`  Found ${classes.pagination.totalElements} total classes`);
  for (const drugClass of classes.data) {
    console.log(`  ${drugClass.code}: ${drugClass.name} (${drugClass.classType})`);
  }
}

main().catch(console.error);
