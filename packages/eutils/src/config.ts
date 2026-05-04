export const EUTILS_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
export const EUTILS_REQUESTS_PER_SECOND = 3;
export const EUTILS_REQUESTS_PER_SECOND_WITH_KEY = 10;

export interface EUtilsCredentials {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
}

export function appendEUtilsCredentials(
  params: URLSearchParams,
  credentials: EUtilsCredentials,
): void {
  if (credentials.apiKey !== undefined) {
    params.set('api_key', credentials.apiKey);
  }

  if (credentials.tool !== undefined) {
    params.set('tool', credentials.tool);
  }

  if (credentials.email !== undefined) {
    params.set('email', credentials.email);
  }
}
