// Look up gene metadata from NCBI Datasets API: gene information, ontology terms,
// taxonomy details, and genome assembly statistics.

import { Datasets } from '@ncbijs/datasets';

const DATASETS_CONFIG = {
  apiKey: process.env['NCBI_API_KEY'],
};

async function main(): Promise<void> {
  const datasets = new Datasets(DATASETS_CONFIG);

  console.log('Looking up BRCA1 and TP53 gene metadata...\n');

  const genes = await datasets.geneById([672, 7157]);

  for (const gene of genes) {
    console.log(`--- ${gene.symbol} (Gene ID: ${gene.geneId}) ---`);
    console.log(`  Description: ${gene.description}`);
    console.log(`  Organism: ${gene.taxName} (${gene.commonName})`);
    console.log(`  Type: ${gene.type}`);
    console.log(`  Chromosome: ${gene.chromosomes.join(', ')}`);
    console.log(`  Synonyms: ${gene.synonyms.join(', ')}`);
    console.log(`  Transcripts: ${gene.transcriptCount}, Proteins: ${gene.proteinCount}`);

    const ontology = gene.geneOntology;
    if (ontology.molecularFunctions.length > 0) {
      console.log(
        `  Molecular functions: ${ontology.molecularFunctions.map((term) => `${term.name} (${term.goId})`).join(', ')}`,
      );
    }
    console.log();
  }

  console.log('Looking up human taxonomy...\n');

  const taxonomy = await datasets.taxonomy([9606]);
  const human = taxonomy[0];

  if (human) {
    console.log(`  ${human.organismName} (${human.commonName})`);
    console.log(`  Rank: ${human.rank}`);
    console.log(`  Lineage depth: ${human.lineage.length} taxa`);
    for (const count of human.counts) {
      console.log(`  ${count.type}: ${count.count.toLocaleString()}`);
    }
  }

  console.log('\nLooking up human reference genome assembly...\n');

  const genomes = await datasets.genomeByAccession(['GCF_000001405.40']);
  const genome = genomes[0];

  if (genome) {
    console.log(`  ${genome.assemblyInfo.assemblyName} (${genome.accession})`);
    console.log(`  Level: ${genome.assemblyInfo.assemblyLevel}`);
    console.log(`  Chromosomes: ${genome.assemblyStats.totalNumberOfChromosomes}`);
    console.log(`  Sequence length: ${genome.assemblyStats.totalSequenceLength} bp`);
    console.log(`  GC content: ${genome.assemblyStats.gcPercent}%`);
    console.log(`  Contig N50: ${genome.assemblyStats.contigN50.toLocaleString()}`);
  }
}

main().catch(console.error);
