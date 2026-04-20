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
} from './interfaces/jats.interface.js';

export { parseJATS } from './parse-jats.js';
export { toMarkdown } from './to-markdown.js';
export { toPlainText } from './to-plain-text.js';
export { toChunks } from './to-chunks.js';
