import { describe, expect, it } from 'vitest';
import type { PubmedArticle } from '@ncbijs/pubmed-xml';
import { formatCitation } from './format-citation';

const SAMPLE_ARTICLE: PubmedArticle = {
  pmid: '12345678',
  title: 'Effects of aspirin on platelet aggregation',
  abstract: {
    structured: false,
    text: 'This study examined the effects of aspirin.',
  },
  authors: [
    { lastName: 'Smith', foreName: 'John A', initials: 'JA', affiliations: ['MIT'] },
    { lastName: 'Doe', foreName: 'Jane B', initials: 'JB', affiliations: ['Harvard'] },
  ],
  journal: {
    title: 'Journal of Clinical Investigation',
    isoAbbrev: 'J Clin Invest',
    issn: '0021-9738',
    volume: '125',
    issue: '3',
  },
  publicationDate: { year: 2023, month: 6, day: 15 },
  mesh: [
    {
      descriptor: 'Aspirin',
      descriptorUI: 'D001241',
      majorTopic: true,
      qualifiers: [{ name: 'pharmacology', ui: 'Q000494', majorTopic: false }],
    },
    {
      descriptor: 'Platelet Aggregation',
      descriptorUI: 'D010974',
      majorTopic: false,
      qualifiers: [],
    },
  ],
  articleIds: { pmid: '12345678', doi: '10.1172/JCI12345', pmc: 'PMC9876543' },
  publicationTypes: ['Journal Article', 'Randomized Controlled Trial'],
  grants: [],
  keywords: [
    { text: 'aspirin', majorTopic: false, owner: 'NOTNLM' },
    { text: 'platelets', majorTopic: false, owner: 'NOTNLM' },
  ],
  commentsCorrections: [],
  dataBanks: [],
  language: 'eng',
};

describe('formatCitation', () => {
  describe('RIS format', () => {
    it('produces valid RIS output with all fields', () => {
      const result = formatCitation(SAMPLE_ARTICLE, 'ris');

      expect(result).toContain('TY  - JOUR');
      expect(result).toContain('TI  - Effects of aspirin on platelet aggregation');
      expect(result).toContain('AU  - Smith, John A');
      expect(result).toContain('AU  - Doe, Jane B');
      expect(result).toContain('JO  - Journal of Clinical Investigation');
      expect(result).toContain('JA  - J Clin Invest');
      expect(result).toContain('VL  - 125');
      expect(result).toContain('IS  - 3');
      expect(result).toContain('PY  - 2023/06/15');
      expect(result).toContain('AB  - This study examined the effects of aspirin.');
      expect(result).toContain('AN  - 12345678');
      expect(result).toContain('DO  - 10.1172/JCI12345');
      expect(result).toContain('LA  - eng');
      expect(result).toContain('KW  - aspirin');
      expect(result).toContain('KW  - platelets');
      expect(result).toContain('ER  - ');
    });

    it('formats collective author names', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ collectiveName: 'WHO Working Group', affiliations: [] }],
      };

      const result = formatCitation(article, 'ris');

      expect(result).toContain('AU  - WHO Working Group');
    });

    it('formats author with only lastName', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ lastName: 'Smith', affiliations: [] }],
      };

      const result = formatCitation(article, 'ris');

      expect(result).toContain('AU  - Smith');
    });

    it('skips author with no name fields', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ affiliations: ['MIT'] }],
      };

      const result = formatCitation(article, 'ris');

      expect(result).not.toContain('AU  -');
    });

    it('omits optional fields when absent', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        journal: { title: '', isoAbbrev: '', volume: undefined, issue: undefined },
        abstract: { structured: false, text: '' },
        articleIds: { pmid: '12345678' },
        keywords: [],
        language: '',
      };

      const result = formatCitation(article, 'ris');

      expect(result).not.toContain('JO  -');
      expect(result).not.toContain('JA  -');
      expect(result).not.toContain('VL  -');
      expect(result).not.toContain('IS  -');
      expect(result).not.toContain('AB  -');
      expect(result).not.toContain('DO  -');
      expect(result).not.toContain('LA  -');
      expect(result).not.toContain('KW  -');
    });

    it('formats date with year only', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        publicationDate: { year: 2023 },
      };

      const result = formatCitation(article, 'ris');

      expect(result).toContain('PY  - 2023');
    });
  });

  describe('MEDLINE format', () => {
    it('produces valid MEDLINE output with all fields', () => {
      const result = formatCitation(SAMPLE_ARTICLE, 'medline');

      expect(result).toContain('PMID- 12345678');
      expect(result).toContain('AID - 10.1172/JCI12345 [doi]');
      expect(result).toContain('TI  - Effects of aspirin on platelet aggregation');
      expect(result).toContain('AU  - Smith JA');
      expect(result).toContain('AU  - Doe JB');
      expect(result).toContain('TA  - J Clin Invest');
      expect(result).toContain('JT  - Journal of Clinical Investigation');
      expect(result).toContain('VI  - 125');
      expect(result).toContain('IP  - 3');
      expect(result).toContain('DP  - 2023 Jun 15');
      expect(result).toContain('AB  - This study examined the effects of aspirin.');
      expect(result).toContain('LA  - eng');
      expect(result).toContain('MH  - *Aspirin/pharmacology');
      expect(result).toContain('MH  - Platelet Aggregation');
      expect(result).toContain('PT  - Journal Article');
      expect(result).toContain('PT  - Randomized Controlled Trial');
    });

    it('formats collective author names', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ collectiveName: 'ACME Group', affiliations: [] }],
      };

      const result = formatCitation(article, 'medline');

      expect(result).toContain('AU  - ACME Group');
    });

    it('formats author with only lastName', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ lastName: 'Smith', affiliations: [] }],
      };

      const result = formatCitation(article, 'medline');

      expect(result).toContain('AU  - Smith');
    });

    it('skips authors with no name fields', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ affiliations: [] }],
      };

      const result = formatCitation(article, 'medline');

      expect(result).not.toMatch(/^AU {2}- /m);
    });

    it('formats date with season', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        publicationDate: { year: 2023, season: 'Spring' },
      };

      const result = formatCitation(article, 'medline');

      expect(result).toContain('DP  - 2023 Spring');
    });

    it('formats date with year and month only', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        publicationDate: { year: 2023, month: 3 },
      };

      const result = formatCitation(article, 'medline');

      expect(result).toContain('DP  - 2023 Mar');
    });

    it('omits optional fields when absent', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        journal: { title: '', isoAbbrev: '', volume: undefined, issue: undefined },
        abstract: { structured: false, text: '' },
        articleIds: { pmid: '12345678' },
        mesh: [],
        publicationTypes: [],
        language: '',
      };

      const result = formatCitation(article, 'medline');

      expect(result).not.toContain('AID -');
      expect(result).not.toContain('TA  -');
      expect(result).not.toContain('JT  -');
      expect(result).not.toContain('VI  -');
      expect(result).not.toContain('IP  -');
      expect(result).not.toContain('AB  -');
      expect(result).not.toContain('LA  -');
      expect(result).not.toContain('MH  -');
      expect(result).not.toContain('PT  -');
    });
  });

  describe('CSL-JSON format', () => {
    it('produces valid CSL-JSON output', () => {
      const result = formatCitation(SAMPLE_ARTICLE, 'csl');
      const csl = JSON.parse(result);

      expect(csl.type).toBe('article-journal');
      expect(csl.id).toBe('PMID:12345678');
      expect(csl.title).toBe('Effects of aspirin on platelet aggregation');
      expect(csl.author).toEqual([
        { family: 'Smith', given: 'John A' },
        { family: 'Doe', given: 'Jane B' },
      ]);
      expect(csl.issued).toEqual({ 'date-parts': [[2023, 6, 15]] });
      expect(csl['container-title']).toBe('Journal of Clinical Investigation');
      expect(csl.volume).toBe('125');
      expect(csl.issue).toBe('3');
      expect(csl.DOI).toBe('10.1172/JCI12345');
      expect(csl.PMID).toBe('12345678');
      expect(csl.PMCID).toBe('PMC9876543');
      expect(csl.abstract).toBe('This study examined the effects of aspirin.');
    });

    it('omits optional CSL fields when absent', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        journal: { title: '', isoAbbrev: '', volume: undefined, issue: undefined },
        abstract: { structured: false, text: '' },
        articleIds: { pmid: '12345678' },
      };

      const result = formatCitation(article, 'csl');
      const csl = JSON.parse(result);

      expect(csl['container-title']).toBeUndefined();
      expect(csl.volume).toBeUndefined();
      expect(csl.issue).toBeUndefined();
      expect(csl.DOI).toBeUndefined();
      expect(csl.PMCID).toBeUndefined();
      expect(csl.abstract).toBeUndefined();
    });

    it('excludes authors without lastName from CSL output', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [
          { lastName: 'Smith', foreName: 'John', affiliations: [] },
          { collectiveName: 'WHO Group', affiliations: [] },
        ],
      };

      const result = formatCitation(article, 'csl');
      const csl = JSON.parse(result);

      expect(csl.author).toEqual([{ family: 'Smith', given: 'John' }]);
    });

    it('handles date with year only', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        publicationDate: { year: 2023 },
      };

      const result = formatCitation(article, 'csl');
      const csl = JSON.parse(result);

      expect(csl.issued).toEqual({ 'date-parts': [[2023]] });
    });

    it('handles author with lastName but no foreName', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ lastName: 'Smith', affiliations: [] }],
      };

      const result = formatCitation(article, 'csl');
      const csl = JSON.parse(result);

      expect(csl.author).toEqual([{ family: 'Smith', given: '' }]);
    });
  });

  describe('NLM citation format', () => {
    it('produces valid NLM citation', () => {
      const result = formatCitation(SAMPLE_ARTICLE, 'citation');

      expect(result).toBe(
        'Smith JA, Doe JB. Effects of aspirin on platelet aggregation. J Clin Invest. 2023 Jun 15;125(3). doi: 10.1172/JCI12345 PMID: 12345678; PMCID: PMC9876543.',
      );
    });

    it('truncates to first 6 authors with et al', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: Array.from({ length: 8 }, (_, index) => ({
          lastName: `Author${index + 1}`,
          initials: `A${index + 1}`,
          affiliations: [],
        })),
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain(
        'Author1 A1, Author2 A2, Author3 A3, Author4 A4, Author5 A5, Author6 A6, et al.',
      );
    });

    it('omits author section when no authors', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [],
      };

      const result = formatCitation(article, 'citation');

      expect(result).toMatch(/^Effects of aspirin/);
    });

    it('omits doi when absent', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        articleIds: { pmid: '12345678' },
      };

      const result = formatCitation(article, 'citation');

      expect(result).not.toContain('doi:');
      expect(result).toContain('PMID: 12345678.');
    });

    it('omits PMCID when absent', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        articleIds: { pmid: '12345678', doi: '10.1172/JCI12345' },
      };

      const result = formatCitation(article, 'citation');

      expect(result).not.toContain('PMCID');
    });

    it('handles volume without issue', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        journal: { ...SAMPLE_ARTICLE.journal, issue: undefined },
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain(';125.');
      expect(result).not.toContain('(');
    });

    it('omits volume and issue when both absent', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        journal: { ...SAMPLE_ARTICLE.journal, volume: undefined, issue: undefined },
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain('2023 Jun 15. doi:');
    });

    it('adds period after title that does not end with one', () => {
      const result = formatCitation(SAMPLE_ARTICLE, 'citation');

      expect(result).toContain('platelet aggregation. J Clin Invest.');
    });

    it('does not double-period after title ending with one', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        title: 'Title ending with period.',
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain('Title ending with period. J Clin Invest.');
      expect(result).not.toContain('period.. J');
    });

    it('includes collective name in NLM author list', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [
          { lastName: 'Smith', initials: 'JA', affiliations: [] },
          { collectiveName: 'ACME Group', affiliations: [] },
        ],
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain('Smith JA, ACME Group.');
    });

    it('skips authors with no name fields in NLM format', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [
          { lastName: 'Smith', initials: 'JA', affiliations: [] },
          { affiliations: ['MIT'] },
        ],
      };

      const result = formatCitation(article, 'citation');

      expect(result).toMatch(/^Smith JA\./);
    });

    it('handles out-of-range month gracefully', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        publicationDate: { year: 2023, month: 13 },
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain('2023');
    });

    it('formats NLM author with lastName only', () => {
      const article: PubmedArticle = {
        ...SAMPLE_ARTICLE,
        authors: [{ lastName: 'Smith', affiliations: [] }],
      };

      const result = formatCitation(article, 'citation');

      expect(result).toContain('Smith.');
    });
  });
});
