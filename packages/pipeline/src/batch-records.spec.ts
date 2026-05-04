import { batchRecords } from './batch-records';

async function* fromArray<T>(items: ReadonlyArray<T>): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<Array<T>> {
  const results: Array<T> = [];

  for await (const item of iterable) {
    results.push(item);
  }

  return results;
}

describe('batchRecords', () => {
  it('should batch records into fixed-size chunks', async () => {
    const records = fromArray([1, 2, 3, 4, 5]);
    const batches = await collect(batchRecords(records, 2));

    expect(batches).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should yield a single batch when records fit within batch size', async () => {
    const records = fromArray([1, 2, 3]);
    const batches = await collect(batchRecords(records, 10));

    expect(batches).toEqual([[1, 2, 3]]);
  });

  it('should yield exact batches when records divide evenly', async () => {
    const records = fromArray([1, 2, 3, 4]);
    const batches = await collect(batchRecords(records, 2));

    expect(batches).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('should yield nothing for an empty iterable', async () => {
    const records = fromArray<number>([]);
    const batches = await collect(batchRecords(records, 5));

    expect(batches).toEqual([]);
  });

  it('should handle batch size of 1', async () => {
    const records = fromArray(['a', 'b', 'c']);
    const batches = await collect(batchRecords(records, 1));

    expect(batches).toEqual([['a'], ['b'], ['c']]);
  });
});
