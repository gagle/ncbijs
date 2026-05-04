import { Md5ChecksumChecker, parseMd5 } from './md5-checksum-checker';
import type { DatasetSyncState } from '../interfaces/sync.interface';

function createState(overrides?: Partial<DatasetSyncState>): DatasetSyncState {
  return {
    dataset: 'clinvar',
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

describe('parseMd5', () => {
  it('parses hash from GNU md5sum format', () => {
    expect(parseMd5('123b840f5eec7642e0bf85f9b8aeffc1  variant_summary.txt.gz\n')).toBe(
      '123b840f5eec7642e0bf85f9b8aeffc1',
    );
  });

  it('parses hash-only format', () => {
    expect(parseMd5('fd40a546f751a93097fb8eca85dbc8c1\n')).toBe('fd40a546f751a93097fb8eca85dbc8c1');
  });

  it('normalizes uppercase hex to lowercase', () => {
    expect(parseMd5('FD40A546F751A93097FB8ECA85DBC8C1\n')).toBe('fd40a546f751a93097fb8eca85dbc8c1');
  });

  it('throws on invalid content', () => {
    expect(() => parseMd5('not a valid hash')).toThrow('Could not parse MD5 hash');
  });

  it('throws on empty content', () => {
    expect(() => parseMd5('')).toThrow('Could not parse MD5 hash');
  });
});

describe('Md5ChecksumChecker', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects update when no previous checksum exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('abc123def456abc123def456abc123de  file.gz\n', { status: 200 }),
        ),
    );

    const checker = new Md5ChecksumChecker(
      'clinvar',
      'https://example.com/variant_summary.txt.gz.md5',
    );
    const result = await checker.check(createState());

    expect(result.hasUpdate).toBe(true);
    expect(result.checksum).toBe('abc123def456abc123def456abc123de');
    expect(result.sourceTimestamp).toBeUndefined();
  });

  it('detects update when checksum differs', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('aaaa0000bbbb1111cccc2222dddd3333  file.gz\n', { status: 200 }),
        ),
    );

    const checker = new Md5ChecksumChecker(
      'clinvar',
      'https://example.com/variant_summary.txt.gz.md5',
    );
    const result = await checker.check(
      createState({ lastChecksum: '11112222333344445555666677778888' }),
    );

    expect(result.hasUpdate).toBe(true);
    expect(result.checksum).toBe('aaaa0000bbbb1111cccc2222dddd3333');
  });

  it('reports no update when checksum matches', async () => {
    const checksum = 'abc123def456abc123def456abc123de';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(`${checksum}  file.gz\n`, { status: 200 })),
    );

    const checker = new Md5ChecksumChecker(
      'clinvar',
      'https://example.com/variant_summary.txt.gz.md5',
    );
    const result = await checker.check(createState({ lastChecksum: checksum }));

    expect(result.hasUpdate).toBe(false);
    expect(result.checksum).toBe(checksum);
  });

  it('throws on non-ok HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    const checker = new Md5ChecksumChecker(
      'clinvar',
      'https://example.com/variant_summary.txt.gz.md5',
    );

    await expect(checker.check(createState())).rejects.toThrow('HTTP 404');
  });

  it('throws on invalid MD5 content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not a valid hash', { status: 200 })),
    );

    const checker = new Md5ChecksumChecker(
      'clinvar',
      'https://example.com/variant_summary.txt.gz.md5',
    );

    await expect(checker.check(createState())).rejects.toThrow('Could not parse MD5 hash');
  });

  it('sends User-Agent header', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response('abc123def456abc123def456abc123de  file.gz\n', { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchSpy);

    const checker = new Md5ChecksumChecker(
      'clinvar',
      'https://example.com/variant_summary.txt.gz.md5',
    );
    await checker.check(createState());

    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/variant_summary.txt.gz.md5', {
      headers: { 'User-Agent': 'ncbijs-sync' },
    });
  });

  it('exposes dataset name', () => {
    const checker = new Md5ChecksumChecker('taxonomy', 'https://example.com/taxdump.tar.gz.md5');

    expect(checker.dataset).toBe('taxonomy');
  });
});
