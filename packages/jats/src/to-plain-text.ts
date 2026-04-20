import type { JATSArticle, Section } from './interfaces/jats.interface.js';

export function toPlainText(article: JATSArticle): string {
  const lines: Array<string> = [];

  lines.push(article.front.article.title);
  lines.push('');

  if (article.front.article.abstract) {
    lines.push('Abstract:');
    lines.push(article.front.article.abstract);
    lines.push('');
  }

  for (const section of article.body) {
    renderSectionPlainText(section, lines);
  }

  if (article.back.references.length > 0) {
    lines.push('References:');
    for (const [index, ref] of article.back.references.entries()) {
      const parts: Array<string> = [];
      if (ref.authors.length > 0) parts.push(ref.authors.join(', '));
      parts.push(ref.title);
      parts.push(ref.source);
      if (ref.year) parts.push(String(ref.year));
      lines.push(`${index + 1}. ${parts.join('. ')}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function renderSectionPlainText(section: Section, lines: Array<string>): void {
  const indent = '  '.repeat(section.depth - 1);

  lines.push(`${indent}${section.title}`);
  lines.push('');

  for (const paragraph of section.paragraphs) {
    lines.push(`${indent}${paragraph}`);
    lines.push('');
  }

  for (const table of section.tables) {
    if (table.caption) {
      lines.push(`${indent}Table: ${table.caption}`);
    }
    for (const row of table.rows) {
      lines.push(`${indent}${row.join(' | ')}`);
    }
    lines.push('');
  }

  for (const figure of section.figures) {
    lines.push(`${indent}[${figure.label}: ${figure.caption}]`);
    lines.push('');
  }

  for (const subsection of section.subsections) {
    renderSectionPlainText(subsection, lines);
  }
}
