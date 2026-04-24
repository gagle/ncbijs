/** Buffer records from an async iterable into fixed-size batches. */
export async function* batchRecords<T>(
  records: AsyncIterable<T>,
  batchSize: number,
): AsyncIterable<ReadonlyArray<T>> {
  let batch: Array<T> = [];

  for await (const record of records) {
    batch.push(record);

    if (batch.length >= batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}
