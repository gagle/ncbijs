// Multi-package workflow: Search ClinVar for pathogenic BRCA1 variants, then
// look up detailed SNP data from dbSNP for population frequencies and clinical
// annotations. Combines @ncbijs/clinvar + @ncbijs/snp.

import { ClinVar } from '@ncbijs/clinvar';
import { Snp } from '@ncbijs/snp';

const NCBI_CONFIG = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-examples',
  email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
};

async function main(): Promise<void> {
  const clinvar = new ClinVar(NCBI_CONFIG);
  const snp = new Snp({
    ...('apiKey' in NCBI_CONFIG && { apiKey: NCBI_CONFIG.apiKey }),
  });

  console.log('Searching ClinVar for APOE pathogenic variants...\n');

  const reports = await clinvar.searchAndFetch('APOE[gene] AND pathogenic[clinsig]', {
    retmax: 5,
  });

  console.log(`Found ${reports.length} ClinVar variants.\n`);

  const rsIds: Array<number> = [];

  for (const report of reports) {
    console.log(`  ${report.title}`);
    console.log(`    Significance: ${report.clinicalSignificance}`);

    const rsMatch = report.title.match(/rs(\d+)/);
    if (rsMatch) {
      rsIds.push(Number(rsMatch[1]));
    }
  }

  if (rsIds.length === 0) {
    console.log('\nNo RS IDs found in ClinVar results to look up in dbSNP.');
    return;
  }

  console.log(`\nLooking up ${rsIds.length} RS IDs in dbSNP for population data...\n`);

  const snpReports = await snp.refsnpBatch(rsIds);

  for (const snpReport of snpReports) {
    console.log(`  rs${snpReport.refsnpId}:`);

    for (const annotation of snpReport.alleleAnnotations) {
      if (annotation.frequency.length > 0) {
        const topStudy = annotation.frequency[0];
        if (topStudy) {
          const percent = (topStudy.frequency * 100).toFixed(2);
          console.log(`    Top frequency: ${topStudy.studyName} ${percent}%`);
        }
      }

      for (const clinical of annotation.clinical) {
        console.log(`    Clinical: ${clinical.significances.join(', ')}`);
        if (clinical.diseaseNames.length > 0) {
          console.log(`    Diseases: ${clinical.diseaseNames.slice(0, 3).join(', ')}`);
        }
      }
    }
    console.log();
  }
}

main().catch(console.error);
