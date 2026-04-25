import type { PipelineResult, Sink, Source } from '@ncbijs/pipeline';
import { load } from './load';
import * as registry from './dataset-registry';

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

describe('load', () => {
  const mockRecords = [
    { id: '1', name: 'Record 1' },
    { id: '2', name: 'Record 2' },
  ];

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
  });

  it('loads records from source through parser into sink', async () => {
    const sink = createMockSink();
    const result = await load('mesh', sink);

    expect(result.recordsProcessed).toBe(2);
    expect(result.batchesWritten).toBe(1);
    expect(sink.written).toHaveLength(1);
    expect(sink.written[0]).toEqual(mockRecords);
  });

  it('applies transform when provided', async () => {
    const sink = createMockSink();

    await load('mesh', sink, {
      transform: (records) => records.filter((record) => (record as { id: string }).id === '1'),
    });

    expect(sink.written[0]).toHaveLength(1);
    expect(sink.written[0]![0]).toEqual({ id: '1', name: 'Record 1' });
  });

  it('returns a PipelineResult', async () => {
    const sink = createMockSink();
    const result: PipelineResult = await load('mesh', sink);

    expect(result.recordsProcessed).toBeDefined();
    expect(result.batchesWritten).toBeDefined();
    expect(result.durationMs).toBeDefined();
    expect(result.recordsFailed).toBeDefined();
  });

  it('passes batchSize option through to pipeline', async () => {
    const sink = createMockSink();
    const result = await load('mesh', sink, { batchSize: 1 });

    expect(result.batchesWritten).toBe(2);
    expect(sink.written).toHaveLength(2);
  });

  it('passes onProgress callback through to pipeline', async () => {
    const progressEvents: Array<{ recordsProcessed: number }> = [];
    const sink = createMockSink();

    await load('mesh', sink, {
      onProgress: (event) => {
        progressEvents.push({ recordsProcessed: event.recordsProcessed });
      },
    });

    expect(progressEvents.length).toBeGreaterThan(0);
  });

  it('throws when the dataset is unknown', async () => {
    vi.restoreAllMocks();
    const sink = createMockSink();

    await expect(
      load('nonexistent' as registry.DatasetDescriptor['info']['id'], sink),
    ).rejects.toThrow('Unknown dataset');
  });
});
