export type {
  ArticleMeta,
  Author,
  Back,
  Chunk,
  ChunkOptions,
  Figure,
  Front,
  JATSArticle,
  JournalMeta,
  PartialDate,
  Reference,
  Section,
  Table,
} from './interfaces/jats.interface';

export { parseJATS } from './parse-jats';
export { toMarkdown } from './to-markdown';
export { toPlainText } from './to-plain-text';
export { toChunks } from './to-chunks';
