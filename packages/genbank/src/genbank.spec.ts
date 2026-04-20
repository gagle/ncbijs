import { describe, expect, it } from 'vitest';
import { createEmptyGenBankRecord, parseGenBank } from './genbank';

const PROTEIN_RECORD = `LOCUS       NP_000537                393 aa            linear   PRI 10-MAR-2024
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
REFERENCE   2  (residues 1 to 100)
  AUTHORS   Jones,B.
  TITLE     Direct Submission
  JOURNAL   Submitted (01-JAN-2020) NIH, Bethesda, MD
FEATURES             Location/Qualifiers
     source          1..393
                     /organism="Homo sapiens"
                     /db_xref="taxon:9606"
     Protein         1..393
                     /product="cellular tumor antigen p53"
     CDS             1..393
                     /gene="TP53"
                     /coded_by="NM_000546.6:203..1384"
ORIGIN
        1 meepqsdpsv epplsqetfs dlwkllpenn vlsplpsqam ddlmlspddi
       61 eqwftedpgp deaprmpeaa ppvapapaap tpaa
//
`;

const NUCLEOTIDE_RECORD = `LOCUS       NM_007294               7270 bp    mRNA    linear   PRI 15-MAR-2024
DEFINITION  Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA.
ACCESSION   NM_007294
VERSION     NM_007294.4
KEYWORDS    RefSeq.
SOURCE      Homo sapiens (human)
  ORGANISM  Homo sapiens
            Eukaryota; Metazoa; Chordata.
FEATURES             Location/Qualifiers
     source          1..7270
                     /organism="Homo sapiens"
                     /mol_type="mRNA"
     gene            1..7270
                     /gene="BRCA1"
     CDS             120..5711
                     /gene="BRCA1"
                     /protein_id="NP_009225.1"
ORIGIN
        1 agctcgctga gacttcctgg accccgcacc aggctgtggg gtttctcaga taactgggcc
       61 cctgcgctca ggaggccttc accctctgct ctgggtaaag
//
`;

describe('parseGenBank', () => {
  it('should parse a protein record', () => {
    const records = parseGenBank(PROTEIN_RECORD);

    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.locus.name).toBe('NP_000537');
    expect(record.locus.length).toBe(393);
    expect(record.locus.moleculeType).toBe('aa');
    expect(record.locus.topology).toBe('linear');
    expect(record.locus.division).toBe('PRI');
    expect(record.locus.date).toBe('10-MAR-2024');
    expect(record.definition).toBe('cellular tumor antigen p53 [Homo sapiens].');
    expect(record.accession).toBe('NP_000537');
    expect(record.version).toBe('NP_000537.3');
    expect(record.dbSource).toBe('REFSEQ: accession NM_000546.6');
    expect(record.keywords).toBe('RefSeq; MANE Select');
    expect(record.source).toBe('Homo sapiens (human)');
    expect(record.organism).toBe('Homo sapiens');
    expect(record.lineage).toBe('Eukaryota; Metazoa; Chordata; Craniata; Vertebrata');
  });

  it('should parse references', () => {
    const records = parseGenBank(PROTEIN_RECORD);
    const refs = records[0]!.references;

    expect(refs).toHaveLength(2);
    expect(refs[0]!.number).toBe(1);
    expect(refs[0]!.range).toBe('residues 1 to 393');
    expect(refs[0]!.authors).toBe('Smith,J. and Doe,A.');
    expect(refs[0]!.title).toBe('The p53 tumor suppressor');
    expect(refs[0]!.journal).toBe('Nature 450(7167), 123-130 (2007)');
    expect(refs[0]!.pubmedId).toBe('17851529');
    expect(refs[1]!.number).toBe(2);
    expect(refs[1]!.range).toBe('residues 1 to 100');
  });

  it('should parse features with qualifiers', () => {
    const records = parseGenBank(PROTEIN_RECORD);
    const features = records[0]!.features;

    expect(features).toHaveLength(3);
    expect(features[0]!.key).toBe('source');
    expect(features[0]!.location).toBe('1..393');
    expect(features[0]!.qualifiers).toHaveLength(2);
    expect(features[0]!.qualifiers[0]!.name).toBe('organism');
    expect(features[0]!.qualifiers[0]!.value).toBe('Homo sapiens');
    expect(features[0]!.qualifiers[1]!.name).toBe('db_xref');
    expect(features[0]!.qualifiers[1]!.value).toBe('taxon:9606');

    expect(features[2]!.key).toBe('CDS');
    expect(features[2]!.qualifiers).toHaveLength(2);
    expect(features[2]!.qualifiers[0]!.name).toBe('gene');
    expect(features[2]!.qualifiers[0]!.value).toBe('TP53');
  });

  it('should parse sequence from ORIGIN section', () => {
    const records = parseGenBank(PROTEIN_RECORD);
    const sequence = records[0]!.sequence;

    expect(sequence).toMatch(/^meepqsdpsv/);
    expect(sequence).toMatch(/tpaa$/);
    expect(sequence).not.toContain(' ');
    expect(sequence).not.toMatch(/\d/);
  });

  it('should parse a nucleotide record', () => {
    const records = parseGenBank(NUCLEOTIDE_RECORD);

    expect(records).toHaveLength(1);
    const record = records[0]!;
    expect(record.locus.name).toBe('NM_007294');
    expect(record.locus.length).toBe(7270);
    expect(record.locus.moleculeType).toBe('mRNA');
    expect(record.locus.topology).toBe('linear');
    expect(record.definition).toContain('BRCA1');
    expect(record.accession).toBe('NM_007294');
    expect(record.version).toBe('NM_007294.4');
  });

  it('should parse multiple records separated by //', () => {
    const text = PROTEIN_RECORD + NUCLEOTIDE_RECORD;
    const records = parseGenBank(text);

    expect(records).toHaveLength(2);
    expect(records[0]!.accession).toBe('NP_000537');
    expect(records[1]!.accession).toBe('NM_007294');
  });

  it('should return empty array for empty input', () => {
    expect(parseGenBank('')).toEqual([]);
    expect(parseGenBank('  \n  ')).toEqual([]);
  });

  it('should handle record with no ORIGIN section', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
DEFINITION  Test protein.
ACCESSION   TEST1
VERSION     TEST1.1
KEYWORDS    .
SOURCE      Test organism
  ORGANISM  Test organism
//
`;
    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.sequence).toBe('');
  });

  it('should handle record with no FEATURES section', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
DEFINITION  Test protein.
ACCESSION   TEST1
VERSION     TEST1.1
//
`;
    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.features).toEqual([]);
  });

  it('should handle record with no REFERENCE section', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
DEFINITION  Test protein.
ACCESSION   TEST1
VERSION     TEST1.1
//
`;
    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.references).toEqual([]);
  });

  it('should handle minimal LOCUS line', () => {
    const text = `LOCUS       MINIMAL
ACCESSION   MINIMAL
//
`;
    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.locus.name).toBe('MINIMAL');
    expect(records[0]!.locus.length).toBe(0);
  });

  it('should handle empty LOCUS line', () => {
    const text = `LOCUS
ACCESSION   TEST
//
`;
    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.locus.name).toBe('');
  });

  it('should handle missing optional sections', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
//
`;
    const records = parseGenBank(text);

    expect(records).toHaveLength(1);
    expect(records[0]!.definition).toBe('');
    expect(records[0]!.version).toBe('');
    expect(records[0]!.dbSource).toBe('');
    expect(records[0]!.keywords).toBe('');
    expect(records[0]!.source).toBe('');
    expect(records[0]!.organism).toBe('');
    expect(records[0]!.lineage).toBe('');
  });

  it('should strip trailing dot from keywords', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
KEYWORDS    RefSeq.
ACCESSION   TEST1
//
`;
    const records = parseGenBank(text);
    expect(records[0]!.keywords).toBe('RefSeq');
  });

  it('should handle features without qualifiers', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
FEATURES             Location/Qualifiers
     source          1..100
//
`;
    const records = parseGenBank(text);

    expect(records[0]!.features).toHaveLength(1);
    expect(records[0]!.features[0]!.key).toBe('source');
    expect(records[0]!.features[0]!.location).toBe('1..100');
    expect(records[0]!.features[0]!.qualifiers).toEqual([]);
  });

  it('should handle qualifier without value', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
FEATURES             Location/Qualifiers
     source          1..100
                     /pseudo
//
`;
    const records = parseGenBank(text);

    expect(records[0]!.features[0]!.qualifiers).toHaveLength(1);
    expect(records[0]!.features[0]!.qualifiers[0]!.name).toBe('pseudo');
    expect(records[0]!.features[0]!.qualifiers[0]!.value).toBe('');
  });

  it('should handle reference without PUBMED', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
REFERENCE   1  (residues 1 to 100)
  AUTHORS   Author A.
  TITLE     Direct Submission
  JOURNAL   Submitted (01-JAN-2024) Lab, City
//
`;
    const records = parseGenBank(text);

    expect(records[0]!.references).toHaveLength(1);
    expect(records[0]!.references[0]!.pubmedId).toBe('');
    expect(records[0]!.references[0]!.authors).toBe('Author A.');
  });

  it('should handle reference without range', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
REFERENCE   1
  AUTHORS   Author A.
  TITLE     Some Title
//
`;
    const records = parseGenBank(text);

    expect(records[0]!.references[0]!.number).toBe(1);
    expect(records[0]!.references[0]!.range).toBe('');
  });

  it('should parse nucleotide bp unit in LOCUS', () => {
    const records = parseGenBank(NUCLEOTIDE_RECORD);
    expect(records[0]!.locus.moleculeType).toBe('mRNA');
    expect(records[0]!.locus.length).toBe(7270);
  });

  it('should handle multi-line reference fields', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
REFERENCE   1  (residues 1 to 100)
  AUTHORS   Author,A., Author,B., Author,C.,
            Author,D. and Author,E.
  TITLE     A very long title that spans
            multiple lines in the record
  JOURNAL   J Biol Chem 299(1), 102-115
            (2024)
//
`;
    const records = parseGenBank(text);
    const ref = records[0]!.references[0]!;

    expect(ref.authors).toBe('Author,A., Author,B., Author,C., Author,D. and Author,E.');
    expect(ref.title).toBe('A very long title that spans multiple lines in the record');
    expect(ref.journal).toBe('J Biol Chem 299(1), 102-115 (2024)');
  });

  it('should handle multi-line qualifier values', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
FEATURES             Location/Qualifiers
     CDS             1..100
                     /translation="MEEPQSDPSVEPPLSQETFSDLWKLLPENN
                     VLSPLPSQAMDDLMLSPDDIEQWFTEDPGP"
//
`;
    const records = parseGenBank(text);

    expect(records[0]!.features[0]!.qualifiers[0]!.name).toBe('translation');
    expect(records[0]!.features[0]!.qualifiers[0]!.value).toContain(
      'MEEPQSDPSVEPPLSQETFSDLWKLLPENN',
    );
    expect(records[0]!.features[0]!.qualifiers[0]!.value).toContain(
      'VLSPLPSQAMDDLMLSPDDIEQWFTEDPGP',
    );
  });

  it('should handle multi-line feature locations', () => {
    const text = `LOCUS       TEST1                   100 aa            linear   PRI 01-JAN-2024
ACCESSION   TEST1
FEATURES             Location/Qualifiers
     CDS             join(1..50,
                     60..100)
                     /gene="TEST"
//
`;
    const records = parseGenBank(text);

    expect(records[0]!.features[0]!.location).toBe('join(1..50,60..100)');
    expect(records[0]!.features[0]!.qualifiers[0]!.name).toBe('gene');
  });

  it('should handle circular topology', () => {
    const text = `LOCUS       PLASMID1                5000 bp    DNA     circular BCT 01-JAN-2024
ACCESSION   PLASMID1
//
`;
    const records = parseGenBank(text);
    expect(records[0]!.locus.topology).toBe('circular');
    expect(records[0]!.locus.division).toBe('BCT');
  });
});

describe('createEmptyGenBankRecord', () => {
  it('should create an empty record with the given accession', () => {
    const record = createEmptyGenBankRecord('TEST_ACC');

    expect(record.accession).toBe('TEST_ACC');
    expect(record.locus.name).toBe('TEST_ACC');
    expect(record.locus.length).toBe(0);
    expect(record.definition).toBe('');
    expect(record.sequence).toBe('');
    expect(record.features).toEqual([]);
    expect(record.references).toEqual([]);
  });
});
