// Search the Genetic Testing Registry for clinical genetic tests,
// displaying test details, conditions tested, and laboratory information.

import { Gtr } from '@ncbijs/gtr';

async function main(): Promise<void> {
  const gtr = new Gtr({
    ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
  });

  console.log('Searching GTR for BRCA1 genetic tests...\n');

  const tests = await gtr.searchAndFetch('BRCA1[gene]', { retmax: 3 });

  for (const test of tests) {
    console.log(`  ${test.accession}: ${test.testName}`);
    console.log(`  Type: ${test.testType}`);
    console.log(`  Lab: ${test.offerer}`);
    console.log(
      `  Location: ${test.offererLocation.city}, ${test.offererLocation.state}, ${test.offererLocation.country}`,
    );

    if (test.conditions.length > 0) {
      console.log(`  Conditions:`);
      for (const condition of test.conditions) {
        console.log(`    - ${condition.name}`);
      }
    }

    if (test.analytes.length > 0) {
      console.log(`  Analytes:`);
      for (const analyte of test.analytes) {
        console.log(`    - ${analyte.name} (${analyte.analyteType}, ${analyte.location})`);
      }
    }

    if (test.methods.length > 0) {
      console.log(`  Methods: ${test.methods.map((method) => method.name).join(', ')}`);
    }

    if (test.specimens.length > 0) {
      console.log(`  Specimens: ${test.specimens.join(', ')}`);
    }

    console.log('');
  }
}

main().catch(console.error);
