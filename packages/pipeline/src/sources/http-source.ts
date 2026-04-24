import type { Source } from '../interfaces/pipeline.interface';

/** Options for creating an HTTP source. */
export interface HttpSourceOptions {
  readonly headers?: Record<string, string>;
  readonly decompress?: boolean;
}

/** Create a source that downloads from a URL, auto-decompressing .gz responses. */
export function createHttpSource(url: string, options?: HttpSourceOptions): Source<string> {
  return {
    async *open(signal: AbortSignal): AsyncIterable<string> {
      const init: RequestInit = { signal };

      if (options?.headers !== undefined) {
        init.headers = options.headers;
      }

      const response = await fetch(url, init);

      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
      }

      const body = response.body;

      if (body === null) {
        throw new Error('Response body is null');
      }

      const shouldDecompress = options?.decompress ?? url.endsWith('.gz');
      const stream = shouldDecompress ? body.pipeThrough(new DecompressionStream('gzip')) : body;
      const textStream = stream.pipeThrough(new TextDecoderStream());

      for await (const chunk of textStream) {
        yield chunk;
      }
    },
  };
}
