import type { Chunk, ChunkOptions, JATSArticle, Section } from './interfaces/jats.interface.js';

const DEFAULT_MAX_TOKENS = 512;
const DEFAULT_OVERLAP = 50;

export function toChunks(article: JATSArticle, options?: ChunkOptions): ReadonlyArray<Chunk> {
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;
  const includeSectionTitle = options?.includeSectionTitle ?? true;

  const chunks: Array<Chunk> = [];

  for (const section of article.body) {
    collectSectionChunks(section, chunks, maxTokens, overlap, includeSectionTitle);
  }

  return chunks;
}

function collectSectionChunks(
  section: Section,
  chunks: Array<Chunk>,
  maxTokens: number,
  overlap: number,
  includeSectionTitle: boolean,
): void {
  const paragraphText = section.paragraphs.join('\n\n');

  if (paragraphText.trim()) {
    const text = includeSectionTitle ? `${section.title}\n\n${paragraphText}` : paragraphText;

    const textChunks = splitIntoChunks(text, maxTokens, overlap);

    for (const chunkText of textChunks) {
      chunks.push({
        text: chunkText,
        section: section.title,
        tokenCount: countTokens(chunkText),
        metadata: { depth: section.depth },
      });
    }
  }

  for (const subsection of section.subsections) {
    collectSectionChunks(subsection, chunks, maxTokens, overlap, includeSectionTitle);
  }
}

function splitIntoChunks(text: string, maxTokens: number, overlap: number): ReadonlyArray<string> {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= maxTokens) {
    return [words.join(' ')];
  }

  const chunks: Array<string> = [];
  let start = 0;
  const step = Math.max(1, maxTokens - overlap);

  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    chunks.push(words.slice(start, end).join(' '));
    if (end >= words.length) break;
    start += step;
  }

  return chunks;
}

function countTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
