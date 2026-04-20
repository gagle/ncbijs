import type { CitationMatch, ECitMatchResult } from '../types/responses.js';

export function parseECitMatchText(text: string): ECitMatchResult {
  const lines = text.trim().split(/\r?\n|\r/);
  const citations: Array<CitationMatch> = [];

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const parts = line.split('|');
    const journal = parts[0] ?? '';
    const year = parts[1] ?? '';
    const volume = parts[2] ?? '';
    const firstPage = parts[3] ?? '';
    const authorName = parts[4] ?? '';
    const key = parts[5] ?? '';
    const pmid = parts[6]?.trim();

    const citation: CitationMatch = {
      journal,
      year,
      volume,
      firstPage,
      authorName,
      key,
      ...(pmid ? { pmid } : {}),
    };

    citations.push(citation);
  }

  return { citations };
}
