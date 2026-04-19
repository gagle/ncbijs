import type { Back, Chunk, ChunkOptions, Front, Section } from '@ncbijs/jats';

export interface FullTextArticle {
  readonly pmcid: string;
  readonly front: Readonly<Front>;
  readonly body: ReadonlyArray<Readonly<Section>>;
  readonly back: Readonly<Back>;
  readonly license: string;
}

export type { Chunk, ChunkOptions };

export interface OALink {
  readonly format: 'tgz' | 'pdf';
  readonly href: string;
  readonly updated: string;
}

export interface OARecord {
  readonly pmcid: string;
  readonly citation: string;
  readonly license: string;
  readonly retracted: boolean;
  readonly links: ReadonlyArray<Readonly<OALink>>;
}

export interface OAListOptions {
  readonly until?: string | undefined;
  readonly format?: 'tgz' | 'pdf' | undefined;
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
