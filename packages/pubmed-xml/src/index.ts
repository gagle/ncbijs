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
} from './interfaces/pubmed-article.interface.js';

export { parsePubmedXml } from './parse-pubmed-xml.js';
export { createPubmedXmlStream } from './parse-pubmed-xml-stream.js';
export { parseMedlineText } from './parse-medline-text.js';
