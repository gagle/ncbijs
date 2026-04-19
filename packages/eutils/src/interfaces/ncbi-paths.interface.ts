import type {
  EFetchParams,
  EGQueryParams,
  EInfoParams,
  ELinkParams,
  EPostParams,
  ESearchParams,
  ESpellParams,
  ESummaryParams,
} from '../types/params';

export interface NcbiEUtilsPaths {
  '/esearch.fcgi': {
    get: {
      parameters: {
        query: ESearchParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/efetch.fcgi': {
    get: {
      parameters: {
        query: EFetchParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/esummary.fcgi': {
    get: {
      parameters: {
        query: ESummaryParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/epost.fcgi': {
    get: {
      parameters: {
        query: EPostParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/elink.fcgi': {
    get: {
      parameters: {
        query: ELinkParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/einfo.fcgi': {
    get: {
      parameters: {
        query?: EInfoParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/espell.fcgi': {
    get: {
      parameters: {
        query: ESpellParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/egquery.fcgi': {
    get: {
      parameters: {
        query: EGQueryParams;
      };
      responses: {
        200: {
          content: {
            'text/xml': string;
          };
        };
      };
    };
  };
  '/ecitmatch.cgi': {
    get: {
      parameters: {
        query: {
          readonly db: string;
          readonly bdata: string;
          readonly retmode: 'xml';
        };
      };
      responses: {
        200: {
          content: {
            'text/plain': string;
          };
        };
      };
    };
  };
}
