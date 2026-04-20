import type {
  ArticleMeta,
  Author,
  Back,
  Figure,
  Front,
  JATSArticle,
  JournalMeta,
  PartialDate,
  Reference,
  Section,
  Table,
} from './interfaces/jats.interface.js';
import {
  decodeEntities,
  readAllBlocks,
  readAllBlocksWithAttributes,
  readBlock,
  readTag,
  removeAllBlocks,
} from '@ncbijs/xml';

export function parseJATS(xml: string): JATSArticle {
  if (!xml.trim()) {
    throw new Error('Empty input');
  }

  const articleXml = readBlock(xml, 'article');
  if (!articleXml) {
    throw new Error('Invalid JATS XML: no <article> element found');
  }

  return {
    front: parseFront(articleXml),
    body: parseBody(articleXml),
    back: parseBack(articleXml),
  };
}

function parseFront(articleXml: string): Front {
  const frontXml = readBlock(articleXml, 'front') ?? '';
  return {
    journal: parseJournalMeta(readBlock(frontXml, 'journal-meta') ?? ''),
    article: parseArticleMeta(readBlock(frontXml, 'article-meta') ?? ''),
  };
}

function parseJournalMeta(xml: string): JournalMeta {
  const titleBlock = readBlock(xml, 'journal-title');
  const title = titleBlock !== undefined ? textContent(titleBlock) : '';

  const journalIds = readAllBlocksWithAttributes(xml, 'journal-id');
  const isoAbbrevEntry = journalIds.find(
    (entry) => entry.attributes['journal-id-type'] === 'iso-abbrev',
  );
  const isoAbbrev = isoAbbrevEntry ? textContent(isoAbbrevEntry.content) : undefined;

  const publisherXml = readBlock(xml, 'publisher');
  const publisherNameBlock = publisherXml ? readBlock(publisherXml, 'publisher-name') : undefined;
  const publisher = publisherNameBlock !== undefined ? textContent(publisherNameBlock) : undefined;

  const issn = readTag(xml, 'issn');

  return {
    title,
    ...(isoAbbrev !== undefined ? { isoAbbrev } : {}),
    ...(publisher !== undefined ? { publisher } : {}),
    ...(issn !== undefined ? { issn } : {}),
  };
}

function parseArticleMeta(xml: string): ArticleMeta {
  const titleGroupXml = readBlock(xml, 'title-group') ?? xml;
  const articleTitleXml = readBlock(titleGroupXml, 'article-title') ?? '';
  const title = textContent(articleTitleXml);

  const contribGroupXml = readBlock(xml, 'contrib-group') ?? '';
  const authors = parseAuthors(contribGroupXml);

  const abstractXml = readBlock(xml, 'abstract');
  const abstract = abstractXml ? textContent(abstractXml) : undefined;

  const articleIds = readAllBlocksWithAttributes(xml, 'article-id');
  const doi = findArticleId(articleIds, 'doi');
  const pmid = findArticleId(articleIds, 'pmid');
  const pmcid = findArticleId(articleIds, 'pmc');

  const publicationDate = parsePublicationDate(xml);
  const keywords = parseKeywords(xml);

  return {
    title,
    authors,
    ...(abstract !== undefined ? { abstract } : {}),
    ...(keywords.length > 0 ? { keywords } : {}),
    ...(doi !== undefined ? { doi } : {}),
    ...(pmid !== undefined ? { pmid } : {}),
    ...(pmcid !== undefined ? { pmcid } : {}),
    ...(publicationDate !== undefined ? { publicationDate } : {}),
  };
}

function findArticleId(
  articleIds: ReadonlyArray<{ content: string; attributes: Readonly<Record<string, string>> }>,
  pubIdType: string,
): string | undefined {
  const entry = articleIds.find((a) => a.attributes['pub-id-type'] === pubIdType);
  return entry ? textContent(entry.content) : undefined;
}

function parseAuthors(contribGroupXml: string): ReadonlyArray<Author> {
  const contribs = readAllBlocksWithAttributes(contribGroupXml, 'contrib');
  return contribs
    .filter((c) => c.attributes['contrib-type'] === 'author' || !c.attributes['contrib-type'])
    .map((contrib) => {
      const collectiveName = readTag(contrib.content, 'collab');
      if (collectiveName) {
        return { collectiveName, affiliations: [] };
      }

      const nameXml = readBlock(contrib.content, 'name') ?? '';
      const lastName = readTag(nameXml, 'surname');
      const foreName = readTag(nameXml, 'given-names');

      const affBlocks = readAllBlocks(contrib.content, 'aff');
      const affiliations = affBlocks.map((aff) => textContent(aff));

      const contribIds = readAllBlocksWithAttributes(contrib.content, 'contrib-id');
      const orcidEntry = contribIds.find(
        (entry) => entry.attributes['contrib-id-type'] === 'orcid',
      );
      const orcid = orcidEntry ? textContent(orcidEntry.content) : undefined;

      return {
        ...(lastName !== undefined ? { lastName } : {}),
        ...(foreName !== undefined ? { foreName } : {}),
        ...(orcid !== undefined ? { orcid } : {}),
        affiliations,
      };
    });
}

function parsePublicationDate(articleMetaXml: string): PartialDate | undefined {
  const pubDates = readAllBlocksWithAttributes(articleMetaXml, 'pub-date');
  if (pubDates.length === 0) {
    return undefined;
  }

  const selectedPubDate = selectPreferredPubDate(pubDates);
  const yearStr = readTag(selectedPubDate.content, 'year');
  if (!yearStr) {
    return undefined;
  }

  const year = parseInt(yearStr, 10);
  const monthStr = readTag(selectedPubDate.content, 'month');
  const dayStr = readTag(selectedPubDate.content, 'day');

  const month = monthStr ? parseInt(monthStr, 10) : undefined;
  const day = dayStr ? parseInt(dayStr, 10) : undefined;

  return {
    year,
    ...(month !== undefined ? { month } : {}),
    ...(day !== undefined ? { day } : {}),
  };
}

function selectPreferredPubDate(
  pubDates: ReadonlyArray<{ content: string; attributes: Readonly<Record<string, string>> }>,
): { content: string; attributes: Readonly<Record<string, string>> } {
  const epub =
    pubDates.find((pd) => pd.attributes['pub-type'] === 'epub') ??
    pubDates.find((pd) => pd.attributes['date-type'] === 'pub') ??
    pubDates.find((pd) => pd.attributes['pub-type'] === 'ppub');
  const firstPubDate = pubDates[0];
  return epub ?? firstPubDate ?? { content: '', attributes: {} };
}

function parseKeywords(articleMetaXml: string): ReadonlyArray<string> {
  const kwdGroupXml = readBlock(articleMetaXml, 'kwd-group');
  if (!kwdGroupXml) {
    return [];
  }

  return readAllBlocks(kwdGroupXml, 'kwd').map((kwd) => textContent(kwd));
}

function parseBody(articleXml: string): ReadonlyArray<Section> {
  const bodyXml = readBlock(articleXml, 'body');
  if (!bodyXml) return [];
  return parseSections(bodyXml, 1);
}

function parseSections(xml: string, depth: number): ReadonlyArray<Section> {
  const secBlocks = readAllBlocks(xml, 'sec');
  return secBlocks.map((secContent) => {
    const title = readTag(secContent, 'title') ?? '';
    const subsections = parseSections(secContent, depth + 1);

    const directContent = removeAllBlocks(secContent, 'sec');
    const paragraphs = readAllBlocks(directContent, 'p').map((p) => textContent(p));
    const tables = parseTables(directContent);
    const figures = parseFigures(directContent);

    return { title, depth, paragraphs, tables, figures, subsections };
  });
}

function parseTables(xml: string): ReadonlyArray<Table> {
  const tableWraps = readAllBlocks(xml, 'table-wrap');
  return tableWraps.map((wrapContent) => {
    const captionXml = readBlock(wrapContent, 'caption');
    const caption = captionXml ? textContent(captionXml) : '';

    const tableXml = readBlock(wrapContent, 'table') ?? '';
    const theadXml = readBlock(tableXml, 'thead') ?? '';
    const tbodyXml = readBlock(tableXml, 'tbody') ?? tableXml;

    const headerRows = readAllBlocks(theadXml, 'tr');
    const headers = headerRows.length > 0 ? parseCells(headerRows[0] ?? '', 'th') : [];

    const dataRows = readAllBlocks(tbodyXml, 'tr');
    const rows = dataRows.map((trXml) => parseCells(trXml, 'td'));

    return { caption, headers, rows };
  });
}

function parseCells(trXml: string, cellTag: string): ReadonlyArray<string> {
  const cells = readAllBlocksWithAttributes(trXml, cellTag);
  const result: Array<string> = [];

  for (const cell of cells) {
    const text = textContent(cell.content);
    result.push(text);

    const colspanStr = cell.attributes['colspan'];
    if (colspanStr) {
      const colspan = parseInt(colspanStr, 10);
      for (let i = 1; i < colspan; i++) {
        result.push('');
      }
    }
  }

  return result;
}

function parseFigures(xml: string): ReadonlyArray<Figure> {
  const figs = readAllBlocksWithAttributes(xml, 'fig');
  return figs.map((fig) => {
    const id = fig.attributes['id'] ?? '';
    const label = readTag(fig.content, 'label') ?? '';
    const captionXml = readBlock(fig.content, 'caption');
    const caption = captionXml ? textContent(captionXml) : '';
    return { id, label, caption };
  });
}

function parseBack(articleXml: string): Back {
  const backXml = readBlock(articleXml, 'back') ?? '';

  const refListXml = readBlock(backXml, 'ref-list') ?? '';
  const references = parseReferences(refListXml);

  const ackXml = readBlock(backXml, 'ack');
  const acknowledgements = ackXml ? textContent(ackXml) : undefined;

  const appGroupXml = readBlock(backXml, 'app-group');
  const appendices = appGroupXml
    ? readAllBlocks(appGroupXml, 'app').map((appXml) => {
        const title = readTag(appXml, 'title') ?? '';
        const paragraphs = readAllBlocks(appXml, 'p').map((p) => textContent(p));
        return {
          title,
          depth: 1,
          paragraphs,
          tables: [],
          figures: [],
          subsections: [],
        };
      })
    : undefined;

  return {
    references,
    ...(acknowledgements !== undefined ? { acknowledgements } : {}),
    ...(appendices !== undefined ? { appendices } : {}),
  };
}

function parseReferences(refListXml: string): ReadonlyArray<Reference> {
  const refs = readAllBlocksWithAttributes(refListXml, 'ref');
  return refs.map((ref) => {
    const id = ref.attributes['id'] ?? '';
    const label = readTag(ref.content, 'label');

    const citationXml =
      readBlock(ref.content, 'element-citation') ??
      readBlock(ref.content, 'mixed-citation') ??
      ref.content;

    const personGroupXml = readBlock(citationXml, 'person-group') ?? citationXml;
    const names = readAllBlocks(personGroupXml, 'name');
    const authors = names.map((nameXml) => {
      const surname = readTag(nameXml, 'surname') ?? '';
      const givenNames = readTag(nameXml, 'given-names');
      return givenNames ? `${surname} ${givenNames}` : surname;
    });

    const articleTitleBlock = readBlock(citationXml, 'article-title');
    const title = articleTitleBlock !== undefined ? textContent(articleTitleBlock) : '';
    const sourceBlock = readBlock(citationXml, 'source');
    const source = sourceBlock !== undefined ? textContent(sourceBlock) : '';
    const yearStr = readTag(citationXml, 'year');
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const volume = readTag(citationXml, 'volume');

    const fpage = readTag(citationXml, 'fpage');
    const lpage = readTag(citationXml, 'lpage');
    const pages = fpage && lpage ? `${fpage}-${lpage}` : fpage;

    const pubIds = readAllBlocksWithAttributes(citationXml, 'pub-id');
    const doi = pubIds.find((p) => p.attributes['pub-id-type'] === 'doi');
    const pmid = pubIds.find((p) => p.attributes['pub-id-type'] === 'pmid');

    return {
      id,
      ...(label !== undefined ? { label } : {}),
      authors,
      title,
      source,
      ...(year !== undefined ? { year } : {}),
      ...(volume !== undefined ? { volume } : {}),
      ...(pages !== undefined ? { pages } : {}),
      ...(doi ? { doi: textContent(doi.content) } : {}),
      ...(pmid ? { pmid: textContent(pmid.content) } : {}),
    };
  });
}

function textContent(xml: string): string {
  return decodeEntities(xml.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}
