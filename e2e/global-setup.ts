import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(): void {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional — env vars can be set directly (e.g. CI secrets)
  }
}

export function setup(): void {
  loadEnvFile();

  const apiKey = process.env['NCBI_API_KEY'];
  if (!apiKey) {
    throw new Error(
      'NCBI_API_KEY environment variable is required for E2E tests. ' +
        'Get one at https://www.ncbi.nlm.nih.gov/account/settings/',
    );
  }
}

export function teardown(): void {
  // Intentionally empty — no cleanup needed
}
