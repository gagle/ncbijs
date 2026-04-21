/** HTTP error thrown when an E-utilities request returns a non-OK status. */
export class EUtilsHttpError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: string;

  constructor(statusCode: number, responseBody: string) {
    super(`E-utilities HTTP ${statusCode}`);
    this.name = 'EUtilsHttpError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}
