import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import type { Sink } from '../interfaces/pipeline.interface';

/** Create a sink that writes records as newline-delimited JSON to a file. */
export function createJsonSink<T>(filePath: string): Sink<T> {
  let fileHandle: FileHandle | undefined;

  return {
    async write(records: ReadonlyArray<T>): Promise<void> {
      if (fileHandle === undefined) {
        fileHandle = await open(filePath, 'w');
      }

      const lines = records.map((record) => JSON.stringify(record)).join('\n') + '\n';
      await fileHandle.write(lines);
    },

    async close(): Promise<void> {
      if (fileHandle !== undefined) {
        await fileHandle.close();
        fileHandle = undefined;
      }
    },
  };
}
