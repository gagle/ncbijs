function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`${key} environment variable is required`);
  }
  return value;
}

/** NCBI API key validated at startup by global-setup.ts. */
export const ncbiApiKey: string = requireEnv('NCBI_API_KEY');
