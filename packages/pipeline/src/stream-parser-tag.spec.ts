import { streamParser, isStreamParser } from './stream-parser-tag';

describe('streamParser', () => {
  it('should tag a function as a stream parser', () => {
    async function* transform(input: AsyncIterable<string>): AsyncIterable<number> {
      for await (const chunk of input) {
        yield chunk.length;
      }
    }

    const tagged = streamParser(transform);

    expect(isStreamParser(tagged)).toBe(true);
  });

  it('should preserve the original function behavior', async () => {
    async function* transform(input: AsyncIterable<string>): AsyncIterable<string> {
      for await (const chunk of input) {
        yield chunk.toUpperCase();
      }
    }

    const tagged = streamParser(transform);

    async function* source(): AsyncIterable<string> {
      yield 'hello';
      yield 'world';
    }

    const results: Array<string> = [];

    for await (const item of tagged(source())) {
      results.push(item);
    }

    expect(results).toEqual(['HELLO', 'WORLD']);
  });
});

describe('isStreamParser', () => {
  it('should return false for a regular function', () => {
    const batchParser = (raw: string): ReadonlyArray<number> => [raw.length];

    expect(isStreamParser(batchParser)).toBe(false);
  });

  it('should return true for a tagged stream parser', () => {
    async function* transform(input: AsyncIterable<string>): AsyncIterable<number> {
      for await (const chunk of input) {
        yield chunk.length;
      }
    }

    expect(isStreamParser(streamParser(transform))).toBe(true);
  });
});
