import { describe, expect, it } from 'vitest';
import { toMarkdown } from './to-markdown';
import type { JATSArticle } from './interfaces/jats.interface';

function buildArticle(overrides: Partial<JATSArticle> = {}): JATSArticle {
  return {
    front: {
      journal: { title: 'Nature' },
      article: { title: 'Test Article', authors: [] },
    },
    body: [],
    back: { references: [] },
    ...overrides,
  };
}

describe('toMarkdown', () => {
  it('should convert article title to h1', () => {
    const result = toMarkdown(buildArticle());
    expect(result).toContain('# Test Article');
  });

  it('should convert section titles to headings by depth', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Introduction',
          depth: 1,
          paragraphs: ['Text.'],
          tables: [],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('## Introduction');
  });

  it('should convert paragraphs to markdown text', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Methods',
          depth: 1,
          paragraphs: ['First paragraph.', 'Second paragraph.'],
          tables: [],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('First paragraph.');
    expect(result).toContain('Second paragraph.');
  });

  it('should convert tables to markdown tables', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Results',
          depth: 1,
          paragraphs: [],
          tables: [
            {
              caption: 'Table 1',
              headers: ['Name', 'Value'],
              rows: [
                ['A', '1'],
                ['B', '2'],
              ],
            },
          ],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('| Name | Value |');
    expect(result).toContain('| --- | --- |');
    expect(result).toContain('| A | 1 |');
  });

  it('should convert figures to markdown image references', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Results',
          depth: 1,
          paragraphs: [],
          tables: [],
          figures: [{ id: 'fig1', label: 'Figure 1', caption: 'A nice figure' }],
          subsections: [],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('**Figure 1:** A nice figure');
  });

  it('should convert references to numbered list', () => {
    const article = buildArticle({
      back: {
        references: [
          {
            id: 'ref1',
            authors: ['Smith J'],
            title: 'A study',
            source: 'Nature',
            year: 2024,
          },
        ],
      },
    });
    const result = toMarkdown(article);
    expect(result).toContain('1. Smith J. A study. Nature. 2024.');
  });

  it('should handle nested sections with correct heading levels', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Methods',
          depth: 1,
          paragraphs: [],
          tables: [],
          figures: [],
          subsections: [
            {
              title: 'Study Design',
              depth: 2,
              paragraphs: ['Design details.'],
              tables: [],
              figures: [],
              subsections: [],
            },
          ],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('## Methods');
    expect(result).toContain('### Study Design');
  });

  it('should handle article with no body', () => {
    const result = toMarkdown(buildArticle());
    expect(result).toContain('# Test Article');
    expect(result).not.toContain('##');
  });

  it('should handle article with no back matter', () => {
    const result = toMarkdown(buildArticle());
    expect(result).not.toContain('References');
  });

  it('should include abstract section', () => {
    const article = buildArticle({
      front: {
        journal: { title: 'Nature' },
        article: { title: 'Test', authors: [], abstract: 'This is the abstract.' },
      },
    });
    const result = toMarkdown(article);
    expect(result).toContain('## Abstract');
    expect(result).toContain('This is the abstract.');
  });

  it('should include acknowledgements', () => {
    const article = buildArticle({
      back: { references: [], acknowledgements: 'Thanks to all.' },
    });
    const result = toMarkdown(article);
    expect(result).toContain('## Acknowledgements');
    expect(result).toContain('Thanks to all.');
  });

  it('should include appendices', () => {
    const article = buildArticle({
      back: {
        references: [],
        appendices: [
          {
            title: 'Appendix A',
            depth: 1,
            paragraphs: ['Supplementary data.'],
            tables: [],
            figures: [],
            subsections: [],
          },
        ],
      },
    });
    const result = toMarkdown(article);
    expect(result).toContain('## Appendix A');
    expect(result).toContain('Supplementary data.');
  });

  it('should include authors with foreName and lastName', () => {
    const article = buildArticle({
      front: {
        journal: { title: 'Nature' },
        article: {
          title: 'Test',
          authors: [{ foreName: 'John', lastName: 'Smith', affiliations: [] }],
        },
      },
    });
    const result = toMarkdown(article);
    expect(result).toContain('**Authors:** John Smith');
  });

  it('should use collectiveName when available', () => {
    const article = buildArticle({
      front: {
        journal: { title: 'Nature' },
        article: {
          title: 'Test',
          authors: [{ collectiveName: 'The Consortium', affiliations: [] }],
        },
      },
    });
    const result = toMarkdown(article);
    expect(result).toContain('**Authors:** The Consortium');
  });

  it('should render references with all optional fields', () => {
    const article = buildArticle({
      back: {
        references: [
          {
            id: 'ref1',
            authors: ['Smith J', 'Doe A'],
            title: 'Study',
            source: 'Nature',
            year: 2024,
            volume: '625',
            pages: '100-105',
            doi: '10.1038/test',
          },
        ],
      },
    });
    const result = toMarkdown(article);
    expect(result).toContain('Smith J, Doe A.');
    expect(result).toContain('2024.');
    expect(result).toContain('625.');
    expect(result).toContain('100-105.');
    expect(result).toContain('doi:10.1038/test');
  });

  it('should render references without optional fields', () => {
    const article = buildArticle({
      back: {
        references: [
          {
            id: 'ref1',
            authors: [],
            title: 'Study',
            source: 'Nature',
          },
        ],
      },
    });
    const result = toMarkdown(article);
    expect(result).not.toContain('doi:');
    expect(result).toContain('Study. Nature.');
  });

  it('should render table without caption', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Results',
          depth: 1,
          paragraphs: [],
          tables: [
            {
              caption: '',
              headers: ['Col1'],
              rows: [['val1']],
            },
          ],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('| Col1 |');
    expect(result).not.toContain('*Table');
  });

  it('should render table without headers', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Results',
          depth: 1,
          paragraphs: [],
          tables: [
            {
              caption: 'Data',
              headers: [],
              rows: [['val1']],
            },
          ],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toMarkdown(article);
    expect(result).toContain('*Data*');
    expect(result).toContain('| val1 |');
  });
});
