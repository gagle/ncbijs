import { describe, expect, it } from 'vitest';
import { parseFasta } from './parse-fasta';

describe('parseFasta', () => {
  describe('single record', () => {
    it('should parse a single nucleotide sequence', () => {
      const fasta = '>seq1 Human TP53 gene\nATCGATCGATCG\nGCTAGCTAGCTA';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.id).toBe('seq1');
      expect(records[0]!.description).toBe('Human TP53 gene');
      expect(records[0]!.sequence).toBe('ATCGATCGATCGGCTAGCTAGCTA');
    });

    it('should parse a single protein sequence', () => {
      const fasta =
        '>sp|P04637|P53_HUMAN Cellular tumor antigen p53\nMEEPQSDPSVEPPLS\nQETFSDLWKLLPENN';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.id).toBe('sp|P04637|P53_HUMAN');
      expect(records[0]!.description).toBe('Cellular tumor antigen p53');
      expect(records[0]!.sequence).toBe('MEEPQSDPSVEPPLSQETFSDLWKLLPENN');
    });

    it('should handle header with no description', () => {
      const fasta = '>seq1\nATCG';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.id).toBe('seq1');
      expect(records[0]!.description).toBe('');
      expect(records[0]!.sequence).toBe('ATCG');
    });

    it('should handle single-line sequence', () => {
      const fasta = '>seq1 test\nATCG';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.sequence).toBe('ATCG');
    });
  });

  describe('multiple records', () => {
    it('should parse multiple sequences', () => {
      const fasta = [
        '>seq1 First sequence',
        'ATCGATCG',
        '>seq2 Second sequence',
        'MKTAYIAKQR',
        'QISFVKSHFS',
        '>seq3 Third sequence',
        'GATTACA',
      ].join('\n');

      const records = parseFasta(fasta);
      expect(records).toHaveLength(3);
      expect(records[0]!.id).toBe('seq1');
      expect(records[0]!.sequence).toBe('ATCGATCG');
      expect(records[1]!.id).toBe('seq2');
      expect(records[1]!.sequence).toBe('MKTAYIAKQRQISFVKSHFS');
      expect(records[2]!.id).toBe('seq3');
      expect(records[2]!.sequence).toBe('GATTACA');
    });
  });

  describe('whitespace handling', () => {
    it('should strip leading/trailing whitespace from sequence lines', () => {
      const fasta = '>seq1 test\n  ATCG  \n  GCTA  ';
      const records = parseFasta(fasta);
      expect(records[0]!.sequence).toBe('ATCGGCTA');
    });

    it('should skip blank lines', () => {
      const fasta = '>seq1 test\n\nATCG\n\nGCTA\n\n';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.sequence).toBe('ATCGGCTA');
    });

    it('should handle Windows line endings', () => {
      const fasta = '>seq1 test\r\nATCG\r\nGCTA\r\n';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.sequence).toBe('ATCGGCTA');
    });

    it('should trim description whitespace', () => {
      const fasta = '>seq1   extra spaces  \nATCG';
      const records = parseFasta(fasta);
      expect(records[0]!.description).toBe('extra spaces');
    });
  });

  describe('comments', () => {
    it('should skip comment lines starting with semicolon', () => {
      const fasta = '; This is a comment\n>seq1 test\n; Another comment\nATCG\nGCTA';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.sequence).toBe('ATCGGCTA');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty input', () => {
      expect(parseFasta('')).toEqual([]);
    });

    it('should return empty array for whitespace-only input', () => {
      expect(parseFasta('  \n  \n  ')).toEqual([]);
    });

    it('should return empty array for comment-only input', () => {
      expect(parseFasta('; just comments\n; nothing else')).toEqual([]);
    });

    it('should ignore text before the first header', () => {
      const fasta = 'orphan sequence data\n>seq1 test\nATCG';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.id).toBe('seq1');
    });

    it('should handle header with empty sequence', () => {
      const fasta = '>seq1 empty sequence\n>seq2 has data\nATCG';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(2);
      expect(records[0]!.id).toBe('seq1');
      expect(records[0]!.sequence).toBe('');
      expect(records[1]!.id).toBe('seq2');
      expect(records[1]!.sequence).toBe('ATCG');
    });

    it('should handle trailing newline', () => {
      const fasta = '>seq1 test\nATCG\n';
      const records = parseFasta(fasta);
      expect(records).toHaveLength(1);
      expect(records[0]!.sequence).toBe('ATCG');
    });
  });

  describe('real NCBI formats', () => {
    it('should parse GenBank nucleotide format', () => {
      const fasta =
        '>gi|568815597|ref|NC_000001.11| Homo sapiens chromosome 1, GRCh38.p14\nATCGATCGATCG';
      const records = parseFasta(fasta);
      expect(records[0]!.id).toBe('gi|568815597|ref|NC_000001.11|');
      expect(records[0]!.description).toBe('Homo sapiens chromosome 1, GRCh38.p14');
    });

    it('should parse UniProt/SwissProt format', () => {
      const fasta =
        '>sp|P04637|P53_HUMAN Cellular tumor antigen p53 OS=Homo sapiens OX=9606 GN=TP53 PE=1 SV=4\nMEEPQSDPSVEPPLSQETFSDLWKLL';
      const records = parseFasta(fasta);
      expect(records[0]!.id).toBe('sp|P04637|P53_HUMAN');
      expect(records[0]!.description).toContain('OS=Homo sapiens');
    });

    it('should parse NCBI protein format', () => {
      const fasta =
        '>NP_000537.3 cellular tumor antigen p53 isoform a [Homo sapiens]\nMEEPQSDPSVEPPLS';
      const records = parseFasta(fasta);
      expect(records[0]!.id).toBe('NP_000537.3');
      expect(records[0]!.description).toBe('cellular tumor antigen p53 isoform a [Homo sapiens]');
    });

    it('should parse multi-record NCBI efetch response', () => {
      const fasta = [
        '>NM_000546.6 Homo sapiens tumor protein p53 (TP53), transcript variant 1, mRNA',
        'GATGGGATTGGGGTTTTCCCCTCCCATGTGCTCAAGACTGGCGCTAAAAGTTTTGAGCTTCTCAAAAGTC',
        'TAGAGCCACCGTCCAGGGAGCAGGTAGCTGCTGGGCTCCGGGGACACTTTGCGTTCGGGCTGGGAGCGTG',
        '>NM_001126112.3 Homo sapiens tumor protein p53 (TP53), transcript variant 2, mRNA',
        'GATGGGATTGGGGTTTTCCCCTCCCATGTGCTCAAGACTGGCGCTAAAAGTTTTGAGCTTCTCAAAAGTC',
      ].join('\n');

      const records = parseFasta(fasta);
      expect(records).toHaveLength(2);
      expect(records[0]!.id).toBe('NM_000546.6');
      expect(records[0]!.sequence).toHaveLength(140);
      expect(records[1]!.id).toBe('NM_001126112.3');
      expect(records[1]!.sequence).toHaveLength(70);
    });
  });
});
