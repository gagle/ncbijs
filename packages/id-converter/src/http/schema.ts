export interface paths {
  '/': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly ids: string;
          readonly idtype?: 'pmid' | 'pmcid' | 'doi' | 'mid' | undefined;
          readonly versions?: 'yes' | 'no' | undefined;
          readonly showaiid?: 'yes' | 'no' | undefined;
          readonly format?: 'json' | 'xml' | 'csv' | 'html' | undefined;
          readonly tool?: string | undefined;
          readonly email?: string | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: {
            'application/json': {
              readonly status: string;
              readonly responseDate: string;
              readonly request: string;
              readonly records: ReadonlyArray<{
                readonly pmid?: number | string;
                readonly pmcid?: string;
                readonly doi?: string;
                readonly mid?: string;
                readonly live?: boolean | string;
                readonly 'release-date'?: string;
                readonly versions?: ReadonlyArray<{
                  readonly pmcid: string;
                  readonly current: boolean | string;
                }>;
                readonly aiid?: string;
                readonly errmsg?: string;
              }>;
            };
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
