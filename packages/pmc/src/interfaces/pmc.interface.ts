import type { Back, Chunk, ChunkOptions, Front, Section } from '@ncbijs/jats';

/** Full-text PMC article with JATS-parsed front matter, body, back matter, and license. */
export interface FullTextArticle {
  readonly pmcid: string;
  readonly front: Readonly<Front>;
  readonly body: ReadonlyArray<Readonly<Section>>;
  readonly back: Readonly<Back>;
  readonly license: string;
}

export type { Chunk, ChunkOptions };

/** Open Access record metadata from the PMC OA Service. */
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
  readonly pdfUrl?: string;
  readonly mediaUrls?: ReadonlyArray<string>;
}

/** Options for looking up a specific OA record version. */
export interface OALookupOptions {
  readonly version?: number;
}

/** Options for listing OA records updated since a given date. */
export interface OAListOptions {
  readonly until?: string;
}

/** OAI-PMH harvested record with header metadata and XML payload. */
export interface OAIRecord {
  readonly identifier: string;
  readonly datestamp: string;
  readonly setSpec: string;
  readonly metadata: string;
}

/** Options for OAI-PMH ListRecords harvesting. */
export interface OAIListOptions {
  readonly from?: string;
  readonly until?: string;
  readonly set?: string;
  readonly metadataPrefix?: string;
}

/** Configuration for the PMC client. */
export interface PMCConfig {
  readonly apiKey?: string;
  readonly tool: string;
  readonly email: string;
  readonly maxRetries?: number;
}

/** A record from the PMC Open Access S3 inventory CSV. */
export interface PmcS3Record {
  readonly bucket: string;
  readonly key: string;
  readonly sizeBytes: number;
  readonly lastModified: string;
  readonly eTag: string;
  readonly storageClass: string;
  readonly pmcid: string;
  readonly version: string;
  readonly format: string;
}
