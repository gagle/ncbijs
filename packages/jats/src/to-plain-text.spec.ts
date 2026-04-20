import { describe, expect, it } from 'vitest';
import { toPlainText } from './to-plain-text';
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

describe('toPlainText', () => {
  it('should output title as plain text', () => {
    const result = toPlainText(buildArticle());
    expect(result).toContain('Test Article');
  });

  it('should output section titles with depth indication', () => {
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
              title: 'Design',
              depth: 2,
              paragraphs: ['Details.'],
              tables: [],
              figures: [],
              subsections: [],
            },
          ],
        },
      ],
    });
    const result = toPlainText(article);
    expect(result).toContain('Methods');
    expect(result).toContain('  Design');
  });

  it('should output paragraphs as plain text', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Intro',
          depth: 1,
          paragraphs: ['First paragraph.', 'Second paragraph.'],
          tables: [],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toPlainText(article);
    expect(result).toContain('First paragraph.');
    expect(result).toContain('Second paragraph.');
  });

  it('should strip all formatting from tables', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Results',
          depth: 1,
          paragraphs: [],
          tables: [
            {
              caption: 'Table 1',
              headers: ['A', 'B'],
              rows: [['1', '2']],
            },
          ],
          figures: [],
          subsections: [],
        },
      ],
    });
    const result = toPlainText(article);
    expect(result).toContain('Table: Table 1');
    expect(result).toContain('1 | 2');
  });

  it('should represent figures as text placeholders', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Results',
          depth: 1,
          paragraphs: [],
          tables: [],
          figures: [{ id: 'fig1', label: 'Figure 1', caption: 'A chart' }],
          subsections: [],
        },
      ],
    });
    const result = toPlainText(article);
    expect(result).toContain('[Figure 1: A chart]');
  });

  it('should output references as plain text', () => {
    const article = buildArticle({
      back: {
        references: [
          { id: 'ref1', authors: ['Smith J'], title: 'A study', source: 'Nature', year: 2024 },
        ],
      },
    });
    const result = toPlainText(article);
    expect(result).toContain('References:');
    expect(result).toContain('1. Smith J. A study. Nature. 2024');
  });

  it('should handle nested sections', () => {
    const article = buildArticle({
      body: [
        {
          title: 'Methods',
          depth: 1,
          paragraphs: ['Overview.'],
          tables: [],
          figures: [],
          subsections: [
            {
              title: 'Sub',
              depth: 2,
              paragraphs: ['Detail.'],
              tables: [],
              figures: [],
              subsections: [],
            },
          ],
        },
      ],
    });
    const result = toPlainText(article);
    expect(result).toContain('Methods');
    expect(result).toContain('  Sub');
    expect(result).toContain('  Detail.');
  });

  it('should handle article with no body', () => {
    const result = toPlainText(buildArticle());
    expect(result).toContain('Test Article');
  });

  it('should handle article with no back matter', () => {
    const result = toPlainText(buildArticle());
    expect(result).not.toContain('References');
  });

  it('should include abstract', () => {
    const article = buildArticle({
      front: {
        journal: { title: 'Nature' },
        article: { title: 'Test', authors: [], abstract: 'Abstract text here.' },
      },
    });
    const result = toPlainText(article);
    expect(result).toContain('Abstract:');
    expect(result).toContain('Abstract text here.');
  });
});
