// Search ClinicalTrials.gov for studies by condition and intervention,
// fetch individual study details, and query database statistics.

import { ClinicalTrials } from '@ncbijs/clinical-trials';

async function main(): Promise<void> {
  const ct = new ClinicalTrials();

  console.log('Database statistics:\n');

  const stats = await ct.studyStats();
  console.log(`  Total studies: ${stats.totalStudies}\n`);

  console.log('Searching for COVID-19 vaccine Phase 3 trials...\n');

  let count = 0;
  for await (const trial of ct.searchStudies('COVID-19 vaccine', {
    filter: {
      phase: ['PHASE3'],
      overallStatus: ['COMPLETED'],
    },
    pageSize: 5,
  })) {
    count++;
    console.log(`  ${trial.nctId}: ${trial.briefTitle}`);
    console.log(`    Status: ${trial.overallStatus}, Phase: ${trial.phase}`);
    console.log(`    Enrollment: ${trial.enrollment}`);
    if (count >= 10) {
      console.log('  (stopping after 10 results for demo)');
      break;
    }
  }

  console.log('\nFetching a specific study...\n');

  const study = await ct.study('NCT04280705');
  console.log(`  ${study.nctId}: ${study.briefTitle}`);
  console.log(`  Type: ${study.studyType}`);
  console.log(`  Status: ${study.overallStatus}`);
  console.log(`  Conditions: ${study.conditions.join(', ')}`);
  console.log(`  Sponsors: ${study.sponsors.map((s) => s.name).join(', ')}`);
}

main().catch(console.error);
