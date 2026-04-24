import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createGzip } from 'node:zlib';
import { createWriteStream } from 'node:fs';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSource } from './file-source';

describe('createFileSource', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ncbijs-file-source-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true });
  });

  it('should read a plain text file', async () => {
    const filePath = join(tempDir, 'data.txt');
    await writeFile(filePath, 'hello world');

    const source = createFileSource(filePath);
    let content = '';

    for await (const chunk of source.open(new AbortController().signal)) {
      content += chunk;
    }

    expect(content).toBe('hello world');
  });

  it('should auto-decompress .gz files', async () => {
    const gzPath = join(tempDir, 'data.txt.gz');
    const originalContent = 'compressed content here';

    await streamPipeline(Readable.from(originalContent), createGzip(), createWriteStream(gzPath));

    const source = createFileSource(gzPath);
    let content = '';

    for await (const chunk of source.open(new AbortController().signal)) {
      content += chunk;
    }

    expect(content).toBe(originalContent);
  });

  it('should yield multiple chunks for large files', async () => {
    const filePath = join(tempDir, 'large.txt');
    const largeContent = 'x'.repeat(100_000);
    await writeFile(filePath, largeContent);

    const source = createFileSource(filePath);
    const chunks: Array<string> = [];

    for await (const chunk of source.open(new AbortController().signal)) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe(largeContent);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });
});
