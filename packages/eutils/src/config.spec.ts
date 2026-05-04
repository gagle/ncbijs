import {
  EUTILS_BASE_URL,
  EUTILS_REQUESTS_PER_SECOND,
  EUTILS_REQUESTS_PER_SECOND_WITH_KEY,
  appendEUtilsCredentials,
} from './config';

describe('config', () => {
  describe('constants', () => {
    it('should export the E-utilities base URL', () => {
      expect(EUTILS_BASE_URL).toBe('https://eutils.ncbi.nlm.nih.gov/entrez/eutils');
    });

    it('should export the default rate limit', () => {
      expect(EUTILS_REQUESTS_PER_SECOND).toBe(3);
    });

    it('should export the API key rate limit', () => {
      expect(EUTILS_REQUESTS_PER_SECOND_WITH_KEY).toBe(10);
    });
  });

  describe('appendEUtilsCredentials', () => {
    it('should append api_key when provided', () => {
      const params = new URLSearchParams();
      appendEUtilsCredentials(params, { apiKey: 'test-key' });
      expect(params.get('api_key')).toBe('test-key');
    });

    it('should append tool when provided', () => {
      const params = new URLSearchParams();
      appendEUtilsCredentials(params, { tool: 'my-tool' });
      expect(params.get('tool')).toBe('my-tool');
    });

    it('should append email when provided', () => {
      const params = new URLSearchParams();
      appendEUtilsCredentials(params, { email: 'test@example.com' });
      expect(params.get('email')).toBe('test@example.com');
    });

    it('should append all credentials when provided', () => {
      const params = new URLSearchParams();
      appendEUtilsCredentials(params, {
        apiKey: 'test-key',
        tool: 'my-tool',
        email: 'test@example.com',
      });
      expect(params.get('api_key')).toBe('test-key');
      expect(params.get('tool')).toBe('my-tool');
      expect(params.get('email')).toBe('test@example.com');
    });

    it('should skip undefined fields', () => {
      const params = new URLSearchParams();
      appendEUtilsCredentials(params, {});
      expect(params.toString()).toBe('');
    });

    it('should not overwrite existing params', () => {
      const params = new URLSearchParams({ db: 'pubmed' });
      appendEUtilsCredentials(params, { apiKey: 'test-key' });
      expect(params.get('db')).toBe('pubmed');
      expect(params.get('api_key')).toBe('test-key');
    });
  });
});
