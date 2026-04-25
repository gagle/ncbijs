import type { Sink, Source } from '@ncbijs/pipeline';
import { loadAll } from './load-all';
import * as registry from './dataset-registry';
import type { EtlDatasetType } from './interfaces/etl.interface';

function createMockSink(): Sink<object> & { written: Array<ReadonlyArray<object>> } {
  const sink: Sink<object> & { written: Array<ReadonlyArray<object>> } = {
    written: [],
    write: async (records) => {
      sink.written.push(records);
    },
  };

  return sink;
}

function createMockSource(data: string): Source<string> {
  return {
    async *open(_signal: AbortSignal): AsyncIterable<string> {
      yield data;
    },
  };
}

const mockRecords = [{ id: '1', name: 'Record 1' }];

describe('loadAll', () => {
  beforeEach(() => {
    vi.spyOn(registry, 'getDescriptor').mockReturnValue({
      info: {
        id: 'mesh',
        name: 'MeSH Descriptors',
        description: 'Test',
        sourceUrls: ['https://example.com/data.xml'],
        format: 'xml',
        compressed: false,
        estimatedSize: '1 MB',
        estimatedRecords: '100',
        updateFrequency: 'Annual',
      },
      createSource: () => createMockSource('<xml>test</xml>'),
      parse: () => mockRecords,
    });

    vi.spyOn(registry, 'listDatasets').mockReturnValue([
      {
        id: 'mesh',
        name: 'MeSH',
        description: '',
        sourceUrls: [],
        format: 'xml',
        compressed: false,
        estimatedSize: '',
        estimatedRecords: '',
        updateFrequency: '',
      },
      {
        id: 'clinvar',
        name: 'ClinVar',
        description: '',
        sourceUrls: [],
        format: 'tsv',
        compressed: true,
        estimatedSize: '',
        estimatedRecords: '',
        updateFrequency: '',
      },
    ]);
  });

  it('loads all datasets when no filter is provided', async () => {
    const sinks = new Map<EtlDatasetType, ReturnType<typeof createMockSink>>();

    const result = await loadAll((dataset) => {
      const sink = createMockSink();
      sinks.set(dataset, sink);
      return sink;
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.dataset).toBe('mesh');
    expect(result.results[1]!.dataset).toBe('clinvar');
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('loads only specified datasets when filter is provided', async () => {
    const result = await loadAll(createMockSink, {
      datasets: ['mesh'],
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.dataset).toBe('mesh');
  });

  it('calls onDatasetComplete for each successful dataset', async () => {
    const completed: Array<EtlDatasetType> = [];

    await loadAll(createMockSink, {
      onDatasetComplete: (dataset, _result) => {
        completed.push(dataset);
      },
    });

    expect(completed).toEqual(['mesh', 'clinvar']);
  });

  it('stops on first error when onError is abort (default)', async () => {
    let callCount = 0;

    vi.spyOn(registry, 'getDescriptor').mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        throw new Error('First dataset failed');
      }

      return {
        info: {
          id: 'clinvar',
          name: 'ClinVar',
          description: '',
          sourceUrls: [],
          format: 'tsv',
          compressed: true,
          estimatedSize: '',
          estimatedRecords: '',
          updateFrequency: '',
        },
        createSource: () => createMockSource('data'),
        parse: () => mockRecords,
      };
    });

    const result = await loadAll(createMockSink);

    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.error).toBeDefined();
    expect(result.results[0]!.error!.message).toBe('First dataset failed');
  });

  it('continues on error when onError is skip', async () => {
    let callCount = 0;

    vi.spyOn(registry, 'getDescriptor').mockImplementation(() => {
      callCount++;

      if (callCount === 1) {
        throw new Error('First dataset failed');
      }

      return {
        info: {
          id: 'clinvar',
          name: 'ClinVar',
          description: '',
          sourceUrls: [],
          format: 'tsv',
          compressed: true,
          estimatedSize: '',
          estimatedRecords: '',
          updateFrequency: '',
        },
        createSource: () => createMockSource('data'),
        parse: () => mockRecords,
      };
    });

    const result = await loadAll(createMockSink, { onError: 'skip' });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.error).toBeDefined();
    expect(result.results[1]!.result).toBeDefined();
  });

  it('wraps non-Error throws into Error objects', async () => {
    vi.spyOn(registry, 'getDescriptor').mockImplementation(() => {
      throw 'string error';
    });

    const result = await loadAll(createMockSink, {
      datasets: ['mesh'],
    });

    expect(result.results[0]!.error).toBeInstanceOf(Error);
    expect(result.results[0]!.error!.message).toBe('string error');
  });
});
