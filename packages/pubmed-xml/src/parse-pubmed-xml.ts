import type { PubmedArticle } from './interfaces/pubmed-article.interface';
import {
  extractAbstract,
  extractArticleIds,
  extractAuthors,
  extractCommentsCorrections,
  extractDataBanks,
  extractGrants,
  extractJournal,
  extractKeywords,
  extractMeshHeadings,
  extractPublicationDate,
  extractPublicationTypes,
  parseDateBlock,
} from './article-field-parsers';
import { decodeEntities, readAllBlocks, readBlock, readTag, stripTags } from '@ncbijs/xml';

/** Parse PubMed XML (PubmedArticleSet format) into structured article records. */
export function parsePubmedXml(xml: string): ReadonlyArray<PubmedArticle> {
  const articleBlocks = readAllBlocks(xml, 'PubmedArticle');
  if (articleBlocks.length === 0) {
    return [];
  }

  return articleBlocks.map(parseSingleArticle);
}

function parseSingleArticle(articleBlockXml: string): PubmedArticle {
  const citationXml = readBlock(articleBlockXml, 'MedlineCitation');
  if (!citationXml) {
    throw new Error('PubmedArticle is missing MedlineCitation');
  }

  const articleXml = readBlock(citationXml, 'Article');
  if (!articleXml) {
    throw new Error('MedlineCitation is missing Article');
  }

  const pubmedDataXml = readBlock(articleBlockXml, 'PubmedData') ?? '';

  const pmid = readTag(citationXml, 'PMID') ?? '';
  const titleBlock = readBlock(articleXml, 'ArticleTitle');
  const title = titleBlock !== undefined ? stripTags(decodeEntities(titleBlock)) : '';
  const vernacularTitle = readTag(articleXml, 'VernacularTitle');
  const language = readTag(articleXml, 'Language') ?? '';

  const dateRevisedBlock = readBlock(citationXml, 'DateRevised');
  const dateCompletedBlock = readBlock(citationXml, 'DateCompleted');

  return {
    pmid,
    title,
    ...(vernacularTitle !== undefined ? { vernacularTitle } : {}),
    abstract: extractAbstract(articleXml),
    authors: extractAuthors(articleXml),
    journal: extractJournal(articleXml),
    publicationDate: extractPublicationDate(articleXml),
    mesh: extractMeshHeadings(citationXml),
    articleIds: extractArticleIds(pubmedDataXml, pmid, articleXml),
    publicationTypes: extractPublicationTypes(articleXml),
    grants: extractGrants(articleXml),
    keywords: extractKeywords(citationXml),
    commentsCorrections: extractCommentsCorrections(citationXml),
    dataBanks: extractDataBanks(articleXml),
    language,
    ...(dateRevisedBlock !== undefined ? { dateRevised: parseDateBlock(dateRevisedBlock) } : {}),
    ...(dateCompletedBlock !== undefined
      ? { dateCompleted: parseDateBlock(dateCompletedBlock) }
      : {}),
  };
}
