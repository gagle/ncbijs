import type { Client } from 'openapi-fetch';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { EUTILS_REQUESTS_PER_SECOND, EUTILS_REQUESTS_PER_SECOND_WITH_KEY } from './config';
import { createNcbiClient } from './ncbi-client';
import type { paths } from './schema';
import { parseECitMatchText } from './parsers/ecitmatch-parser';
import { parseEGQueryXml } from './parsers/egquery-parser';
import { parseEInfoJson, parseEInfoXml } from './parsers/einfo-parser';
import { parseELinkJson, parseELinkXml } from './parsers/elink-parser';
import { parseEPostXml } from './parsers/epost-parser';
import { parseESearchJson, parseESearchXml } from './parsers/esearch-parser';
import { parseESpellXml } from './parsers/espell-parser';
import { parseESummaryJson, parseESummaryXml } from './parsers/esummary-parser';
import type {
  ECitMatchParams,
  EFetchParams,
  EGQueryParams,
  EInfoParams,
  ELinkParams,
  EPostParams,
  ESearchParams,
  ESpellParams,
  ESummaryParams,
  EUtilsConfig,
} from './types/params';
import type {
  ECitMatchResult,
  EGQueryResult,
  EInfoResult,
  ELinkResult,
  EPostResult,
  ESearchResult,
  ESpellResult,
  ESummaryResult,
} from './types/responses';
import { EUtilsHttpError } from './http-client';

function unwrapResponse<T>(response: { data?: T; error?: unknown }): T {
  if (response.data === undefined) {
    throw new EUtilsHttpError(0, 'Unexpected empty response');
  }
  return response.data;
}

export class EUtils {
  private readonly client: Client<paths>;

  constructor(config: EUtilsConfig) {
    if (!config.tool) {
      throw new Error('EUtilsConfig.tool is required');
    }
    if (!config.email) {
      throw new Error('EUtilsConfig.email is required');
    }

    const requestsPerSecond = config.apiKey
      ? EUTILS_REQUESTS_PER_SECOND_WITH_KEY
      : EUTILS_REQUESTS_PER_SECOND;
    const rateLimiter = new TokenBucket({ requestsPerSecond });

    this.client = createNcbiClient({
      tool: config.tool,
      email: config.email,
      ...(config.apiKey !== undefined && { apiKey: config.apiKey }),
      maxRetries: config.maxRetries ?? 3,
      rateLimiter,
    });
  }

  /**
   * Search an Entrez database and return matching UIDs.
   *
   * NCBI E-utilities §ESearch: esearch.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch
   */
  public async esearch(params: ESearchParams): Promise<ESearchResult> {
    const response = await this.client.GET('/esearch.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });
    const text = unwrapResponse(response);

    return params.retmode === 'json' ? parseESearchJson(text) : parseESearchXml(text);
  }

  /**
   * Fetch records in the requested format (raw string).
   *
   * NCBI E-utilities §EFetch: efetch.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EFetch
   */
  public async efetch(params: EFetchParams): Promise<string> {
    const response = await this.client.GET('/efetch.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });

    return unwrapResponse(response);
  }

  /**
   * Retrieve document summaries for a list of UIDs.
   *
   * NCBI E-utilities §ESummary: esummary.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESummary
   */
  public async esummary(params: ESummaryParams): Promise<ESummaryResult> {
    const response = await this.client.GET('/esummary.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });
    const text = unwrapResponse(response);

    return params.retmode === 'json' ? parseESummaryJson(text) : parseESummaryXml(text);
  }

  /**
   * Post a set of UIDs to the History Server.
   *
   * NCBI E-utilities §EPost: epost.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EPost
   */
  public async epost(params: EPostParams): Promise<EPostResult> {
    const response = await this.client.GET('/epost.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });

    return parseEPostXml(unwrapResponse(response));
  }

  /**
   * Discover links between Entrez databases.
   *
   * NCBI E-utilities §ELink: elink.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ELink
   */
  public async elink(params: ELinkParams): Promise<ELinkResult> {
    const response = await this.client.GET('/elink.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });
    const text = unwrapResponse(response);

    return params.retmode === 'json' ? parseELinkJson(text) : parseELinkXml(text);
  }

  /**
   * Retrieve database metadata or list all Entrez databases.
   *
   * NCBI E-utilities §EInfo: einfo.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EInfo
   */
  public async einfo(params?: EInfoParams): Promise<EInfoResult> {
    const response = await this.client.GET('/einfo.fcgi', {
      ...(params !== undefined && { params: { query: params } }),
      parseAs: 'text',
    });
    const text = unwrapResponse(response);

    return params?.retmode === 'json' ? parseEInfoJson(text) : parseEInfoXml(text);
  }

  /**
   * Check spelling of a search term.
   *
   * NCBI E-utilities §ESpell: espell.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESpell
   */
  public async espell(params: ESpellParams): Promise<ESpellResult> {
    const response = await this.client.GET('/espell.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });

    return parseESpellXml(unwrapResponse(response));
  }

  /**
   * Query all Entrez databases and return per-database hit counts.
   *
   * NCBI E-utilities §EGQuery: egquery.fcgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EGQuery
   */
  public async egquery(params: EGQueryParams): Promise<EGQueryResult> {
    const response = await this.client.GET('/egquery.fcgi', {
      params: { query: params },
      parseAs: 'text',
    });

    return parseEGQueryXml(unwrapResponse(response));
  }

  /**
   * Match citation strings to PubMed IDs.
   *
   * NCBI E-utilities §ECitMatch: ecitmatch.cgi
   * https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ECitMatch
   */
  public async ecitmatch(params: ECitMatchParams): Promise<ECitMatchResult> {
    const response = await this.client.GET('/ecitmatch.cgi', {
      params: {
        query: {
          db: params.db ?? 'pubmed',
          retmode: 'xml' as const,
          bdata: params.bdata,
        },
      },
      parseAs: 'text',
    });

    return parseECitMatchText(unwrapResponse(response));
  }

  /**
   * NCBI E-utilities §History Server: WebEnv + query_key pagination
   * https://www.ncbi.nlm.nih.gov/books/NBK25498/#chapter3.Application_3_Retrieving_large
   */
  public async *efetchBatches(
    params: EFetchParams & { readonly batchSize?: number },
  ): AsyncIterableIterator<string> {
    const batchSize = params.batchSize ?? 500;

    let webEnv = params.WebEnv;
    let queryKey = params.query_key;
    let totalCount: number;

    if (webEnv && queryKey !== undefined) {
      totalCount = Infinity;
    } else if (params.id) {
      const posted = await this.epost({ db: params.db, id: params.id });
      webEnv = posted.webEnv;
      queryKey = posted.queryKey;
      totalCount = params.id.split(',').length;
    } else {
      throw new Error('efetchBatches requires WebEnv+query_key or id');
    }

    const maxIterations = 10_000;
    let iterations = 0;
    let retstart = params.retstart ?? 0;
    while (retstart < totalCount && iterations++ < maxIterations) {
      const response = await this.efetch({
        db: params.db,
        WebEnv: webEnv,
        query_key: queryKey,
        rettype: params.rettype,
        retmode: params.retmode,
        retstart,
        retmax: batchSize,
        idtype: params.idtype,
      });

      if (!response || response.trim().length === 0) {
        break;
      }
      yield response;
      retstart += batchSize;
    }
  }
}
