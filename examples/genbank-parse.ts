// Parse GenBank flat file records, demonstrating section extraction,
// feature/qualifier parsing, and sequence retrieval from ORIGIN blocks.

import { parseGenBank } from '@ncbijs/genbank';

const GENBANK_INPUT = `LOCUS       NP_000537                393 aa            linear   PRI 10-MAR-2024
DEFINITION  cellular tumor antigen p53 [Homo sapiens].
ACCESSION   NP_000537
VERSION     NP_000537.3
DBSOURCE    REFSEQ: accession NM_000546.6
KEYWORDS    RefSeq; MANE Select.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata; Craniata; Vertebrata.
REFERENCE   1  (residues 1 to 393)
  AUTHORS   Smith,J. and Doe,A.
  TITLE     The p53 tumor suppressor
  JOURNAL   Nature 450(7167), 123-130 (2007)
   PUBMED   17851529
FEATURES             Location/Qualifiers
     source          1..393
                     /organism="Homo sapiens"
                     /db_xref="taxon:9606"
     CDS             1..393
                     /gene="TP53"
                     /coded_by="NM_000546.6:203..1384"
ORIGIN
        1 meepqsdpsv epplsqetfs dlwkllpenn vlsplpsqam ddlmlspddi
       61 eqwftedpgp deaprmpeaa ppvapapaap tpaa
//
`;

async function main(): Promise<void> {
  const records = parseGenBank(GENBANK_INPUT);

  for (const record of records) {
    console.log(
      `Locus: ${record.locus.name} (${record.locus.length} ${record.locus.moleculeType})`,
    );
    console.log(`Definition: ${record.definition}`);
    console.log(`Accession: ${record.accession} (${record.version})`);
    console.log(`Organism: ${record.organism}`);
    console.log(`Lineage: ${record.lineage}`);
    console.log();

    console.log(`References (${record.references.length}):`);
    for (const ref of record.references) {
      console.log(`  [${ref.number}] ${ref.title}`);
      console.log(`      ${ref.authors}`);
      if (ref.pubmedId) {
        console.log(`      PubMed: ${ref.pubmedId}`);
      }
    }
    console.log();

    console.log(`Features (${record.features.length}):`);
    for (const feature of record.features) {
      console.log(`  ${feature.key} ${feature.location}`);
      for (const qualifier of feature.qualifiers) {
        console.log(`    /${qualifier.name}="${qualifier.value}"`);
      }
    }
    console.log();

    console.log(`Sequence: ${record.sequence.length} residues`);
    console.log(`  First 50: ${record.sequence.slice(0, 50)}`);
  }
}

main().catch(console.error);
