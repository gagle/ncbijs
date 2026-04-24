import { pipeline } from './pipeline';
import { streamParser } from './stream-parser-tag';
import { PipelineAbortError } from './errors/pipeline-abort-error';
import type { Sink, Source } from './interfaces/pipeline.interface';

function createArraySource<T>(items: ReadonlyArray<T>): Source<T> {
  return {
    async *open(): AsyncIterable<T> {
      for (const item of items) {
        yield item;
      }
    },
  };
}

function createStringSources(...chunks: ReadonlyArray<string>): Source<string> {
  return createArraySource(chunks);
}

function createCollectorSink<T>(): Sink<T> & { readonly batches: Array<ReadonlyArray<T>> } {
  const batches: Array<ReadonlyArray<T>> = [];

  return {
    batches,
    async write(records: ReadonlyArray<T>): Promise<void> {
      batches.push([...records]);
    },
  };
}

describe('pipeline (batch mode)', () => {
  it('should run a simple batch pipeline', async () => {
    const source = createStringSources('a,b,c');
    const parse = (raw: string): ReadonlyArray<string> => raw.split(',');
    const sink = createCollectorSink<string>();

    const result = await pipeline(source, parse, sink);

    expect(sink.batches).toEqual([['a', 'b', 'c']]);
    expect(result.recordsProcessed).toBe(3);
    expect(result.batchesWritten).toBe(1);
    expect(result.recordsFailed).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should concatenate multiple source chunks into a single string', async () => {
    const source = createStringSources('hello', ' ', 'world');
    const parse = (raw: string): ReadonlyArray<string> => [raw];
    const sink = createCollectorSink<string>();

    await pipeline(source, parse, sink);

    expect(sink.batches).toEqual([['hello world']]);
  });

  it('should batch records by batchSize', async () => {
    const source = createStringSources('1,2,3,4,5');
    const parse = (raw: string): ReadonlyArray<string> => raw.split(',');
    const sink = createCollectorSink<string>();

    await pipeline(source, parse, sink, { batchSize: 2 });

    expect(sink.batches).toEqual([['1', '2'], ['3', '4'], ['5']]);
  });

  it('should call sink.close after completion', async () => {
    const source = createStringSources('data');
    const parse = (raw: string): ReadonlyArray<string> => [raw];
    let closed = false;
    const sink: Sink<string> = {
      async write(): Promise<void> {
        // noop
      },
      async close(): Promise<void> {
        closed = true;
      },
    };

    await pipeline(source, parse, sink);

    expect(closed).toBe(true);
  });

  it('should call sink.close even on error', async () => {
    const source = createStringSources('data');
    const parse = (): ReadonlyArray<string> => {
      throw new Error('parse failed');
    };
    let closed = false;
    const sink: Sink<string> = {
      async write(): Promise<void> {
        // noop
      },
      async close(): Promise<void> {
        closed = true;
      },
    };

    await expect(pipeline(source, parse, sink)).rejects.toThrow(PipelineAbortError);
    expect(closed).toBe(true);
  });

  it('should report progress after each batch', async () => {
    const source = createStringSources('a,b,c,d');
    const parse = (raw: string): ReadonlyArray<string> => raw.split(',');
    const sink = createCollectorSink<string>();
    const progressEvents: Array<{ recordsProcessed: number; batchesWritten: number }> = [];

    await pipeline(source, parse, sink, {
      batchSize: 2,
      onProgress: (event) => {
        progressEvents.push({
          recordsProcessed: event.recordsProcessed,
          batchesWritten: event.batchesWritten,
        });
      },
    });

    expect(progressEvents).toEqual([
      { recordsProcessed: 2, batchesWritten: 1 },
      { recordsProcessed: 4, batchesWritten: 2 },
    ]);
  });

  it('should abort when signal is aborted', async () => {
    const controller = new AbortController();
    const source = createStringSources('a,b,c');
    const parse = (raw: string): ReadonlyArray<string> => raw.split(',');
    const sink: Sink<string> = {
      async write(): Promise<void> {
        controller.abort();
      },
    };

    await expect(
      pipeline(source, parse, sink, { signal: controller.signal, batchSize: 1 }),
    ).rejects.toThrow(PipelineAbortError);
  });

  it('should throw PipelineAbortError on parse failure with abort strategy', async () => {
    const source = createStringSources('data');
    const parse = (): ReadonlyArray<string> => {
      throw new Error('bad data');
    };
    const sink = createCollectorSink<string>();

    await expect(pipeline(source, parse, sink, { onError: 'abort' })).rejects.toThrow(
      PipelineAbortError,
    );
  });

  it('should skip parse errors with skip strategy', async () => {
    const source = createStringSources('data');
    const parse = (): ReadonlyArray<string> => {
      throw new Error('bad data');
    };
    const sink = createCollectorSink<string>();

    const result = await pipeline(source, parse, sink, { onError: 'skip' });

    expect(result.recordsProcessed).toBe(0);
    expect(sink.batches).toEqual([]);
  });

  it('should throw PipelineAbortError when source produces no data', async () => {
    const source: Source<string> = {
      async *open(): AsyncIterable<string> {
        // yields nothing
      },
    };
    const parse = (raw: string): ReadonlyArray<string> => [raw];
    const sink = createCollectorSink<string>();

    await expect(pipeline(source, parse, sink)).rejects.toThrow(PipelineAbortError);
  });
});

describe('pipeline (stream mode)', () => {
  it('should run a streaming pipeline', async () => {
    const source = createStringSources('hello', 'world');

    const transform = streamParser(async function* (
      input: AsyncIterable<string>,
    ): AsyncIterable<number> {
      for await (const chunk of input) {
        yield chunk.length;
      }
    });

    const sink = createCollectorSink<number>();
    const result = await pipeline(source, transform, sink);

    expect(sink.batches).toEqual([[5, 5]]);
    expect(result.recordsProcessed).toBe(2);
    expect(result.batchesWritten).toBe(1);
  });

  it('should batch streaming records by batchSize', async () => {
    const source = createStringSources('a', 'b', 'c', 'd', 'e');

    const transform = streamParser(async function* (
      input: AsyncIterable<string>,
    ): AsyncIterable<string> {
      for await (const chunk of input) {
        yield chunk.toUpperCase();
      }
    });

    const sink = createCollectorSink<string>();
    await pipeline(source, transform, sink, { batchSize: 2 });

    expect(sink.batches).toEqual([['A', 'B'], ['C', 'D'], ['E']]);
  });
});

describe('pipeline (composite source)', () => {
  it('should work with a composite source and multi-file parser', async () => {
    const source: Source<{ names: string; nodes: string }> = {
      async *open(): AsyncIterable<{ names: string; nodes: string }> {
        yield { names: 'alice,bob', nodes: '1,2' };
      },
    };

    const parse = (raw: { names: string; nodes: string }): ReadonlyArray<string> => {
      const names = raw.names.split(',');
      const nodes = raw.nodes.split(',');
      return names.map((name, index) => `${name}:${nodes[index]}`);
    };

    const sink = createCollectorSink<string>();
    await pipeline(source, parse, sink);

    expect(sink.batches).toEqual([['alice:1', 'bob:2']]);
  });
});
