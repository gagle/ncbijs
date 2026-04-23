// Search ClinVar for BRCA1 pathogenic variants and display clinical details
// including significance, associated diseases, and genomic locations.

import { ClinVar } from '@ncbijs/clinvar';

const NCBI_CONFIG = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-examples',
  email: process.env['NCBI_EMAIL'] ?? 'user@example.com',
  ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
};

async function main(): Promise<void> {
  const clinvar = new ClinVar(NCBI_CONFIG);

  console.log('Searching ClinVar for BRCA1 pathogenic variants...\n');

  const reports = await clinvar.searchAndFetch('BRCA1[gene] AND pathogenic[clinsig]', {
    retmax: 10,
  });

  console.log(`Found ${reports.length} variant reports:\n`);

  for (const report of reports) {
    console.log(`  ${report.title}`);
    console.log(`    Accession: ${report.accessionVersion}`);
    console.log(`    Significance: ${report.clinicalSignificance}`);

    if (report.genes.length > 0) {
      console.log(`    Genes: ${report.genes.map((gene) => gene.symbol).join(', ')}`);
    }

    if (report.traits.length > 0) {
      console.log(`    Conditions: ${report.traits.map((trait) => trait.name).join(', ')}`);
    }

    for (const location of report.locations) {
      console.log(
        `    Location: chr${location.chromosome}:${location.start}-${location.stop} (${location.assemblyName})`,
      );
    }

    console.log(`    Submissions: ${report.supportingSubmissions.length} SCV records\n`);
  }
}

main().catch(console.error);
