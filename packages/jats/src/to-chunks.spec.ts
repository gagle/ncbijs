import { describe, expect, it } from 'vitest';
import { toChunks } from './to-chunks';
import type { JATSArticle } from './interfaces/jats.interface';

function buildArticle(overrides: Partial<JATSArticle> = {}): JATSArticle {
  return {
    front: {
      journal: { title: 'Nature' },
      article: { title: 'Test', authors: [] },
    },
    body: [],
    back: { references: [] },
    ...overrides,
  };
}

function buildSection(title: string, wordCount: number, depth = 1): JATSArticle['body'][number] {
  const words = Array.from({ length: wordCount }, (_, i) => `word${i}`);
  return {
    title,
    depth,
    paragraphs: [words.join(' ')],
    tables: [],
    figures: [],
    subsections: [],
  };
}

describe('toChunks', () => {
  describe('basic chunking', () => {
    it('should create chunks from article sections', () => {
      const article = buildArticle({ body: [buildSection('Intro', 50)] });
      const chunks = toChunks(article);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should set section name on each chunk', () => {
      const article = buildArticle({ body: [buildSection('Methods', 50)] });
      const chunks = toChunks(article);
      expect(chunks[0]!.section).toBe('Methods');
    });

    it('should compute tokenCount for each chunk', () => {
      const article = buildArticle({ body: [buildSection('Results', 50)] });
      const chunks = toChunks(article);
      expect(chunks[0]!.tokenCount).toBeGreaterThan(0);
    });

    it('should include metadata on each chunk', () => {
      const article = buildArticle({ body: [buildSection('Discussion', 50)] });
      const chunks = toChunks(article);
      expect(chunks[0]!.metadata).toBeDefined();
      expect(chunks[0]!.metadata['depth']).toBe(1);
    });
  });

  describe('options', () => {
    it('should use default maxTokens when not specified', () => {
      const article = buildArticle({ body: [buildSection('Intro', 100)] });
      const chunks = toChunks(article);
      expect(chunks).toHaveLength(1);
    });

    it('should respect custom maxTokens', () => {
      const article = buildArticle({ body: [buildSection('Intro', 100)] });
      const chunks = toChunks(article, { maxTokens: 30 });
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should split long sections into multiple chunks', () => {
      const article = buildArticle({ body: [buildSection('Intro', 1000)] });
      const chunks = toChunks(article, { maxTokens: 100 });
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.tokenCount).toBeLessThanOrEqual(101);
      }
    });

    it('should use default overlap when not specified', () => {
      const article = buildArticle({ body: [buildSection('Intro', 200)] });
      const chunksDefault = toChunks(article, { maxTokens: 100 });
      const chunksNoOverlap = toChunks(article, { maxTokens: 100, overlap: 0 });
      expect(chunksDefault.length).toBeGreaterThanOrEqual(chunksNoOverlap.length);
    });

    it('should respect custom overlap', () => {
      const article = buildArticle({ body: [buildSection('Intro', 200)] });
      const chunksSmall = toChunks(article, { maxTokens: 100, overlap: 10 });
      const chunksLarge = toChunks(article, { maxTokens: 100, overlap: 80 });
      expect(chunksLarge.length).toBeGreaterThanOrEqual(chunksSmall.length);
    });

    it('should include section title when includeSectionTitle is true', () => {
      const article = buildArticle({ body: [buildSection('Methods', 50)] });
      const chunks = toChunks(article, { includeSectionTitle: true });
      expect(chunks[0]!.text).toContain('Methods');
    });

    it('should exclude section title when includeSectionTitle is false', () => {
      const article = buildArticle({ body: [buildSection('Methods', 50)] });
      const chunks = toChunks(article, { includeSectionTitle: false });
      expect(chunks[0]!.text).not.toContain('Methods');
    });
  });

  describe('edge cases', () => {
    it('should return empty array for article with no body', () => {
      const article = buildArticle();
      const chunks = toChunks(article);
      expect(chunks).toHaveLength(0);
    });

    it('should handle very short sections', () => {
      const article = buildArticle({ body: [buildSection('Short', 3)] });
      const chunks = toChunks(article);
      expect(chunks).toHaveLength(1);
    });

    it('should handle section shorter than overlap', () => {
      const article = buildArticle({ body: [buildSection('Tiny', 5)] });
      const chunks = toChunks(article, { maxTokens: 100, overlap: 50 });
      expect(chunks).toHaveLength(1);
    });

    it('should handle nested sections', () => {
      const article = buildArticle({
        body: [
          {
            title: 'Parent',
            depth: 1,
            paragraphs: ['Parent text.'],
            tables: [],
            figures: [],
            subsections: [
              {
                title: 'Child',
                depth: 2,
                paragraphs: ['Child text.'],
                tables: [],
                figures: [],
                subsections: [],
              },
            ],
          },
        ],
      });
      const chunks = toChunks(article);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks.some((c) => c.section === 'Parent')).toBe(true);
      expect(chunks.some((c) => c.section === 'Child')).toBe(true);
    });

    it('should produce non-overlapping chunks when overlap is 0', () => {
      const article = buildArticle({ body: [buildSection('Intro', 200)] });
      const chunks = toChunks(article, { maxTokens: 100, overlap: 0 });
      for (let i = 1; i < chunks.length; i++) {
        const prevWords = chunks[i - 1]!.text.split(/\s+/);
        const currWords = chunks[i]!.text.split(/\s+/);
        const prevLast = prevWords[prevWords.length - 1];
        const currFirst = currWords[0];
        expect(prevLast).not.toBe(currFirst);
      }
    });
  });
});
