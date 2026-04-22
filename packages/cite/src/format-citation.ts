import type { Author, PartialDate, PubmedArticle } from '@ncbijs/pubmed-xml';
import type { CitationFormat, CSLData } from './interfaces/cite.interface';

/** Format a {@link PubmedArticle} as a citation string in the given format. */
export function formatCitation(article: PubmedArticle, format: CitationFormat): string {
  switch (format) {
    case 'ris':
      return formatRis(article);
    case 'medline':
      return formatMedline(article);
    case 'csl':
      return formatCsl(article);
    case 'citation':
      return formatNlmCitation(article);
  }
}

function formatRis(article: PubmedArticle): string {
  const lines: Array<string> = [];

  lines.push('TY  - JOUR');
  lines.push(`TI  - ${article.title}`);

  for (const author of article.authors) {
    const authorName = formatRisAuthor(author);

    if (authorName !== '') {
      lines.push(`AU  - ${authorName}`);
    }
  }

  if (article.journal.title !== '') {
    lines.push(`JO  - ${article.journal.title}`);
  }

  if (article.journal.isoAbbrev !== '') {
    lines.push(`JA  - ${article.journal.isoAbbrev}`);
  }

  if (article.journal.volume !== undefined) {
    lines.push(`VL  - ${article.journal.volume}`);
  }

  if (article.journal.issue !== undefined) {
    lines.push(`IS  - ${article.journal.issue}`);
  }

  const dateString = formatDateTag(article.publicationDate);

  if (dateString !== '') {
    lines.push(`PY  - ${dateString}`);
  }

  if (article.abstract.text !== '') {
    lines.push(`AB  - ${article.abstract.text}`);
  }

  lines.push(`AN  - ${article.pmid}`);

  if (article.articleIds.doi !== undefined) {
    lines.push(`DO  - ${article.articleIds.doi}`);
  }

  if (article.language !== '') {
    lines.push(`LA  - ${article.language}`);
  }

  for (const keyword of article.keywords) {
    lines.push(`KW  - ${keyword.text}`);
  }

  lines.push('ER  - ');

  return lines.join('\n');
}

function formatRisAuthor(author: Author): string {
  if (author.collectiveName !== undefined) {
    return author.collectiveName;
  }

  if (author.lastName !== undefined && author.foreName !== undefined) {
    return `${author.lastName}, ${author.foreName}`;
  }

  if (author.lastName !== undefined) {
    return author.lastName;
  }

  return '';
}

function formatMedline(article: PubmedArticle): string {
  const lines: Array<string> = [];

  lines.push(`PMID- ${article.pmid}`);

  if (article.articleIds.doi !== undefined) {
    lines.push(`AID - ${article.articleIds.doi} [doi]`);
  }

  lines.push(`TI  - ${article.title}`);

  for (const author of article.authors) {
    const authorName = formatMedlineAuthor(author);

    if (authorName !== '') {
      lines.push(`AU  - ${authorName}`);
    }
  }

  if (article.journal.isoAbbrev !== '') {
    lines.push(`TA  - ${article.journal.isoAbbrev}`);
  }

  if (article.journal.title !== '') {
    lines.push(`JT  - ${article.journal.title}`);
  }

  if (article.journal.volume !== undefined) {
    lines.push(`VI  - ${article.journal.volume}`);
  }

  if (article.journal.issue !== undefined) {
    lines.push(`IP  - ${article.journal.issue}`);
  }

  const dateString = formatDateParts(article.publicationDate);

  if (dateString !== '') {
    lines.push(`DP  - ${dateString}`);
  }

  if (article.abstract.text !== '') {
    lines.push(`AB  - ${article.abstract.text}`);
  }

  if (article.language !== '') {
    lines.push(`LA  - ${article.language}`);
  }

  for (const meshHeading of article.mesh) {
    const qualifierSuffix = meshHeading.qualifiers.map((q) => `/${q.name}`).join('');
    const majorMarker = meshHeading.majorTopic ? '*' : '';
    lines.push(`MH  - ${majorMarker}${meshHeading.descriptor}${qualifierSuffix}`);
  }

  for (const publicationType of article.publicationTypes) {
    lines.push(`PT  - ${publicationType}`);
  }

  return lines.join('\n');
}

function formatMedlineAuthor(author: Author): string {
  if (author.collectiveName !== undefined) {
    return author.collectiveName;
  }

  if (author.lastName !== undefined && author.initials !== undefined) {
    return `${author.lastName} ${author.initials}`;
  }

  if (author.lastName !== undefined) {
    return author.lastName;
  }

  return '';
}

function formatCsl(article: PubmedArticle): string {
  const dateParts = buildCslDateParts(article.publicationDate);

  const csl: CSLData = {
    type: 'article-journal',
    id: `PMID:${article.pmid}`,
    title: article.title,
    author: article.authors.filter(hasCslName).map(formatCslAuthor),
    issued: { 'date-parts': [dateParts] },
    ...(article.journal.title !== '' && { 'container-title': article.journal.title }),
    ...(article.journal.volume !== undefined && { volume: article.journal.volume }),
    ...(article.journal.issue !== undefined && { issue: article.journal.issue }),
    ...(article.articleIds.doi !== undefined && { DOI: article.articleIds.doi }),
    PMID: article.pmid,
    ...(article.articleIds.pmc !== undefined && { PMCID: article.articleIds.pmc }),
    ...(article.abstract.text !== '' && { abstract: article.abstract.text }),
  };

  return JSON.stringify(csl, undefined, 2);
}

function hasCslName(author: Author): boolean {
  return author.lastName !== undefined;
}

function formatCslAuthor(author: Author): { family: string; given: string } {
  return {
    family: author.lastName ?? '',
    given: author.foreName ?? '',
  };
}

function buildCslDateParts(date: PartialDate): ReadonlyArray<number> {
  const parts: Array<number> = [date.year];

  if (date.month !== undefined) {
    parts.push(date.month);
  }

  if (date.day !== undefined) {
    parts.push(date.day);
  }

  return parts;
}

function formatNlmCitation(article: PubmedArticle): string {
  const authorString = formatNlmAuthors(article.authors);
  const dateString = formatDateParts(article.publicationDate);
  const journalAbbrev = article.journal.isoAbbrev;
  const volumeIssue = formatVolumeIssue(article.journal.volume, article.journal.issue);
  const doi = article.articleIds.doi;

  let citation = '';

  if (authorString !== '') {
    citation += `${authorString}. `;
  }

  citation += article.title;

  if (!article.title.endsWith('.')) {
    citation += '.';
  }

  citation += ` ${journalAbbrev}.`;

  if (dateString !== '') {
    citation += ` ${dateString}`;
  }

  if (volumeIssue !== '') {
    citation += `;${volumeIssue}`;
  }

  citation += '.';

  if (doi !== undefined) {
    citation += ` doi: ${doi}`;
  }

  citation += ` PMID: ${article.pmid}`;

  if (article.articleIds.pmc !== undefined) {
    citation += `; PMCID: ${article.articleIds.pmc}`;
  }

  citation += '.';

  return citation;
}

function formatNlmAuthors(authors: ReadonlyArray<Author>): string {
  const formatted: Array<string> = [];

  for (const author of authors) {
    if (author.collectiveName !== undefined) {
      formatted.push(author.collectiveName);
    } else if (author.lastName !== undefined) {
      const initials = author.initials ?? '';
      formatted.push(initials !== '' ? `${author.lastName} ${initials}` : author.lastName);
    }
  }

  if (formatted.length === 0) {
    return '';
  }

  if (formatted.length > 6) {
    return `${formatted.slice(0, 6).join(', ')}, et al`;
  }

  return formatted.join(', ');
}

function formatVolumeIssue(volume?: string, issue?: string): string {
  if (volume === undefined) {
    return '';
  }

  if (issue !== undefined) {
    return `${volume}(${issue})`;
  }

  return volume;
}

function formatDateTag(date: PartialDate): string {
  const parts: Array<string> = [String(date.year)];

  if (date.month !== undefined) {
    parts.push(String(date.month).padStart(2, '0'));
  }

  if (date.day !== undefined) {
    parts.push(String(date.day).padStart(2, '0'));
  }

  return parts.join('/');
}

function formatDateParts(date: PartialDate): string {
  if (date.season !== undefined) {
    return `${date.year} ${date.season}`;
  }

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  let result = String(date.year);

  if (date.month !== undefined) {
    result += ` ${monthNames[date.month - 1] ?? ''}`;
  }

  if (date.day !== undefined) {
    result += ` ${date.day}`;
  }

  return result;
}
