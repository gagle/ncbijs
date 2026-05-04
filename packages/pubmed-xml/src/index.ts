export type {
  AbstractContent,
  AbstractSection,
  ArticleIds,
  Author,
  CommentCorrection,
  DataBank,
  Grant,
  JournalInfo,
  Keyword,
  MeshHeading,
  MeshQualifier,
  PartialDate,
  PubmedArticle,
} from './interfaces/pubmed-article.interface';

export { parsePubmedXml } from './parse-pubmed-xml';
export { createPubmedXmlStream } from './parse-pubmed-xml-stream';
export { parseMedlineText } from './parse-medline-text';
