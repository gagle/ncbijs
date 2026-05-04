// Convert between variant notations (SPDI, HGVS, VCF) using the NCBI
// Variation Services API. Demonstrates the four conversion methods.

import { Snp } from '@ncbijs/snp';

const SNP_CONFIG = {
  ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
};

async function main(): Promise<void> {
  const snp = new Snp(SNP_CONFIG);

  const spdi = 'NC_000001.11:1014042:C:T';

  console.log(`Converting SPDI: ${spdi}\n`);

  console.log('SPDI -> HGVS:');
  const hgvs = await snp.spdiToHgvs(spdi);
  console.log(`  ${hgvs.hgvs}\n`);

  console.log('HGVS -> SPDI contextual alleles:');
  const spdis = await snp.hgvsToSpdi(hgvs.hgvs);
  for (const contextual of spdis) {
    console.log(
      `  ${contextual.seqId}:${contextual.position}:${contextual.deletedSequence}:${contextual.insertedSequence}`,
    );
  }

  console.log('\nSPDI -> VCF fields:');
  const vcf = await snp.spdiToVcfFields(spdi);
  console.log(`  CHROM=${vcf.chrom} POS=${vcf.pos} REF=${vcf.ref} ALT=${vcf.alt}\n`);

  console.log('VCF -> SPDI contextual alleles:');
  const fromVcf = await snp.vcfToSpdi(vcf.chrom, vcf.pos, vcf.ref, vcf.alt);
  for (const contextual of fromVcf) {
    console.log(
      `  ${contextual.seqId}:${contextual.position}:${contextual.deletedSequence}:${contextual.insertedSequence}`,
    );
  }
}

main().catch(console.error);
