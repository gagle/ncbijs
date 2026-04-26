import { TokenBucket, HttpRetryError, fetchWithRetry } from '@ncbijs/rate-limiter';
import type {
  BlastConfig,
  BlastHit,
  BlastHsp,
  BlastPollResult,
  BlastProgram,
  BlastResult,
  BlastSearchOptions,
  BlastSubmitOptions,
  BlastSubmitResult,
} from './interfaces/blast.interface';
import { parsePollResponse, parseSubmitResponse } from './parse-qblast-info';

const BLAST_BASE_URL = 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;

interface RawJson2Response {
  readonly BlastOutput2?: ReadonlyArray<RawBlastOutput2Entry>;
}

interface RawBlastOutput2Entry {
  readonly report?: RawReport;
}

interface RawReport {
  readonly results?: RawResults;
}

interface RawResults {
  readonly search?: RawSearch;
}

interface RawSearch {
  readonly hits?: ReadonlyArray<RawHit>;
}

interface RawHit {
  readonly description?: ReadonlyArray<RawHitDescription>;
  readonly hsps?: ReadonlyArray<RawHsp>;
  readonly len?: number;
}

interface RawHitDescription {
  readonly accession?: string;
  readonly title?: string;
}

interface RawHsp {
  readonly align_len?: number;
  readonly bit_score?: number;
  readonly evalue?: number;
  readonly gaps?: number;
  readonly hit_from?: number;
  readonly hit_to?: number;
  readonly hseq?: string;
  readonly identity?: number;
  readonly midline?: string;
  readonly qseq?: string;
  readonly query_from?: number;
  readonly query_to?: number;
  readonly score?: number;
}

/** HTTP error thrown when the BLAST API returns a non-OK status. */
export class BlastHttpError extends HttpRetryError {
  constructor(status: number, body: string) {
    super(status, body, `BLAST API returned status ${status}`);
    this.name = 'BlastHttpError';
  }
}

/** Error thrown when a BLAST search fails on the server. */
export class BlastSearchError extends Error {
  public readonly rid: string;

  constructor(rid: string) {
    super(`BLAST search failed for RID ${rid}`);
    this.name = 'BlastSearchError';
    this.rid = rid;
  }
}

/** Error thrown when a BLAST search exceeds the maximum number of poll attempts. */
export class BlastTimeoutError extends Error {
  public readonly rid: string;
  public readonly attempts: number;

  constructor(rid: string, attempts: number) {
    super(`BLAST search timed out after ${attempts} poll attempts for RID ${rid}`);
    this.name = 'BlastTimeoutError';
    this.rid = rid;
    this.attempts = attempts;
  }
}

/** NCBI BLAST sequence alignment client with submit, poll, and retrieve lifecycle. */
export class Blast {
  private readonly _maxRetries: number;
  private readonly _submitLimiter: TokenBucket;
  private readonly _pollLimiter: TokenBucket;

  constructor(config?: BlastConfig) {
    this._maxRetries = config?.maxRetries ?? DEFAULT_MAX_RETRIES;
    this._submitLimiter = new TokenBucket({ requestsPerSecond: 0.1 });
    this._pollLimiter = new TokenBucket({ requestsPerSecond: 1 / 60 });
  }

  /** Submit a BLAST search job and return the request ID and estimated time. */
  public async submit(
    query: string,
    program: BlastProgram,
    database: string,
    options?: BlastSubmitOptions,
  ): Promise<BlastSubmitResult> {
    const body = new URLSearchParams();
    body.set('CMD', 'Put');
    body.set('PROGRAM', program);
    body.set('DATABASE', database);
    body.set('QUERY', query);

    if (options?.entrezQuery !== undefined) {
      body.set('ENTREZ_QUERY', options.entrezQuery);
    }

    if (options?.expect !== undefined) {
      body.set('EXPECT', String(options.expect));
    }

    if (options?.hitListSize !== undefined) {
      body.set('HITLIST_SIZE', String(options.hitListSize));
    }

    if (options?.matrix !== undefined) {
      body.set('MATRIX', options.matrix);
    }

    if (options?.wordSize !== undefined) {
      body.set('WORD_SIZE', String(options.wordSize));
    }

    if (options?.compositionBasedStatistics !== undefined) {
      body.set('COMPOSITION_BASED_STATISTICS', String(options.compositionBasedStatistics));
    }

    if (options?.seg !== undefined) {
      body.set('FILTER', options.seg ? 'L' : '');
    }

    if (options?.softMasking !== undefined) {
      body.set('SOFT_MASKING', String(options.softMasking));
    }

    if (options?.gapOpen !== undefined && options?.gapExtend !== undefined) {
      body.set('GAPCOSTS', `${options.gapOpen} ${options.gapExtend}`);
    }

    if (options?.threshold !== undefined) {
      body.set('THRESHOLD', String(options.threshold));
    }

    if (options?.megablast !== undefined) {
      body.set('MEGABLAST', options.megablast ? 'on' : 'off');
    }

    if (options?.numIterations !== undefined) {
      body.set('NUM_ITERATIONS', String(options.numIterations));
    }

    const responseText = await this._fetchText(BLAST_BASE_URL, this._submitLimiter, {
      method: 'POST',
      body: body.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return parseSubmitResponse(responseText);
  }

  /** Check the status of a submitted BLAST search by request ID. */
  public async poll(rid: string): Promise<BlastPollResult> {
    const url = `${BLAST_BASE_URL}?CMD=Get&RID=${encodeURIComponent(rid)}&FORMAT_OBJECT=SearchInfo`;

    const responseText = await this._fetchText(url, this._pollLimiter);

    return parsePollResponse(responseText);
  }

  /** Retrieve the results of a completed BLAST search by request ID. */
  public async retrieve(rid: string): Promise<BlastResult> {
    const url = `${BLAST_BASE_URL}?CMD=Get&RID=${encodeURIComponent(rid)}&FORMAT_TYPE=JSON2`;

    const responseText = await this._fetchText(url, this._pollLimiter);
    const rawResponse = JSON.parse(responseText) as RawJson2Response;

    return mapBlastResult(rawResponse);
  }

  /** Submit a BLAST search and poll until results are ready, then return them. */
  public async search(
    query: string,
    program: BlastProgram,
    database: string,
    options?: BlastSearchOptions,
  ): Promise<BlastResult> {
    const submitResult = await this.submit(query, program, database, options);
    const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    const maxPollAttempts = options?.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      await delay(pollIntervalMs);

      const pollResult = await this.poll(submitResult.rid);

      if (pollResult.status === 'ready') {
        return this.retrieve(submitResult.rid);
      }

      if (pollResult.status === 'failed' || pollResult.status === 'unknown') {
        throw new BlastSearchError(submitResult.rid);
      }
    }

    throw new BlastTimeoutError(submitResult.rid, maxPollAttempts);
  }

  private async _fetchText(
    url: string,
    rateLimiter: TokenBucket,
    request?: RequestInit,
  ): Promise<string> {
    const response = await fetchWithRetry(
      url,
      { maxRetries: this._maxRetries, rateLimiter },
      {
        ...(request !== undefined && { request }),
        createError: (status, responseBody) => new BlastHttpError(status, responseBody),
      },
    );

    return response.text();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapBlastResult(raw: RawJson2Response): BlastResult {
  const entries = raw.BlastOutput2 ?? [];
  const firstEntry = entries[0];
  const rawHits = firstEntry?.report?.results?.search?.hits ?? [];

  return { hits: rawHits.map(mapHit) };
}

function mapHit(raw: RawHit): BlastHit {
  const firstDescription = raw.description?.[0];

  return {
    accession: firstDescription?.accession ?? '',
    title: firstDescription?.title ?? '',
    length: raw.len ?? 0,
    hsps: (raw.hsps ?? []).map(mapHsp),
  };
}

function mapHsp(raw: RawHsp): BlastHsp {
  return {
    bitScore: raw.bit_score ?? 0,
    score: raw.score ?? 0,
    evalue: raw.evalue ?? 0,
    queryFrom: raw.query_from ?? 0,
    queryTo: raw.query_to ?? 0,
    hitFrom: raw.hit_from ?? 0,
    hitTo: raw.hit_to ?? 0,
    identity: raw.identity ?? 0,
    gaps: raw.gaps ?? 0,
    alignLen: raw.align_len ?? 0,
    qseq: raw.qseq ?? '',
    hseq: raw.hseq ?? '',
    midline: raw.midline ?? '',
  };
}
