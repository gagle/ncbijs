import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import type { Source } from '../interfaces/pipeline.interface';

/** Create a source that reads a local file, auto-decompressing .gz files. */
export function createFileSource(filePath: string): Source<string> {
  return {
    async *open(signal: AbortSignal): AsyncIterable<string> {
      const isGzip = filePath.endsWith('.gz');
      const raw = createReadStream(filePath);
      const readable = isGzip ? raw.pipe(createGunzip()) : raw;
      readable.setEncoding('utf-8');

      const onAbort = (): void => {
        readable.destroy();
      };

      signal.addEventListener('abort', onAbort, { once: true });

      try {
        for await (const chunk of readable) {
          yield chunk as string;
        }
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    },
  };
}
