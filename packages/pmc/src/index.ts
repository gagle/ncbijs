export type {
  Chunk,
  ChunkOptions,
  FullTextArticle,
  OAIListOptions,
  OAIRecord,
  OAListOptions,
  OALookupOptions,
  OARecord,
  PMCConfig,
} from './interfaces/pmc.interface';
export { PMCHttpError } from './pmc-client';
export { PMC, pmcToChunks, pmcToMarkdown, pmcToPlainText } from './pmc';
