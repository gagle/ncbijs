import { describe, it, expect } from 'vitest';
import type { PubmedArticle } from '@ncbijs/pubmed-xml';
import { convertArticle } from './convert-article';

function buildPubmedArticle(overrides: Partial<PubmedArticle> = {}): PubmedArticle {
  return {
    pmid: '12345',
    title: 'Test Title',
    abstract: { structured: false, text: 'Abstract text.' },
    authors: [],
    journal: { title: 'Nature', isoAbbrev: 'Nature' },
    publicationDate: { year: 2024 },
    mesh: [],
    articleIds: { pmid: '12345' },
    publicationTypes: [],
    grants: [],
    keywords: [],
    commentsCorrections: [],
    dataBanks: [],
    language: 'eng',
    ...overrides,
  };
}

describe('convertArticle', () => {
  it('should map basic scalar fields', () => {
    const result = convertArticle(buildPubmedArticle());
    expect(result.pmid).toBe('12345');
    expect(result.title).toBe('Test Title');
  });

  it('should map flat abstract', () => {
    const result = convertArticle(
      buildPubmedArticle({
        abstract: { structured: false, text: 'Plain abstract.' },
      }),
    );
    expect(result.abstract.structured).toBe(false);
    expect(result.abstract.text).toBe('Plain abstract.');
    expect(result.abstract.sections).toBeUndefined();
  });

  it('should map structured abstract with sections', () => {
    const result = convertArticle(
      buildPubmedArticle({
        abstract: {
          structured: true,
          text: 'Full text.',
          sections: [
            { label: 'Background', nlmCategory: 'BACKGROUND', text: 'Background text.' },
            { label: 'Methods', nlmCategory: 'METHODS', text: 'Methods text.' },
          ],
        },
      }),
    );
    expect(result.abstract.structured).toBe(true);
    expect(result.abstract.sections).toHaveLength(2);
    expect(result.abstract.sections?.[0]).toEqual({
      label: 'Background',
      text: 'Background text.',
    });
    expect(result.abstract.sections?.[1]).toEqual({ label: 'Methods', text: 'Methods text.' });
  });

  it('should map individual authors', () => {
    const result = convertArticle(
      buildPubmedArticle({
        authors: [{ lastName: 'Smith', foreName: 'John', initials: 'J', affiliation: 'MIT' }],
      }),
    );
    expect(result.authors).toHaveLength(1);
    expect(result.authors[0]?.lastName).toBe('Smith');
    expect(result.authors[0]?.foreName).toBe('John');
    expect(result.authors[0]?.affiliation).toBe('MIT');
  });

  it('should map collective authors', () => {
    const result = convertArticle(
      buildPubmedArticle({
        authors: [{ collectiveName: 'WHO Collaborative Group' }],
      }),
    );
    expect(result.authors[0]?.collectiveName).toBe('WHO Collaborative Group');
    expect(result.authors[0]?.lastName).toBeUndefined();
  });

  it('should map journal info with optional fields', () => {
    const result = convertArticle(
      buildPubmedArticle({
        journal: {
          title: 'The Lancet',
          isoAbbrev: 'Lancet',
          issn: '0140-6736',
          volume: '399',
          issue: '10333',
        },
      }),
    );
    expect(result.journal).toEqual({
      title: 'The Lancet',
      isoAbbrev: 'Lancet',
      issn: '0140-6736',
      volume: '399',
      issue: '10333',
    });
  });

  it('should map journal info without optional fields', () => {
    const result = convertArticle(
      buildPubmedArticle({
        journal: { title: 'Nature', isoAbbrev: 'Nature' },
      }),
    );
    expect(result.journal.issn).toBeUndefined();
    expect(result.journal.volume).toBeUndefined();
    expect(result.journal.issue).toBeUndefined();
  });

  it('should map full publication date', () => {
    const result = convertArticle(
      buildPubmedArticle({
        publicationDate: { year: 2024, month: 3, day: 15 },
      }),
    );
    expect(result.publicationDate).toEqual({ year: 2024, month: 3, day: 15 });
  });

  it('should map partial publication date', () => {
    const result = convertArticle(
      buildPubmedArticle({
        publicationDate: { year: 2024 },
      }),
    );
    expect(result.publicationDate.year).toBe(2024);
    expect(result.publicationDate.month).toBeUndefined();
    expect(result.publicationDate.day).toBeUndefined();
  });

  it('should map mesh headings with qualifiers', () => {
    const result = convertArticle(
      buildPubmedArticle({
        mesh: [
          {
            descriptor: 'Neoplasms',
            descriptorUI: 'D009369',
            majorTopic: true,
            qualifiers: [
              { name: 'drug therapy', ui: 'Q000188', majorTopic: false },
              { name: 'genetics', ui: 'Q000235', majorTopic: true },
            ],
          },
        ],
      }),
    );
    expect(result.mesh).toHaveLength(1);
    expect(result.mesh[0]?.descriptor).toBe('Neoplasms');
    expect(result.mesh[0]?.majorTopic).toBe(true);
    expect(result.mesh[0]?.qualifiers).toEqual(['drug therapy', 'genetics']);
  });

  it('should map article IDs with optional fields', () => {
    const result = convertArticle(
      buildPubmedArticle({
        articleIds: {
          pmid: '12345',
          doi: '10.1234/test',
          pmc: 'PMC999999',
          pii: 'S0140-6736(24)00001-0',
        },
      }),
    );
    expect(result.articleIds).toEqual({
      pmid: '12345',
      doi: '10.1234/test',
      pmc: 'PMC999999',
      pii: 'S0140-6736(24)00001-0',
    });
  });

  it('should map article IDs without optional fields', () => {
    const result = convertArticle(
      buildPubmedArticle({
        articleIds: { pmid: '12345' },
      }),
    );
    expect(result.articleIds.pmid).toBe('12345');
    expect(result.articleIds.doi).toBeUndefined();
    expect(result.articleIds.pmc).toBeUndefined();
  });

  it('should map publication types', () => {
    const result = convertArticle(
      buildPubmedArticle({
        publicationTypes: ['Journal Article', 'Review'],
      }),
    );
    expect(result.publicationTypes).toEqual(['Journal Article', 'Review']);
  });

  it('should map grants', () => {
    const result = convertArticle(
      buildPubmedArticle({
        grants: [
          { grantId: 'R01-CA123456', acronym: 'CA', agency: 'NCI', country: 'United States' },
        ],
      }),
    );
    expect(result.grants).toHaveLength(1);
    expect(result.grants[0]).toEqual({
      grantId: 'R01-CA123456',
      agency: 'NCI',
      country: 'United States',
    });
  });

  it('should map keywords to plain strings', () => {
    const result = convertArticle(
      buildPubmedArticle({
        keywords: [
          { text: 'cancer', majorTopic: true, owner: 'NLM' },
          { text: 'treatment', majorTopic: false, owner: 'NOTNLM' },
        ],
      }),
    );
    expect(result.keywords).toEqual(['cancer', 'treatment']);
  });

  it('should handle empty arrays', () => {
    const result = convertArticle(buildPubmedArticle());
    expect(result.authors).toEqual([]);
    expect(result.mesh).toEqual([]);
    expect(result.publicationTypes).toEqual([]);
    expect(result.grants).toEqual([]);
    expect(result.keywords).toEqual([]);
  });
});
