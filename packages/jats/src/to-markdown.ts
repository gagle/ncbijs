import type { JATSArticle, Section, Table } from './interfaces/jats.interface';

/** Convert a parsed JATS article into a Markdown-formatted string. */
export function toMarkdown(article: JATSArticle): string {
  const lines: Array<string> = [];

  lines.push(`# ${article.front.article.title}`);
  lines.push('');

  if (article.front.article.authors.length > 0) {
    const authorNames = article.front.article.authors.map(
      (a) => a.collectiveName ?? [a.foreName, a.lastName].filter(Boolean).join(' '),
    );
    lines.push(`**Authors:** ${authorNames.join(', ')}`);
    lines.push('');
  }

  if (article.front.article.abstract) {
    lines.push('## Abstract');
    lines.push('');
    lines.push(article.front.article.abstract);
    lines.push('');
  }

  for (const section of article.body) {
    renderSectionMarkdown(section, lines);
  }

  if (article.back.references.length > 0) {
    lines.push('## References');
    lines.push('');
    for (const [index, ref] of article.back.references.entries()) {
      const parts: Array<string> = [];
      if (ref.authors.length > 0) {
        parts.push(ref.authors.join(', ') + '.');
      }
      parts.push(ref.title + '.');
      parts.push(ref.source + '.');
      if (ref.year) parts.push(`${ref.year}.`);
      if (ref.volume) parts.push(`${ref.volume}.`);
      if (ref.pages) parts.push(ref.pages + '.');
      if (ref.doi) parts.push(`doi:${ref.doi}`);
      lines.push(`${index + 1}. ${parts.join(' ')}`);
    }
    lines.push('');
  }

  if (article.back.acknowledgements) {
    lines.push('## Acknowledgements');
    lines.push('');
    lines.push(article.back.acknowledgements);
    lines.push('');
  }

  if (article.back.appendices && article.back.appendices.length > 0) {
    for (const appendix of article.back.appendices) {
      lines.push(`## ${appendix.title}`);
      lines.push('');
      for (const paragraph of appendix.paragraphs) {
        lines.push(paragraph);
        lines.push('');
      }
    }
  }

  return lines.join('\n').trim();
}

function renderSectionMarkdown(section: Section, lines: Array<string>): void {
  const headingPrefix = '#'.repeat(Math.min(section.depth + 1, 6));
  lines.push(`${headingPrefix} ${section.title}`);
  lines.push('');

  for (const paragraph of section.paragraphs) {
    lines.push(paragraph);
    lines.push('');
  }

  for (const table of section.tables) {
    renderTableMarkdown(table, lines);
  }

  for (const figure of section.figures) {
    lines.push(`**${figure.label}:** ${figure.caption}`);
    lines.push('');
  }

  for (const subsection of section.subsections) {
    renderSectionMarkdown(subsection, lines);
  }
}

function renderTableMarkdown(table: Table, lines: Array<string>): void {
  if (table.caption) {
    lines.push(`*${table.caption}*`);
    lines.push('');
  }

  if (table.headers.length > 0) {
    lines.push(`| ${table.headers.join(' | ')} |`);
    lines.push(`| ${table.headers.map(() => '---').join(' | ')} |`);
  }

  for (const row of table.rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }

  lines.push('');
}
