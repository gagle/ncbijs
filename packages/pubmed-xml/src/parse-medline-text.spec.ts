import { describe, expect, it } from 'vitest';
import { parseMedlineText } from './parse-medline-text';

const MINIMAL_RECORD = [
  'PMID- 12345678',
  'TI  - Article title here',
  'AU  - Smith JA',
  'FAU - Smith, John A',
  'AB  - Abstract text here',
  'TA  - J Example',
  'JT  - Journal of Examples',
  'DP  - 2024 Mar 15',
  'MH  - Asthma/drug therapy*',
  'PT  - Journal Article',
  'LA  - eng',
  'AID - 10.1000/example [doi]',
  'VI  - 10',
  'IP  - 3',
  'GR  - R01 AI12345/AI/NIAID/United States',
  'OT  - cytokines',
].join('\n');

describe('parseMedlineText', () => {
  describe('basic parsing', () => {
    it('should parse single MEDLINE record', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles).toHaveLength(1);
      expect(articles[0]?.pmid).toBe('12345678');
      expect(articles[0]?.title).toBe('Article title here');
    });

    it('should parse multiple MEDLINE records', () => {
      const secondRecord = [
        'PMID- 87654321',
        'TI  - Second article',
        'TA  - J Test',
        'JT  - Journal of Testing',
        'DP  - 2023',
        'LA  - eng',
      ].join('\n');
      const twoRecords = MINIMAL_RECORD + '\n\n' + secondRecord;

      const articles = parseMedlineText(twoRecords);

      expect(articles).toHaveLength(2);
      expect(articles[0]?.pmid).toBe('12345678');
      expect(articles[1]?.pmid).toBe('87654321');
    });

    it('should return empty array for empty input', () => {
      expect(parseMedlineText('')).toEqual([]);
      expect(parseMedlineText('   ')).toEqual([]);
      expect(parseMedlineText('\n\n')).toEqual([]);
    });
  });

  describe('two-letter tag parsing', () => {
    it('should parse PMID tag', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.pmid).toBe('12345678');
      expect(articles[0]?.articleIds.pmid).toBe('12345678');
    });

    it('should parse TI tag as title', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.title).toBe('Article title here');
    });

    it('should parse AB tag as abstract', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.abstract.structured).toBe(false);
      expect(articles[0]?.abstract.text).toBe('Abstract text here');
    });

    it('should parse AU tag as author', () => {
      const record = [
        'PMID- 11111111',
        'AU  - Doe JB',
        'TA  - J',
        'JT  - Journal',
        'DP  - 2024',
        'LA  - eng',
      ].join('\n');

      const articles = parseMedlineText(record);

      expect(articles[0]?.authors).toHaveLength(1);
      expect(articles[0]?.authors[0]?.lastName).toBe('Doe');
      expect(articles[0]?.authors[0]?.initials).toBe('JB');
    });

    it('should parse FAU tag as full author name', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.authors).toHaveLength(1);
      expect(articles[0]?.authors[0]?.lastName).toBe('Smith');
      expect(articles[0]?.authors[0]?.foreName).toBe('John A');
    });

    it('should parse TA tag as journal abbreviation', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.journal.isoAbbrev).toBe('J Example');
    });

    it('should parse JT tag as journal title', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.journal.title).toBe('Journal of Examples');
    });

    it('should parse DP tag as publication date', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.publicationDate.year).toBe(2024);
      expect(articles[0]?.publicationDate.month).toBe(3);
      expect(articles[0]?.publicationDate.day).toBe(15);
    });

    it('should parse MH tag as MeSH heading', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.mesh).toHaveLength(1);
      expect(articles[0]?.mesh[0]?.descriptor).toBe('Asthma');
      expect(articles[0]?.mesh[0]?.majorTopic).toBe(false);
      expect(articles[0]?.mesh[0]?.qualifiers).toHaveLength(1);
      expect(articles[0]?.mesh[0]?.qualifiers[0]?.name).toBe('drug therapy');
      expect(articles[0]?.mesh[0]?.qualifiers[0]?.majorTopic).toBe(true);
    });

    it('should parse OT tag as keyword', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.keywords).toHaveLength(1);
      expect(articles[0]?.keywords[0]?.text).toBe('cytokines');
      expect(articles[0]?.keywords[0]?.majorTopic).toBe(false);
      expect(articles[0]?.keywords[0]?.owner).toBe('NOTNLM');
    });

    it('should parse PT tag as publication type', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.publicationTypes).toContain('Journal Article');
    });

    it('should parse LA tag as language', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.language).toBe('eng');
    });

    it('should parse AID tag as article ID', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.articleIds.doi).toBe('10.1000/example');
    });

    it('should parse VI tag as volume', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.journal.volume).toBe('10');
    });

    it('should parse IP tag as issue', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.journal.issue).toBe('3');
    });

    it('should parse GR tag as grant', () => {
      const articles = parseMedlineText(MINIMAL_RECORD);

      expect(articles[0]?.grants).toHaveLength(1);
      expect(articles[0]?.grants[0]?.grantId).toBe('R01 AI12345');
      expect(articles[0]?.grants[0]?.acronym).toBe('AI');
      expect(articles[0]?.grants[0]?.agency).toBe('NIAID');
      expect(articles[0]?.grants[0]?.country).toBe('United States');
    });
  });

  describe('continuation lines', () => {
    it('should join multi-line values', () => {
      const record = [
        'PMID- 22222222',
        'TI  - A very long title that spans',
        '      multiple lines in the file',
        'TA  - J',
        'JT  - Journal',
        'DP  - 2024',
        'LA  - eng',
      ].join('\n');

      const articles = parseMedlineText(record);

      expect(articles[0]?.title).toBe('A very long title that spans multiple lines in the file');
    });

    it('should handle indented continuation lines', () => {
      const record = [
        'PMID- 33333333',
        'AB  - This abstract is quite long and',
        '      continues on the next line with',
        '      additional details about the study.',
        'TA  - J',
        'JT  - Journal',
        'DP  - 2024',
        'LA  - eng',
      ].join('\n');

      const articles = parseMedlineText(record);

      expect(articles[0]?.abstract.text).toBe(
        'This abstract is quite long and continues on the next line with additional details about the study.',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle missing optional fields', () => {
      const record = ['PMID- 44444444', 'TA  - J', 'JT  - Journal', 'DP  - 2024', 'LA  - eng'].join(
        '\n',
      );

      const articles = parseMedlineText(record);

      expect(articles[0]?.pmid).toBe('44444444');
      expect(articles[0]?.title).toBe('');
      expect(articles[0]?.abstract.text).toBe('');
      expect(articles[0]?.authors).toHaveLength(0);
      expect(articles[0]?.mesh).toHaveLength(0);
      expect(articles[0]?.keywords).toHaveLength(0);
      expect(articles[0]?.grants).toHaveLength(0);
    });

    it('should handle malformed records gracefully', () => {
      const malformedRecord = 'this is not a valid medline record at all';

      const articles = parseMedlineText(malformedRecord);

      expect(articles).toHaveLength(1);
      expect(articles[0]?.pmid).toBe('');
    });

    it('should handle records separated by blank lines', () => {
      const firstRecord = [
        'PMID- 55555555',
        'TI  - First Record',
        'TA  - J',
        'JT  - Journal',
        'DP  - 2024',
        'LA  - eng',
      ].join('\n');

      const secondRecord = [
        'PMID- 66666666',
        'TI  - Second Record',
        'TA  - J',
        'JT  - Journal',
        'DP  - 2023',
        'LA  - eng',
      ].join('\n');

      const separatedRecords = firstRecord + '\n\n\n' + secondRecord;

      const articles = parseMedlineText(separatedRecords);

      expect(articles).toHaveLength(2);
      expect(articles[0]?.pmid).toBe('55555555');
      expect(articles[0]?.title).toBe('First Record');
      expect(articles[1]?.pmid).toBe('66666666');
      expect(articles[1]?.title).toBe('Second Record');
    });
  });
});
