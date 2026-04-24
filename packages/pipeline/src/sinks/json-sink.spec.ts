import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createJsonSink } from './json-sink';

describe('createJsonSink', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ncbijs-json-sink-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('should write records as newline-delimited JSON', async () => {
    const filePath = join(tempDir, 'output.ndjson');
    const sink = createJsonSink<{ readonly id: number; readonly name: string }>(filePath);

    await sink.write([
      { id: 1, name: 'alice' },
      { id: 2, name: 'bob' },
    ]);
    await sink.close?.();

    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? '')).toEqual({ id: 1, name: 'alice' });
    expect(JSON.parse(lines[1] ?? '')).toEqual({ id: 2, name: 'bob' });
  });

  it('should append multiple batches to the same file', async () => {
    const filePath = join(tempDir, 'output.ndjson');
    const sink = createJsonSink<number>(filePath);

    await sink.write([1, 2]);
    await sink.write([3, 4]);
    await sink.close?.();

    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines).toEqual(['1', '2', '3', '4']);
  });

  it('should handle close without any writes', async () => {
    const filePath = join(tempDir, 'empty.ndjson');
    const sink = createJsonSink<number>(filePath);

    await sink.close?.();
  });
});
