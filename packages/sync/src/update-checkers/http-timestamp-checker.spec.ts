import { HttpTimestampChecker } from './http-timestamp-checker';
import type { DatasetSyncState } from '../interfaces/sync.interface';

function createState(overrides?: Partial<DatasetSyncState>): DatasetSyncState {
  return {
    dataset: 'mesh',
    lastSyncedAt: undefined,
    lastSourceTimestamp: undefined,
    lastChecksum: undefined,
    lastProcessedFile: undefined,
    recordCount: 0,
    status: 'idle',
    lastError: undefined,
    ...overrides,
  };
}

describe('HttpTimestampChecker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects update when no previous sync exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'last-modified': 'Wed, 15 Jan 2025 10:00:00 GMT' },
        }),
      ),
    );

    const checker = new HttpTimestampChecker('mesh', 'https://example.com/mesh.xml');
    const result = await checker.check(createState());

    expect(result.hasUpdate).toBe(true);
    expect(result.sourceTimestamp).toBe('Wed, 15 Jan 2025 10:00:00 GMT');
    expect(result.checksum).toBeUndefined();
  });

  it('detects update when timestamp differs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'last-modified': 'Thu, 16 Jan 2025 10:00:00 GMT' },
        }),
      ),
    );

    const checker = new HttpTimestampChecker('mesh', 'https://example.com/mesh.xml');
    const result = await checker.check(
      createState({ lastSourceTimestamp: 'Wed, 15 Jan 2025 10:00:00 GMT' }),
    );

    expect(result.hasUpdate).toBe(true);
    expect(result.sourceTimestamp).toBe('Thu, 16 Jan 2025 10:00:00 GMT');
  });

  it('reports no update when timestamp matches', async () => {
    const timestamp = 'Wed, 15 Jan 2025 10:00:00 GMT';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'last-modified': timestamp },
        }),
      ),
    );

    const checker = new HttpTimestampChecker('mesh', 'https://example.com/mesh.xml');
    const result = await checker.check(createState({ lastSourceTimestamp: timestamp }));

    expect(result.hasUpdate).toBe(false);
  });

  it('reports update when server has no Last-Modified header', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    const checker = new HttpTimestampChecker('mesh', 'https://example.com/mesh.xml');
    const result = await checker.check(createState());

    expect(result.hasUpdate).toBe(true);
    expect(result.sourceTimestamp).toBeUndefined();
  });

  it('throws on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    const checker = new HttpTimestampChecker('mesh', 'https://example.com/mesh.xml');

    await expect(checker.check(createState())).rejects.toThrow('HTTP 404');
  });

  it('sends HEAD request', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { 'last-modified': 'Wed, 15 Jan 2025 10:00:00 GMT' },
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const checker = new HttpTimestampChecker('mesh', 'https://example.com/mesh.xml');
    await checker.check(createState());

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/mesh.xml', {
      method: 'HEAD',
      headers: { 'User-Agent': 'ncbijs-sync' },
    });
  });

  it('exposes dataset name', () => {
    const checker = new HttpTimestampChecker('taxonomy', 'https://example.com/taxonomy.tar.gz');

    expect(checker.dataset).toBe('taxonomy');
  });
});
