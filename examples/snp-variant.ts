// Look up SNP variants from NCBI dbSNP, displaying allele placements,
// population frequencies, and clinical significance annotations.

import { Snp } from '@ncbijs/snp';

const SNP_CONFIG = {
  apiKey: process.env['NCBI_API_KEY'],
};

async function main(): Promise<void> {
  const snp = new Snp(SNP_CONFIG);

  console.log('Looking up rs7412 (APOE variant)...\n');

  const report = await snp.refsnp(7412);

  console.log(`  RefSNP ID: rs${report.refsnpId}`);
  console.log(`  Created: ${report.createDate}`);

  console.log(`\n  Chromosomal placements (${report.placements.length}):\n`);
  for (const placement of report.placements) {
    console.log(`    ${placement.seqId} (${placement.assemblyName})`);
    for (const allele of placement.alleles) {
      console.log(
        `      Position: ${allele.position}, ${allele.deletedSequence} > ${allele.insertedSequence}`,
      );
    }
  }

  console.log(`\n  Allele annotations (${report.alleleAnnotations.length}):\n`);
  for (const annotation of report.alleleAnnotations) {
    if (annotation.frequency.length > 0) {
      console.log('    Population frequencies:');
      for (const freq of annotation.frequency.slice(0, 5)) {
        const percent = (freq.frequency * 100).toFixed(2);
        console.log(
          `      ${freq.studyName}: ${percent}% (${freq.alleleCount}/${freq.totalCount})`,
        );
      }
    }

    if (annotation.clinical.length > 0) {
      console.log('    Clinical significance:');
      for (const clinical of annotation.clinical) {
        console.log(`      ${clinical.significances.join(', ')}`);
        if (clinical.diseaseNames.length > 0) {
          console.log(`      Diseases: ${clinical.diseaseNames.join(', ')}`);
        }
        console.log(`      Review: ${clinical.reviewStatus}`);
      }
    }
  }

  console.log('\n\nBatch lookup: rs7412 + rs429358...\n');

  const reports = await snp.refsnpBatch([7412, 429358]);
  for (const batchReport of reports) {
    const alleleCount = batchReport.alleleAnnotations.reduce(
      (sum, annotation) => sum + annotation.frequency.length,
      0,
    );
    console.log(
      `  rs${batchReport.refsnpId}: ${batchReport.placements.length} placements, ${alleleCount} frequency studies`,
    );
  }
}

main().catch(console.error);
