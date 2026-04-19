export interface paths {
  '/esearch.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly term: string;
          readonly usehistory?: 'y' | undefined;
          readonly retstart?: number | undefined;
          readonly retmax?: number | undefined;
          readonly retmode?: 'xml' | 'json' | undefined;
          readonly sort?: 'relevance' | 'pub_date' | 'Author' | 'JournalName' | undefined;
          readonly field?: string | undefined;
          readonly datetype?: 'mdat' | 'pdat' | 'edat' | undefined;
          readonly reldate?: number | undefined;
          readonly mindate?: string | undefined;
          readonly maxdate?: string | undefined;
          readonly idtype?: 'acc' | undefined;
          readonly WebEnv?: string | undefined;
          readonly query_key?: number | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/efetch.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly id?: string | undefined;
          readonly WebEnv?: string | undefined;
          readonly query_key?: number | undefined;
          readonly rettype?: string | undefined;
          readonly retmode?: string | undefined;
          readonly retstart?: number | undefined;
          readonly retmax?: number | undefined;
          readonly idtype?: 'acc' | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/esummary.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly id?: string | undefined;
          readonly WebEnv?: string | undefined;
          readonly query_key?: number | undefined;
          readonly retstart?: number | undefined;
          readonly retmax?: number | undefined;
          readonly retmode?: 'xml' | 'json' | undefined;
          readonly version?: '2.0' | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/epost.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly id: string;
          readonly WebEnv?: string | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/elink.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly dbfrom: string;
          readonly id?: string | undefined;
          readonly WebEnv?: string | undefined;
          readonly query_key?: number | undefined;
          readonly cmd?:
            | 'neighbor'
            | 'neighbor_score'
            | 'neighbor_history'
            | 'acheck'
            | 'ncheck'
            | 'lcheck'
            | 'llinks'
            | 'llinkslib'
            | 'prlinks'
            | undefined;
          readonly linkname?: string | undefined;
          readonly retmode?: 'xml' | 'json' | undefined;
          readonly idtype?: 'acc' | undefined;
          readonly term?: string | undefined;
          readonly holding?: string | undefined;
          readonly datetype?: 'mdat' | 'pdat' | 'edat' | undefined;
          readonly reldate?: number | undefined;
          readonly mindate?: string | undefined;
          readonly maxdate?: string | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/einfo.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query?: {
          readonly db?: string | undefined;
          readonly version?: '2.0' | undefined;
          readonly retmode?: 'xml' | 'json' | undefined;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/espell.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db?: string | undefined;
          readonly term: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/egquery.fcgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly term: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/xml': string };
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
  '/ecitmatch.cgi': {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly bdata: string;
          readonly retmode: 'xml';
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        200: {
          headers: { [name: string]: unknown };
          content: { 'text/plain': string };
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
