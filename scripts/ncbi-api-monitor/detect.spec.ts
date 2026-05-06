import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sha256,
  extractJsonKeys,
  checkSpecHashes,
  checkVersionEndpoints,
  checkDeprecationHeaders,
  checkSchemaFingerprints,
  checkRssFeed,
  checkGitHubReleases,
  checkEinfoDatabases,
  detect,
} from './detect';
import type { SpecHashEntry, EinfoEntry } from './detect';

const mockFetch = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function textResponse(body: string, headers?: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
    headers: new Headers(headers),
  } as Response;
}

function jsonResponse(data: unknown, headers?: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    headers: new Headers(headers),
  } as Response;
}

describe('sha256', () => {
  it('should compute a stable SHA-256 hash', () => {
    const hash = sha256('hello world');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('should return different hashes for different inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });
});

describe('extractJsonKeys', () => {
  it('should extract keys at each depth level', () => {
    const result = extractJsonKeys({
      alpha: 'value',
      beta: {
        nested1: 'value',
        nested2: 'value',
      },
    });

    expect(result['depth0']).toEqual(['alpha', 'beta']);
    expect(result['depth1']).toEqual(['nested1', 'nested2']);
  });

  it('should deduplicate keys from arrays of objects', () => {
    const result = extractJsonKeys({
      items: [
        { id: 1, name: 'a' },
        { id: 2, title: 'b' },
      ],
    });

    expect(result['depth0']).toEqual(['items']);
    expect(result['depth1']).toEqual(['id', 'name', 'title']);
  });

  it('should respect maxDepth', () => {
    const result = extractJsonKeys({ a: { b: { c: { d: 'deep' } } } }, 2);

    expect(result['depth0']).toEqual(['a']);
    expect(result['depth1']).toEqual(['b']);
    expect(result['depth2']).toEqual(['c']);
    expect(result['depth3']).toBeUndefined();
  });

  it('should handle null and primitive values', () => {
    const result = extractJsonKeys(null);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('checkSpecHashes', () => {
  it('should detect a spec hash change', async () => {
    const oldHash = sha256('old spec content');
    const currentState: Record<string, SpecHashEntry> = {
      datasets: { hash: oldHash, version: 'v2' },
      variation: { hash: 'unchanged-hash', version: 'v0' },
      mesh: { hash: 'unchanged-hash', version: '1.0.1' },
      clinicaltrials: { hash: 'unchanged-hash', version: 'v2' },
    };

    mockFetch.mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes('datasets')) {
        return textResponse('new spec content');
      }
      if (urlString.includes('variation')) {
        return textResponse('unchanged-body-for-variation');
      }
      if (urlString.includes('mesh')) {
        return textResponse('unchanged-body-for-mesh');
      }
      if (urlString.includes('clinicaltrials')) {
        return textResponse('unchanged-body-for-ct');
      }
      throw new Error(`Unexpected URL: ${urlString}`);
    });

    currentState['variation'] = { hash: sha256('unchanged-body-for-variation'), version: 'v0' };
    currentState['mesh'] = { hash: sha256('unchanged-body-for-mesh'), version: '1.0.1' };
    currentState['clinicaltrials'] = { hash: sha256('unchanged-body-for-ct'), version: 'v2' };

    const result = await checkSpecHashes(currentState);

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.category).toBe('spec');
    expect(result.changes[0]?.severity).toBe('high');
    expect(result.changes[0]?.description).toContain('datasets');
    expect(result.changes[0]?.affectedPackages).toEqual(['@ncbijs/datasets']);
  });

  it('should report no changes when hashes match', async () => {
    const specBody = '{"info": {"version": "v2"}}';
    const currentState: Record<string, SpecHashEntry> = {
      datasets: { hash: sha256(specBody), version: 'v2' },
      variation: { hash: sha256(specBody), version: 'v2' },
      mesh: { hash: sha256(specBody), version: 'v2' },
      clinicaltrials: { hash: sha256(specBody), version: 'v2' },
    };

    mockFetch.mockResolvedValue(textResponse(specBody));

    const result = await checkSpecHashes(currentState);
    expect(result.changes).toHaveLength(0);
  });

  it('should populate baseline on first run without reporting changes', async () => {
    mockFetch.mockResolvedValue(textResponse('{"info": {"version": "v2"}}'));

    const result = await checkSpecHashes({});

    expect(result.changes).toHaveLength(0);
    expect(Object.keys(result.state)).toHaveLength(4);
    expect(result.state['datasets']?.hash).toBeDefined();
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));

    const result = await checkSpecHashes({});

    expect(result.changes).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Spec fetch failed');
  });
});

describe('checkVersionEndpoints', () => {
  it('should detect a version bump', async () => {
    const currentState: Record<string, Record<string, string>> = {
      clinicaltrials: { apiVersion: '2.0.5', dataTimestamp: '2026-01-01' },
      rxnorm: { version: '06-Jan-2026', apiVersion: '3.1.350' },
    };

    mockFetch.mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes('clinicaltrials')) {
        return jsonResponse({ apiVersion: '2.1.0', dataTimestamp: '2026-04-26' });
      }
      return jsonResponse({ version: '06-Jan-2026', apiVersion: '3.1.350' });
    });

    const result = await checkVersionEndpoints(currentState);

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.severity).toBe('medium');
    expect(result.changes[0]?.description).toContain('clinicaltrials');
    expect(result.changes[0]?.description).toContain('2.0.5 -> 2.1.0');
  });

  it('should populate baseline on first run', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ apiVersion: '2.0.5', dataTimestamp: '2026-01-01' }));

    const result = await checkVersionEndpoints({});

    expect(result.changes).toHaveLength(0);
    expect(Object.keys(result.state)).toHaveLength(2);
  });

  it('should report low severity when only data-refresh fields change', async () => {
    const currentState: Record<string, Record<string, string>> = {
      clinicaltrials: { apiVersion: '2.0.5', dataTimestamp: '2026-01-01' },
      rxnorm: { version: '06-Jan-2026', apiVersion: '3.1.350' },
    };

    mockFetch.mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes('clinicaltrials')) {
        return jsonResponse({ apiVersion: '2.0.5', dataTimestamp: '2026-04-26' });
      }
      return jsonResponse({ version: '06-Jan-2026', apiVersion: '3.1.350' });
    });

    const result = await checkVersionEndpoints(currentState);

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.severity).toBe('low');
    expect(result.changes[0]?.description).toContain('clinicaltrials');
  });
});

describe('checkDeprecationHeaders', () => {
  it('should detect a Sunset header', async () => {
    mockFetch.mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes('datasets')) {
        return textResponse('', { Sunset: '2027-01-01' });
      }
      return textResponse('');
    });

    const result = await checkDeprecationHeaders();

    expect(result.changes.length).toBeGreaterThanOrEqual(1);
    const sunsetChange = result.changes.find(
      (change) => change.description.includes('sunset') || change.description.includes('Sunset'),
    );
    expect(sunsetChange).toBeDefined();
    expect(sunsetChange?.severity).toBe('high');
    expect(sunsetChange?.category).toBe('header');
  });

  it('should report no changes when no deprecation headers found', async () => {
    mockFetch.mockResolvedValue(textResponse(''));

    const result = await checkDeprecationHeaders();
    expect(result.changes).toHaveLength(0);
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('connection refused'));

    const result = await checkDeprecationHeaders();

    expect(result.changes).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('checkSchemaFingerprints', () => {
  it('should detect removed keys as HIGH', async () => {
    const currentState: Record<string, Record<string, ReadonlyArray<string>>> = {
      icite: {
        depth0: ['pmid', 'year', 'title', 'removedField'],
        depth1: [],
      },
    };

    mockFetch.mockResolvedValue(jsonResponse({ pmid: 123, year: 2026, title: 'test' }));

    const result = await checkSchemaFingerprints(currentState);

    const removedChange = result.changes.find((change) => change.severity === 'high');
    expect(removedChange).toBeDefined();
    expect(removedChange?.description).toContain('removedField');
  });

  it('should detect added keys as LOW', async () => {
    const currentState: Record<string, Record<string, ReadonlyArray<string>>> = {
      icite: { depth0: ['pmid', 'year'] },
    };

    mockFetch.mockResolvedValue(jsonResponse({ pmid: 123, year: 2026, title: 'new field' }));

    const result = await checkSchemaFingerprints(currentState);

    const addedChange = result.changes.find((change) => change.severity === 'low');
    expect(addedChange).toBeDefined();
    expect(addedChange?.description).toContain('title');
  });

  it('should populate baseline on first run', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ pmid: 123, year: 2026 }));

    const result = await checkSchemaFingerprints({});

    expect(result.changes).toHaveLength(0);
    expect(Object.keys(result.state).length).toBeGreaterThan(0);
  });
});

describe('checkRssFeed', () => {
  const rssXml = `
    <rss><channel>
      <item>
        <title>New PubMed API update available</title>
        <pubDate>Mon, 25 Apr 2026 12:00:00 GMT</pubDate>
        <link>https://ncbiinsights.ncbi.nlm.nih.gov/2026/04/25/pubmed-update/</link>
      </item>
      <item>
        <title>E-utilities deprecated endpoint removal</title>
        <pubDate>Mon, 24 Apr 2026 12:00:00 GMT</pubDate>
        <link>https://ncbiinsights.ncbi.nlm.nih.gov/2026/04/24/eutils-deprecated/</link>
      </item>
      <item>
        <title>Unrelated blog post about genomics</title>
        <pubDate>Mon, 23 Apr 2026 12:00:00 GMT</pubDate>
        <link>https://ncbiinsights.ncbi.nlm.nih.gov/2026/04/23/genomics/</link>
      </item>
    </channel></rss>
  `;

  it('should filter entries by date and keywords', async () => {
    mockFetch.mockResolvedValue(textResponse(rssXml));

    const result = await checkRssFeed('2026-04-22T00:00:00Z');

    expect(result.changes).toHaveLength(2);
  });

  it('should classify breaking keywords as MEDIUM', async () => {
    mockFetch.mockResolvedValue(textResponse(rssXml));

    const result = await checkRssFeed('2026-04-22T00:00:00Z');

    const deprecatedEntry = result.changes.find((change) =>
      change.description.includes('deprecated'),
    );
    expect(deprecatedEntry?.severity).toBe('medium');
  });

  it('should classify non-breaking keywords as LOW', async () => {
    mockFetch.mockResolvedValue(textResponse(rssXml));

    const result = await checkRssFeed('2026-04-22T00:00:00Z');

    const updateEntry = result.changes.find((change) => change.description.includes('update'));
    expect(updateEntry?.severity).toBe('low');
  });

  it('should skip entries older than cutoff', async () => {
    mockFetch.mockResolvedValue(textResponse(rssXml));

    const result = await checkRssFeed('2026-04-25T00:00:00Z');

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.description).toContain('PubMed');
  });

  it('should update lastRssEntry to the newest entry', async () => {
    mockFetch.mockResolvedValue(textResponse(rssXml));

    const result = await checkRssFeed('2026-04-22T00:00:00Z');

    expect(new Date(result.lastRssEntry).getTime()).toBeGreaterThan(
      new Date('2026-04-24T00:00:00Z').getTime(),
    );
  });
});

describe('checkGitHubReleases', () => {
  const atomXml = `
    <feed>
      <entry>
        <title>v16.40.0</title>
        <updated>2026-04-25T10:00:00Z</updated>
      </entry>
      <entry>
        <title>v16.39.0</title>
        <updated>2026-04-10T10:00:00Z</updated>
      </entry>
    </feed>
  `;

  it('should detect new releases', async () => {
    mockFetch.mockResolvedValue(textResponse(atomXml));

    const result = await checkGitHubReleases('2026-04-20T00:00:00Z');

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.description).toContain('v16.40.0');
    expect(result.changes[0]?.severity).toBe('low');
    expect(result.changes[0]?.affectedPackages).toEqual(['@ncbijs/datasets']);
  });

  it('should skip releases older than cutoff', async () => {
    mockFetch.mockResolvedValue(textResponse(atomXml));

    const result = await checkGitHubReleases('2026-04-26T00:00:00Z');

    expect(result.changes).toHaveLength(0);
  });
});

describe('checkEinfoDatabases', () => {
  it('should detect database updates', async () => {
    const currentState: Record<string, EinfoEntry> = {
      pubmed: { lastupdate: '2026/04/20 01:00', dbbuild: 'Build-2026.04.20.01.00' },
    };

    mockFetch.mockResolvedValue(
      jsonResponse({
        einforesult: {
          dbinfo: [
            {
              lastupdate: '2026/04/26 01:00',
              dbbuild: 'Build-2026.04.26.01.00',
            },
          ],
        },
      }),
    );

    const result = await checkEinfoDatabases(currentState);

    const pubmedChange = result.changes.find((change) => change.description.includes('pubmed'));
    expect(pubmedChange).toBeDefined();
    expect(pubmedChange?.severity).toBe('low');
    expect(pubmedChange?.affectedPackages).toContain('@ncbijs/eutils');
    expect(pubmedChange?.affectedPackages).toContain('@ncbijs/pubmed');
  });

  it('should populate baseline on first run', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        einforesult: {
          dbinfo: [{ lastupdate: '2026/04/26 01:00', dbbuild: 'Build-2026.04.26.01.00' }],
        },
      }),
    );

    const result = await checkEinfoDatabases({});

    expect(result.changes).toHaveLength(0);
    expect(Object.keys(result.state)).toHaveLength(17);
  });

  it('should silently skip databases when NCBI returns a no-data string', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        einforesult: {
          dbinfo: ['Can not retrieve DbInfo for db=geo'],
        },
      }),
    );

    const result = await checkEinfoDatabases({});

    expect(result.changes).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(Object.keys(result.state)).toHaveLength(0);
  });
});

describe('detect', () => {
  beforeEach(() => {
    vi.mock('node:fs/promises', () => ({
      readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
      writeFile: vi.fn().mockResolvedValue(undefined),
      mkdir: vi.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a complete report on first run', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ info: { version: 'v1' } }));

    const report = await detect('/tmp/test-state');

    expect(report.date).toBeDefined();
    expect(report.hasChanges).toBe(false);
    expect(report.summary).toContain('No changes detected');
    expect(report.changes).toHaveLength(0);
  });

  it('should survive when all fetches fail', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    const report = await detect('/tmp/test-state');

    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.hasChanges).toBe(false);
  });
});
