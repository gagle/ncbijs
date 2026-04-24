import { createCompositeSource } from './composite-source';
import type { Source } from '../interfaces/pipeline.interface';

function createStringSource(content: string): Source<string> {
  return {
    async *open(): AsyncIterable<string> {
      yield content;
    },
  };
}

function createChunkedSource(...chunks: ReadonlyArray<string>): Source<string> {
  return {
    async *open(): AsyncIterable<string> {
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}

describe('createCompositeSource', () => {
  it('should combine multiple sources into a single object', async () => {
    const source = createCompositeSource({
      names: createStringSource('alice\nbob'),
      nodes: createStringSource('1\n2'),
    });

    const results: Array<{ names: string; nodes: string }> = [];

    for await (const item of source.open(new AbortController().signal)) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      names: 'alice\nbob',
      nodes: '1\n2',
    });
  });

  it('should concatenate chunked sub-sources', async () => {
    const source = createCompositeSource({
      data: createChunkedSource('hello', ' ', 'world'),
    });

    const results: Array<{ data: string }> = [];

    for await (const item of source.open(new AbortController().signal)) {
      results.push(item);
    }

    expect(results[0]).toEqual({ data: 'hello world' });
  });

  it('should read sub-sources concurrently', async () => {
    const order: Array<string> = [];

    const sourceA: Source<string> = {
      async *open(): AsyncIterable<string> {
        order.push('a-start');
        yield 'a-data';
        order.push('a-end');
      },
    };

    const sourceB: Source<string> = {
      async *open(): AsyncIterable<string> {
        order.push('b-start');
        yield 'b-data';
        order.push('b-end');
      },
    };

    const composite = createCompositeSource({ a: sourceA, b: sourceB });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _item of composite.open(new AbortController().signal)) {
      // consume
    }

    expect(order).toContain('a-start');
    expect(order).toContain('b-start');
  });
});
