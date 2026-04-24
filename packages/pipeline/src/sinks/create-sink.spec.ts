import { createSink } from './create-sink';

describe('createSink', () => {
  it('should create a sink from a write function', async () => {
    const received: Array<ReadonlyArray<number>> = [];
    const sink = createSink<number>(async (records) => {
      received.push(records);
    });

    await sink.write([1, 2, 3]);

    expect(received).toEqual([[1, 2, 3]]);
    expect(sink.close).toBeUndefined();
  });

  it('should create a sink from an options object', async () => {
    let closed = false;
    const received: Array<ReadonlyArray<string>> = [];

    const sink = createSink<string>({
      write: async (records) => {
        received.push(records);
      },
      close: async () => {
        closed = true;
      },
    });

    await sink.write(['hello']);
    await sink.close?.();

    expect(received).toEqual([['hello']]);
    expect(closed).toBe(true);
  });

  it('should create a sink without close when not provided in options', () => {
    const sink = createSink<number>({
      write: async () => {
        // noop
      },
    });

    expect(sink.close).toBeUndefined();
  });
});
