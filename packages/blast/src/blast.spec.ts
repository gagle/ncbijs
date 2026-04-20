import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ncbijs/rate-limiter', async (importOriginal) => {
  const original = await importOriginal<typeof import('@ncbijs/rate-limiter')>();
  class MockTokenBucket {
    public async acquire(): Promise<void> {
      // noop
    }
  }
  return { ...original, TokenBucket: MockTokenBucket };
});

import { Blast, BlastHttpError, BlastSearchError, BlastTimeoutError } from './blast';

const SUBMIT_RESPONSE = [
  '<!--QBlastInfoBegin',
  '    RID = TEST123',
  '    RTOE = 10',
  'QBlastInfoEnd-->',
].join('\n');

const POLL_WAITING_RESPONSE = '    Status=WAITING';
const POLL_READY_RESPONSE = '    Status=READY';
const POLL_FAILED_RESPONSE = '    Status=FAILED';
const POLL_UNKNOWN_RESPONSE = '    Status=UNKNOWN';

function buildJson2Response(
  hits: ReadonlyArray<Record<string, unknown>> = [],
): Record<string, unknown> {
  return {
    BlastOutput2: [
      {
        report: {
          results: {
            search: { hits },
          },
        },
      },
    ],
  };
}

function buildRawHit(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    description: [{ accession: 'NM_007294.4', title: 'Homo sapiens BRCA1' }],
    len: 5592,
    hsps: [
      {
        bit_score: 100.5,
        score: 250,
        evalue: 1e-25,
        query_from: 1,
        query_to: 100,
        hit_from: 50,
        hit_to: 150,
        identity: 95,
        gaps: 2,
        align_len: 102,
        qseq: 'ATCGATCG',
        hseq: 'ATCGATCG',
        midline: '||||||||',
      },
    ],
    ...overrides,
  };
}

function mockFetchText(text: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(text),
    }),
  );
}

function mockFetchSequence(
  ...responses: ReadonlyArray<{
    readonly text: string;
    readonly ok?: boolean;
    readonly status?: number;
  }>
): void {
  const mockFn = vi.fn();

  for (const response of responses) {
    const ok = response.ok ?? true;
    const status = response.status ?? 200;
    mockFn.mockResolvedValueOnce({
      ok,
      status,
      text: () => Promise.resolve(response.text),
    });
  }

  vi.stubGlobal('fetch', mockFn);
}

async function drainTimers(): Promise<void> {
  await vi.runAllTimersAsync();
}

describe('Blast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('submit', () => {
    it('should submit a BLAST search and return RID and estimated time', async () => {
      mockFetchText(SUBMIT_RESPONSE);
      const blast = new Blast();

      const submitResult = await blast.submit('ATCGATCG', 'blastn', 'nt');

      expect(submitResult.rid).toBe('TEST123');
      expect(submitResult.estimatedSeconds).toBe(10);
    });

    it('should send form-encoded POST body with correct parameters', async () => {
      mockFetchText(SUBMIT_RESPONSE);
      const blast = new Blast();

      await blast.submit('ATCGATCG', 'blastp', 'nr');

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      expect(fetchCall[1]?.method).toBe('POST');

      const sentBody = new URLSearchParams(fetchCall[1]?.body as string);
      expect(sentBody.get('CMD')).toBe('Put');
      expect(sentBody.get('PROGRAM')).toBe('blastp');
      expect(sentBody.get('DATABASE')).toBe('nr');
      expect(sentBody.get('QUERY')).toBe('ATCGATCG');
    });

    it('should include optional parameters when provided', async () => {
      mockFetchText(SUBMIT_RESPONSE);
      const blast = new Blast();

      await blast.submit('ATCGATCG', 'blastn', 'nt', {
        entrezQuery: 'human[organism]',
        expect: 0.001,
        hitListSize: 50,
        matrix: 'BLOSUM62',
        wordSize: 11,
      });

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const sentBody = new URLSearchParams(fetchCall[1]?.body as string);
      expect(sentBody.get('ENTREZ_QUERY')).toBe('human[organism]');
      expect(sentBody.get('EXPECT')).toBe('0.001');
      expect(sentBody.get('HITLIST_SIZE')).toBe('50');
      expect(sentBody.get('MATRIX')).toBe('BLOSUM62');
      expect(sentBody.get('WORD_SIZE')).toBe('11');
    });

    it('should not include optional parameters when not provided', async () => {
      mockFetchText(SUBMIT_RESPONSE);
      const blast = new Blast();

      await blast.submit('ATCGATCG', 'blastn', 'nt');

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const sentBody = new URLSearchParams(fetchCall[1]?.body as string);
      expect(sentBody.has('ENTREZ_QUERY')).toBe(false);
      expect(sentBody.has('EXPECT')).toBe(false);
      expect(sentBody.has('HITLIST_SIZE')).toBe(false);
      expect(sentBody.has('MATRIX')).toBe(false);
      expect(sentBody.has('WORD_SIZE')).toBe(false);
    });

    it('should set Content-Type header for form-encoded body', async () => {
      mockFetchText(SUBMIT_RESPONSE);
      const blast = new Blast();

      await blast.submit('ATCGATCG', 'blastn', 'nt');

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });
  });

  describe('poll', () => {
    it('should poll for status and return waiting', async () => {
      mockFetchText(POLL_WAITING_RESPONSE);
      const blast = new Blast();

      const pollResult = await blast.poll('TEST123');

      expect(pollResult.status).toBe('waiting');
    });

    it('should poll for status and return ready', async () => {
      mockFetchText(POLL_READY_RESPONSE);
      const blast = new Blast();

      const pollResult = await blast.poll('TEST123');

      expect(pollResult.status).toBe('ready');
    });

    it('should build correct poll URL with RID', async () => {
      mockFetchText(POLL_READY_RESPONSE);
      const blast = new Blast();

      await blast.poll('MY_RID_123');

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const url = fetchCall[0] as string;
      expect(url).toContain('CMD=Get');
      expect(url).toContain('RID=MY_RID_123');
      expect(url).toContain('FORMAT_OBJECT=SearchInfo');
    });
  });

  describe('retrieve', () => {
    it('should retrieve and parse JSON2 results', async () => {
      const json2 = buildJson2Response([buildRawHit()]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toHaveLength(1);
      expect(blastResult.hits[0]!.accession).toBe('NM_007294.4');
      expect(blastResult.hits[0]!.title).toBe('Homo sapiens BRCA1');
      expect(blastResult.hits[0]!.length).toBe(5592);
    });

    it('should parse HSP fields correctly', async () => {
      const json2 = buildJson2Response([buildRawHit()]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');
      const hsp = blastResult.hits[0]!.hsps[0]!;

      expect(hsp.bitScore).toBe(100.5);
      expect(hsp.score).toBe(250);
      expect(hsp.evalue).toBe(1e-25);
      expect(hsp.queryFrom).toBe(1);
      expect(hsp.queryTo).toBe(100);
      expect(hsp.hitFrom).toBe(50);
      expect(hsp.hitTo).toBe(150);
      expect(hsp.identity).toBe(95);
      expect(hsp.gaps).toBe(2);
      expect(hsp.alignLen).toBe(102);
      expect(hsp.qseq).toBe('ATCGATCG');
      expect(hsp.hseq).toBe('ATCGATCG');
      expect(hsp.midline).toBe('||||||||');
    });

    it('should handle empty hits array', async () => {
      const json2 = buildJson2Response([]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toEqual([]);
    });

    it('should handle missing BlastOutput2 key', async () => {
      mockFetchText(JSON.stringify({}));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toEqual([]);
    });

    it('should handle empty BlastOutput2 array', async () => {
      mockFetchText(JSON.stringify({ BlastOutput2: [] }));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toEqual([]);
    });

    it('should handle missing report in BlastOutput2 entry', async () => {
      mockFetchText(JSON.stringify({ BlastOutput2: [{}] }));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toEqual([]);
    });

    it('should handle missing results in report', async () => {
      mockFetchText(JSON.stringify({ BlastOutput2: [{ report: {} }] }));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toEqual([]);
    });

    it('should handle missing search in results', async () => {
      mockFetchText(JSON.stringify({ BlastOutput2: [{ report: { results: {} } }] }));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits).toEqual([]);
    });

    it('should handle hit with missing description', async () => {
      const json2 = buildJson2Response([{ len: 100, hsps: [] }]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits[0]!.accession).toBe('');
      expect(blastResult.hits[0]!.title).toBe('');
    });

    it('should handle hit with empty description array', async () => {
      const json2 = buildJson2Response([{ description: [], len: 100, hsps: [] }]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits[0]!.accession).toBe('');
      expect(blastResult.hits[0]!.title).toBe('');
    });

    it('should handle hit with missing fields in description', async () => {
      const json2 = buildJson2Response([{ description: [{}], len: 100, hsps: [] }]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits[0]!.accession).toBe('');
      expect(blastResult.hits[0]!.title).toBe('');
    });

    it('should handle hit with missing len and hsps', async () => {
      const json2 = buildJson2Response([{ description: [{ accession: 'X' }] }]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');

      expect(blastResult.hits[0]!.length).toBe(0);
      expect(blastResult.hits[0]!.hsps).toEqual([]);
    });

    it('should handle HSP with missing fields', async () => {
      const json2 = buildJson2Response([
        { description: [{ accession: 'X' }], len: 100, hsps: [{}] },
      ]);
      mockFetchText(JSON.stringify(json2));
      const blast = new Blast();

      const blastResult = await blast.retrieve('TEST123');
      const hsp = blastResult.hits[0]!.hsps[0]!;

      expect(hsp.bitScore).toBe(0);
      expect(hsp.score).toBe(0);
      expect(hsp.evalue).toBe(0);
      expect(hsp.queryFrom).toBe(0);
      expect(hsp.queryTo).toBe(0);
      expect(hsp.hitFrom).toBe(0);
      expect(hsp.hitTo).toBe(0);
      expect(hsp.identity).toBe(0);
      expect(hsp.gaps).toBe(0);
      expect(hsp.alignLen).toBe(0);
      expect(hsp.qseq).toBe('');
      expect(hsp.hseq).toBe('');
      expect(hsp.midline).toBe('');
    });

    it('should build correct retrieve URL with RID', async () => {
      mockFetchText(JSON.stringify(buildJson2Response()));
      const blast = new Blast();

      await blast.retrieve('MY_RID_456');

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const url = fetchCall[0] as string;
      expect(url).toContain('CMD=Get');
      expect(url).toContain('RID=MY_RID_456');
      expect(url).toContain('FORMAT_TYPE=JSON2');
    });
  });

  describe('search', () => {
    it('should submit, poll until ready, then retrieve results', async () => {
      const json2 = buildJson2Response([buildRawHit()]);
      mockFetchSequence(
        { text: SUBMIT_RESPONSE },
        { text: POLL_WAITING_RESPONSE },
        { text: POLL_READY_RESPONSE },
        { text: JSON.stringify(json2) },
      );
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt', {
        pollIntervalMs: 1000,
      });

      await drainTimers();
      const blastResult = await searchPromise;

      expect(blastResult.hits).toHaveLength(1);
      expect(blastResult.hits[0]!.accession).toBe('NM_007294.4');
    });

    it('should throw BlastSearchError when status is failed', async () => {
      mockFetchSequence({ text: SUBMIT_RESPONSE }, { text: POLL_FAILED_RESPONSE });
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt', { pollIntervalMs: 1000 });
      const assertion = expect(searchPromise).rejects.toThrow(BlastSearchError);
      await drainTimers();
      await assertion;
    });

    it('should throw BlastSearchError when status is unknown', async () => {
      mockFetchSequence({ text: SUBMIT_RESPONSE }, { text: POLL_UNKNOWN_RESPONSE });
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt', { pollIntervalMs: 1000 });
      const assertion = expect(searchPromise).rejects.toThrow(BlastSearchError);
      await drainTimers();
      await assertion;
    });

    it('should include RID in BlastSearchError', async () => {
      mockFetchSequence({ text: SUBMIT_RESPONSE }, { text: POLL_FAILED_RESPONSE });
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt', { pollIntervalMs: 1000 });
      const assertion = searchPromise.then(
        () => expect.unreachable('Should have thrown'),
        (err: BlastSearchError) => {
          expect(err.rid).toBe('TEST123');
          expect(err.name).toBe('BlastSearchError');
        },
      );
      await drainTimers();
      await assertion;
    });

    it('should throw BlastTimeoutError after max poll attempts', async () => {
      mockFetchSequence(
        { text: SUBMIT_RESPONSE },
        { text: POLL_WAITING_RESPONSE },
        { text: POLL_WAITING_RESPONSE },
      );
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt', {
        pollIntervalMs: 1000,
        maxPollAttempts: 2,
      });

      const assertion = searchPromise.then(
        () => expect.unreachable('Should have thrown'),
        (err: BlastTimeoutError) => {
          expect(err).toBeInstanceOf(BlastTimeoutError);
          expect(err.rid).toBe('TEST123');
          expect(err.attempts).toBe(2);
          expect(err.name).toBe('BlastTimeoutError');
        },
      );
      await drainTimers();
      await assertion;
    });

    it('should pass submit options through to submit call', async () => {
      const json2 = buildJson2Response([]);
      mockFetchSequence(
        { text: SUBMIT_RESPONSE },
        { text: POLL_READY_RESPONSE },
        { text: JSON.stringify(json2) },
      );
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt', {
        pollIntervalMs: 1000,
        hitListSize: 10,
        expect: 0.01,
      });

      await drainTimers();
      await searchPromise;

      const submitCall = vi.mocked(fetch).mock.calls[0]!;
      const sentBody = new URLSearchParams(submitCall[1]?.body as string);
      expect(sentBody.get('HITLIST_SIZE')).toBe('10');
      expect(sentBody.get('EXPECT')).toBe('0.01');
    });

    it('should use default poll interval and max attempts when not specified', async () => {
      const json2 = buildJson2Response([buildRawHit()]);
      mockFetchSequence(
        { text: SUBMIT_RESPONSE },
        { text: POLL_READY_RESPONSE },
        { text: JSON.stringify(json2) },
      );
      const blast = new Blast();

      const searchPromise = blast.search('ATCGATCG', 'blastn', 'nt');

      await drainTimers();
      const blastResult = await searchPromise;

      expect(blastResult.hits).toHaveLength(1);
    });
  });

  describe('retry behavior', () => {
    it('should retry on 500 status and succeed', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, text: () => Promise.resolve('error') })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(SUBMIT_RESPONSE),
        });
      vi.stubGlobal('fetch', fetchMock);
      const blast = new Blast();

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      await drainTimers();
      const submitResult = await submitPromise;

      expect(submitResult.rid).toBe('TEST123');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 status', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429, text: () => Promise.resolve('') })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(SUBMIT_RESPONSE),
        });
      vi.stubGlobal('fetch', fetchMock);
      const blast = new Blast();

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      await drainTimers();
      const submitResult = await submitPromise;

      expect(submitResult.rid).toBe('TEST123');
    });

    it('should retry on 502 status', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 502, text: () => Promise.resolve('') })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(SUBMIT_RESPONSE),
        });
      vi.stubGlobal('fetch', fetchMock);
      const blast = new Blast();

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      await drainTimers();
      const submitResult = await submitPromise;

      expect(submitResult.rid).toBe('TEST123');
    });

    it('should retry on 503 status', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 503, text: () => Promise.resolve('') })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(SUBMIT_RESPONSE),
        });
      vi.stubGlobal('fetch', fetchMock);
      const blast = new Blast();

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      await drainTimers();
      const submitResult = await submitPromise;

      expect(submitResult.rid).toBe('TEST123');
    });

    it('should retry on network error (TypeError)', async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(SUBMIT_RESPONSE),
        });
      vi.stubGlobal('fetch', fetchMock);
      const blast = new Blast();

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      await drainTimers();
      const submitResult = await submitPromise;

      expect(submitResult.rid).toBe('TEST123');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw BlastHttpError on non-retryable status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad Request'),
        }),
      );
      const blast = new Blast();

      await expect(blast.submit('ATCGATCG', 'blastn', 'nt')).rejects.toThrow(BlastHttpError);
    });

    it('should include status and body in BlastHttpError', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not Found'),
        }),
      );
      const blast = new Blast();

      try {
        await blast.submit('ATCGATCG', 'blastn', 'nt');
        expect.unreachable('Should have thrown');
      } catch (err) {
        const httpError = err as BlastHttpError;
        expect(httpError.status).toBe(404);
        expect(httpError.body).toBe('Not Found');
        expect(httpError.name).toBe('BlastHttpError');
      }
    });

    it('should throw after max retries on persistent server error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server Error'),
        }),
      );
      const blast = new Blast({ maxRetries: 0 });

      await expect(blast.submit('ATCGATCG', 'blastn', 'nt')).rejects.toThrow(BlastHttpError);
    });

    it('should throw network error after max retries', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')));
      const blast = new Blast({ maxRetries: 0 });

      await expect(blast.submit('ATCGATCG', 'blastn', 'nt')).rejects.toThrow(TypeError);
    });

    it('should throw non-TypeError errors immediately without retry', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unknown error')));
      const blast = new Blast();

      await expect(blast.submit('ATCGATCG', 'blastn', 'nt')).rejects.toThrow('Unknown error');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration', () => {
    it('should use default maxRetries when no config provided', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('error'),
        }),
      );
      const blast = new Blast();

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      const assertion = expect(submitPromise).rejects.toThrow(BlastHttpError);
      await drainTimers();
      await assertion;
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(4);
    });

    it('should respect custom maxRetries', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('error'),
        }),
      );
      const blast = new Blast({ maxRetries: 1 });

      const submitPromise = blast.submit('ATCGATCG', 'blastn', 'nt');
      const assertion = expect(submitPromise).rejects.toThrow(BlastHttpError);
      await drainTimers();
      await assertion;
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });
  });
});
