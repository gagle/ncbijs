import { EUtils } from '@ncbijs/eutils';
import type { Chunk, ChunkOptions, JATSArticle } from '@ncbijs/jats';
import { parseJATS, toChunks, toMarkdown, toPlainText } from '@ncbijs/jats';
import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson as clientFetchJson, fetchText as clientFetchText } from './pmc-client';
import type { PMCClientConfig } from './pmc-client';

import type {
  FullTextArticle,
  OAIListOptions,
  OAIRecord,
  OAListOptions,
  OALookupOptions,
  OARecord,
  PMCConfig,
} from '../interfaces/pmc.interface';
import { readAllBlocks, readBlock, readTag } from '@ncbijs/xml';

const S3_BASE_URL = 'https://pmc-oa-opendata.s3.amazonaws.com';
const OAI_BASE_URL = 'https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/';
const ESEARCH_BATCH_SIZE = 500;
const REQUESTS_PER_SECOND = 3;

function isHttpError(error: unknown): error is { status: number } {
  return typeof error === 'object' && error !== null && 'status' in error;
}

function normalizePmcid(pmcid: string): string {
  return pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`;
}

function numericPmcid(pmcid: string): string {
  return pmcid.startsWith('PMC') ? pmcid.slice(3) : pmcid;
}

function s3ToHttpsUrl(s3Url: string): string {
  const withoutQuery = s3Url.split('?')[0] ?? s3Url;
  return withoutQuery.replace('s3://pmc-oa-opendata/', `${S3_BASE_URL}/`);
}

function toJATSArticle(article: FullTextArticle): JATSArticle {
  return {
    front: article.front,
    body: article.body,
    back: article.back,
  };
}

/** Convert a PMC full-text article to Markdown. */
export function pmcToMarkdown(article: FullTextArticle): string {
  return toMarkdown(toJATSArticle(article));
}

/** Convert a PMC full-text article to plain text. */
export function pmcToPlainText(article: FullTextArticle): string {
  return toPlainText(toJATSArticle(article));
}

/** Split a PMC full-text article into semantic chunks for embedding or processing. */
export function pmcToChunks(
  article: FullTextArticle,
  options?: ChunkOptions,
): ReadonlyArray<Chunk> {
  return toChunks(toJATSArticle(article), options);
}

function extractLicense(xml: string): string {
  const licenseBlock = readBlock(xml, 'license');
  if (!licenseBlock) return '';

  const licenseType = readAttribute(xml, 'license', 'license-type');
  if (licenseType) return licenseType;

  const licenseP = readBlock(licenseBlock, 'license-p') ?? readBlock(licenseBlock, 'p');
  if (licenseP) {
    return licenseP
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return licenseBlock
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readAttribute(xml: string, tagName: string, attrName: string): string {
  const pattern = new RegExp(`<${tagName}[^>]*\\s${attrName}="([^"]*)"`, 'i');
  const match = pattern.exec(xml);
  return match?.[1] ?? '';
}

interface S3Metadata {
  readonly pmcid: string;
  readonly version: number;
  readonly pmid: number | null;
  readonly doi: string | null;
  readonly mid: string | null;
  readonly title: string;
  readonly citation: string;
  readonly is_pmc_openaccess: boolean;
  readonly is_manuscript: boolean;
  readonly is_historical_ocr: boolean;
  readonly is_retracted: boolean;
  readonly license_code: string | null;
  readonly xml_url: string;
  readonly text_url: string;
  readonly pdf_url?: string;
  readonly media_urls?: ReadonlyArray<string>;
}

function mapS3MetadataToOARecord(data: S3Metadata): OARecord {
  return {
    pmcid: data.pmcid,
    version: data.version,
    pmid: data.pmid ?? undefined,
    doi: data.doi ?? undefined,
    mid: data.mid ?? undefined,
    title: data.title,
    citation: data.citation,
    openAccess: data.is_pmc_openaccess,
    manuscript: data.is_manuscript,
    historicalOcr: data.is_historical_ocr,
    retracted: data.is_retracted,
    license: data.license_code ?? undefined,
    xmlUrl: s3ToHttpsUrl(data.xml_url),
    textUrl: s3ToHttpsUrl(data.text_url),
    ...(data.pdf_url !== undefined ? { pdfUrl: s3ToHttpsUrl(data.pdf_url) } : {}),
    ...(data.media_urls !== undefined ? { mediaUrls: data.media_urls.map(s3ToHttpsUrl) } : {}),
  };
}

function parseOAIRecordXml(recordXml: string): OAIRecord {
  const headerXml = readBlock(recordXml, 'header') ?? '';
  const identifier = readTag(headerXml, 'identifier') ?? '';
  const datestamp = readTag(headerXml, 'datestamp') ?? '';
  const setSpec = readTag(headerXml, 'setSpec') ?? '';
  const metadata = readBlock(recordXml, 'metadata') ?? '';

  return { identifier, datestamp, setSpec, metadata };
}

/** PMC full-text article retrieval via E-utilities, OA Service, and OAI-PMH. */
export class PMC {
  private readonly eutils: EUtils;
  private readonly config: PMCConfig;
  private readonly _clientConfig: PMCClientConfig;

  constructor(config: PMCConfig) {
    this.config = config;
    this.eutils = new EUtils({
      tool: config.tool,
      email: config.email,
      apiKey: config.apiKey,
      maxRetries: config.maxRetries,
    });
    this._clientConfig = {
      maxRetries: config.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Fetch a full-text article by PMC ID via E-utilities. */
  public async fetch(pmcid: string): Promise<FullTextArticle> {
    const normalized = normalizePmcid(pmcid);

    const xml = await this.eutils.efetch({
      db: 'pmc',
      id: normalized,
      retmode: 'xml',
    });

    if (!xml.trim()) {
      throw new Error(`No content returned for ${normalized}`);
    }

    const article = parseJATS(xml);
    const license = extractLicense(xml);

    return {
      pmcid: normalized,
      front: article.front,
      body: article.body,
      back: article.back,
      license,
    };
  }

  readonly oa = {
    /**
     * Look up Open Access metadata for a PMC article via the S3 metadata endpoint.
     * @param pmcid - PMC identifier (with or without the "PMC" prefix).
     * @param options - Optional version number for the article record.
     * @returns Open Access record with download URLs and license information.
     */
    lookup: async (pmcid: string, options?: OALookupOptions): Promise<OARecord> => {
      const normalized = normalizePmcid(pmcid);
      const version = options?.version ?? 1;
      const url = `${S3_BASE_URL}/metadata/${normalized}.${version}.json`;

      let body: unknown;
      try {
        body = await clientFetchJson<unknown>(url, this._clientConfig);
      } catch (error: unknown) {
        if (isHttpError(error) && (error.status === 403 || error.status === 404)) {
          throw new Error(`No OA record found for ${normalized}`, { cause: error });
        }
        if (isHttpError(error)) {
          throw new Error(`OA lookup failed for ${normalized}: HTTP ${error.status}`, {
            cause: error,
          });
        }
        if (error instanceof Error && error.message.includes('Unexpected token')) {
          throw new Error(`OA lookup returned malformed response for ${normalized}`, {
            cause: error,
          });
        }
        throw error;
      }

      return mapS3MetadataToOARecord(body as S3Metadata);
    },

    /**
     * Iterate over Open Access articles added or updated since a given date.
     * @param date - Start date in YYYY/MM/DD format for the PMC release date filter.
     * @param options - Optional end date to bound the search range.
     * @returns Async iterator yielding Open Access records matching the date range.
     */
    since: (date: string, options?: OAListOptions): AsyncIterableIterator<OARecord> => {
      const eutils = this.eutils;
      const clientConfig = this._clientConfig;
      return (async function* () {
        const until = options?.until ?? '3000';
        const term = `${date}:${until}[pmcrdat] AND (open_access[filter] OR author_manuscript[filter])`;

        let retstart = 0;
        let totalCount = -1;

        while (totalCount === -1 || retstart < totalCount) {
          const search = await eutils.esearch({
            db: 'pmc',
            term,
            retstart,
            retmax: ESEARCH_BATCH_SIZE,
          });

          if (totalCount === -1) {
            totalCount = search.count;
          }

          if (search.idList.length === 0) break;

          for (const id of search.idList) {
            const pmcid = id.startsWith('PMC') ? id : `PMC${id}`;
            const metadataUrl = `${S3_BASE_URL}/metadata/${pmcid}.1.json`;

            let body: unknown;
            try {
              body = await clientFetchJson<unknown>(metadataUrl, clientConfig);
            } catch {
              continue;
            }

            yield mapS3MetadataToOARecord(body as S3Metadata);
          }

          retstart += ESEARCH_BATCH_SIZE;
        }
      })();
    },
  };

  readonly oai = {
    /**
     * List OAI-PMH records from PMC, automatically following resumption tokens.
     * @param options - Harvesting parameters including date range, set, and metadata prefix.
     * @returns Async iterator yielding OAI-PMH records.
     */
    listRecords: (options: OAIListOptions): AsyncIterableIterator<OAIRecord> => {
      const config = this.config;
      const clientConfig = this._clientConfig;
      return (async function* () {
        const params = new URLSearchParams({
          verb: 'ListRecords',
          metadataPrefix: options.metadataPrefix ?? 'pmc',
          tool: config.tool,
          email: config.email,
        });
        if (options.from) params.set('from', options.from);
        if (options.until) params.set('until', options.until);
        if (options.set) params.set('set', options.set);

        let url: string | undefined = `${OAI_BASE_URL}?${params.toString()}`;

        while (url) {
          let xml: string;
          try {
            xml = await clientFetchText(url, clientConfig);
          } catch (error: unknown) {
            if (isHttpError(error)) {
              throw new Error(`OAI-PMH ListRecords failed: HTTP ${error.status}`, { cause: error });
            }
            throw error;
          }

          const errorBlock = readBlock(xml, 'error');
          if (errorBlock) break;

          const listRecordsXml = readBlock(xml, 'ListRecords');
          if (!listRecordsXml) break;

          const records = readAllBlocks(listRecordsXml, 'record');
          for (const recordXml of records) {
            yield parseOAIRecordXml(recordXml);
          }

          const resumptionToken = readTag(listRecordsXml, 'resumptionToken');
          if (!resumptionToken) break;

          const resumptionParams = new URLSearchParams({
            verb: 'ListRecords',
            resumptionToken,
            tool: config.tool,
            email: config.email,
          });
          url = `${OAI_BASE_URL}?${resumptionParams.toString()}`;
        }
      })();
    },

    /**
     * Fetch a single OAI-PMH record for a PMC article.
     * @param pmcid - PMC identifier (with or without the "PMC" prefix).
     * @param metadataPrefix - OAI-PMH metadata format (defaults to "pmc").
     * @returns The OAI-PMH record including header and metadata XML.
     */
    getRecord: async (pmcid: string, metadataPrefix?: string): Promise<OAIRecord> => {
      const numeric = numericPmcid(pmcid);
      const identifier = `oai:pubmedcentral.nih.gov:${numeric}`;
      const params = new URLSearchParams({
        verb: 'GetRecord',
        identifier,
        metadataPrefix: metadataPrefix ?? 'pmc',
        tool: this.config.tool,
        email: this.config.email,
      });

      let xml: string;
      try {
        xml = await clientFetchText(`${OAI_BASE_URL}?${params.toString()}`, this._clientConfig);
      } catch (error: unknown) {
        if (isHttpError(error)) {
          throw new Error(`OAI-PMH GetRecord failed for ${pmcid}: HTTP ${error.status}`, {
            cause: error,
          });
        }
        throw error;
      }

      const errorBlock = readBlock(xml, 'error');
      if (errorBlock) {
        throw new Error(`OAI-PMH error for ${pmcid}: ${errorBlock}`);
      }

      const getRecordXml = readBlock(xml, 'GetRecord');
      if (!getRecordXml) {
        throw new Error(`No record found for ${pmcid}`);
      }

      const recordXml = readBlock(getRecordXml, 'record');
      if (!recordXml) {
        throw new Error(`No record found for ${pmcid}`);
      }

      return parseOAIRecordXml(recordXml);
    },
  };
}
