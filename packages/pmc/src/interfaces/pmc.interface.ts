import type { Back, Chunk, ChunkOptions, Front, Section } from '@ncbijs/jats';

export interface FullTextArticle {
  readonly pmcid: string;
  readonly front: Readonly<Front>;
  readonly body: ReadonlyArray<Readonly<Section>>;
  readonly back: Readonly<Back>;
  readonly license: string;
}

export type { Chunk, ChunkOptions };

export interface OARecord {
  readonly pmcid: string;
  readonly version: number;
  readonly pmid: number | undefined;
  readonly doi: string | undefined;
  readonly mid: string | undefined;
  readonly title: string;
  readonly citation: string;
  readonly openAccess: boolean;
  readonly manuscript: boolean;
  readonly historicalOcr: boolean;
  readonly retracted: boolean;
  readonly license: string | undefined;
  readonly xmlUrl: string;
  readonly textUrl: string;
  readonly pdfUrl?: string | undefined;
  readonly mediaUrls?: ReadonlyArray<string> | undefined;
}

export interface OALookupOptions {
  readonly version?: number | undefined;
}

export interface OAListOptions {
  readonly until?: string | undefined;
}

export interface OAIRecord {
  readonly identifier: string;
  readonly datestamp: string;
  readonly setSpec: string;
  readonly metadata: string;
}

export interface OAIListOptions {
  readonly from?: string | undefined;
  readonly until?: string | undefined;
  readonly set?: string | undefined;
  readonly metadataPrefix?: string | undefined;
}

export interface PMCConfig {
  readonly apiKey?: string | undefined;
  readonly tool: string;
  readonly email: string;
  readonly maxRetries?: number | undefined;
}
