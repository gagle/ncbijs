/** BLAST program type for sequence alignment (per NCBI Common URL API). */
export type BlastProgram = 'blastn' | 'blastp' | 'blastx' | 'tblastn' | 'tblastx';

/** Status of a BLAST search job on the server. */
export type BlastStatus = 'failed' | 'ready' | 'unknown' | 'waiting';

/** Configuration for the BLAST client. */
export interface BlastConfig {
  readonly maxRetries?: number;
}

/** Optional parameters for a BLAST job submission. */
export interface BlastSubmitOptions {
  readonly compositionBasedStatistics?: 0 | 1 | 2 | 3;
  readonly entrezQuery?: string;
  readonly expect?: number;
  readonly gapExtend?: number;
  readonly gapOpen?: number;
  readonly hitListSize?: number;
  readonly matrix?: string;
  /** Enable megablast mode (only valid with program `blastn`). Sends `MEGABLAST=on`. */
  readonly megablast?: boolean;
  readonly numIterations?: number;
  readonly seg?: boolean;
  readonly softMasking?: boolean;
  readonly threshold?: number;
  readonly wordSize?: number;
}

/** Result of a BLAST job submission containing the request ID. */
export interface BlastSubmitResult {
  readonly rid: string;
  readonly estimatedSeconds: number;
}

/** Result of polling a BLAST search job for its current status. */
export interface BlastPollResult {
  readonly status: BlastStatus;
}

/** Options for a full BLAST search including submission and polling parameters. */
export interface BlastSearchOptions extends BlastSubmitOptions {
  readonly maxPollAttempts?: number;
  readonly pollIntervalMs?: number;
}

/** High-scoring segment pair from a BLAST alignment. */
export interface BlastHsp {
  readonly alignLen: number;
  readonly bitScore: number;
  readonly evalue: number;
  readonly gaps: number;
  readonly hitFrom: number;
  readonly hitTo: number;
  readonly hseq: string;
  readonly identity: number;
  readonly midline: string;
  readonly qseq: string;
  readonly queryFrom: number;
  readonly queryTo: number;
  readonly score: number;
}

/** A single BLAST hit with accession, title, and alignment segments. */
export interface BlastHit {
  readonly accession: string;
  readonly hsps: ReadonlyArray<BlastHsp>;
  readonly length: number;
  readonly title: string;
}

/** Complete BLAST search result containing all hits. */
export interface BlastResult {
  readonly hits: ReadonlyArray<BlastHit>;
}
