interface ReadableStreamDefaultReader<R = unknown> {
  readonly closed: Promise<undefined>;
  cancel(reason?: unknown): Promise<void>;
  read(): Promise<ReadableStreamReadResult<R>>;
  releaseLock(): void;
}

interface ReadableStreamReadResult<T> {
  readonly done: boolean;
  readonly value: T;
}

interface ReadableStreamDefaultController<R = unknown> {
  readonly desiredSize: number | null;
  close(): void;
  enqueue(chunk?: R): void;
  error(reason?: unknown): void;
}

interface UnderlyingDefaultSource<R = unknown> {
  cancel?: (reason?: unknown) => void | Promise<void>;
  pull?: (controller: ReadableStreamDefaultController<R>) => void | Promise<void>;
  start?: (controller: ReadableStreamDefaultController<R>) => void | Promise<void>;
  type?: undefined;
}

interface ReadableStream<R = unknown> {
  readonly locked: boolean;
  cancel(reason?: unknown): Promise<void>;
  getReader(): ReadableStreamDefaultReader<R>;
}

declare const ReadableStream: {
  new <R = unknown>(underlyingSource?: UnderlyingDefaultSource<R>): ReadableStream<R>;
  prototype: ReadableStream;
};
