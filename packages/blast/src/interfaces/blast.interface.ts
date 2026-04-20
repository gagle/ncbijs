export type BlastProgram = 'blastn' | 'blastp' | 'blastx' | 'megablast' | 'tblastn' | 'tblastx';

export type BlastStatus = 'failed' | 'ready' | 'unknown' | 'waiting';

export interface BlastConfig {
  readonly maxRetries?: number;
}

export interface BlastSubmitOptions {
  readonly entrezQuery?: string;
  readonly expect?: number;
  readonly hitListSize?: number;
  readonly matrix?: string;
  readonly wordSize?: number;
}

export interface BlastSubmitResult {
  readonly rid: string;
  readonly estimatedSeconds: number;
}

export interface BlastPollResult {
  readonly status: BlastStatus;
}

export interface BlastSearchOptions extends BlastSubmitOptions {
  readonly maxPollAttempts?: number;
  readonly pollIntervalMs?: number;
}

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

export interface BlastHit {
  readonly accession: string;
  readonly hsps: ReadonlyArray<BlastHsp>;
  readonly length: number;
  readonly title: string;
}

export interface BlastResult {
  readonly hits: ReadonlyArray<BlastHit>;
}
