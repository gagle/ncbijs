export interface paths {
  '/sparql': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly query: string;
          readonly format?: 'JSON' | 'XML' | 'CSV' | 'TSV' | undefined;
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
            'application/sparql-results+json': {
              readonly head: {
                readonly vars: ReadonlyArray<string>;
              };
              readonly results: {
                readonly bindings: ReadonlyArray<
                  Readonly<
                    Record<
                      string,
                      Readonly<{
                        readonly type: string;
                        readonly value: string;
                        readonly 'xml:lang'?: string | undefined;
                      }>
                    >
                  >
                >;
              };
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
  '/lookup/descriptor': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly label: string;
          readonly match?: 'contains' | 'exact' | 'startsWith' | undefined;
          readonly limit?: number | undefined;
          readonly year?: number | undefined;
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
            'application/json': ReadonlyArray<{
              readonly resource: string;
              readonly label: string;
            }>;
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
