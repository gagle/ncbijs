import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), '__fixtures__');

export function readFixture(fileName: string): string {
  return readFileSync(resolve(fixturesDir, fileName), 'utf-8');
}
