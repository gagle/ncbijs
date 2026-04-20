export function setup(): void {
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
