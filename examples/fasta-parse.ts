// Parse FASTA-formatted sequences from a multi-record string, demonstrating
// header parsing, multi-line sequence concatenation, and basic sequence stats.

import { parseFasta } from '@ncbijs/fasta';

const FASTA_INPUT = `>NM_000546.6 Homo sapiens tumor protein p53 (TP53), transcript variant 1, mRNA
ATGGAGGAGCCGCAGTCAGATCCTAGCGTGAGTTTGCCTGAAGGCTGACTGCCTCAGATTCACTTTTAT
CACCTCCTGGCCCCTCTCAAACTGCTTTTTGCTCTGTCCCAGACAGACACTGAACATGTCCCAAGATCCC
AGTTCAAAAAGGAAATGCTGGAACAAAGAAACATTTCCTGAAAATATATATATGATGATGATGATGATGAT

>NP_000537.3 cellular tumor antigen p53 isoform a [Homo sapiens]
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGPDEAPRMPEAA
PRVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYPQGLNGTVNLPGRNSFEVRVCA

>NC_000017.11:c7687490-7668421 Homo sapiens chromosome 17, GRCh38.p14
AATTCCCCCCATCCTTTTTCCAAGGAAACAGACTTTGTCCATCAAATTGTGTAGAATCAGTTGAGCATGGG
TTGGATCCTGTTGATCTTTGACTTCCTAATTCCAACTCCCTCCTCCCAGTTCTAGATG`;

async function main(): Promise<void> {
  const records = parseFasta(FASTA_INPUT);

  console.log(`Parsed ${records.length} FASTA records:\n`);

  for (const record of records) {
    console.log(`  ID: ${record.id}`);
    console.log(`  Description: ${record.description}`);
    console.log(`  Length: ${record.sequence.length} residues`);
    console.log(`  First 50: ${record.sequence.slice(0, 50)}...`);

    const gcCount = (record.sequence.match(/[GCgc]/g) ?? []).length;
    const totalBases = record.sequence.length;
    const gcPercent = ((gcCount / totalBases) * 100).toFixed(1);
    console.log(`  GC content: ${gcPercent}%\n`);
  }
}

main().catch(console.error);
