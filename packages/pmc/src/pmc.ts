import { EUtils } from '@ncbijs/eutils';
import type { Chunk, ChunkOptions, JATSArticle } from '@ncbijs/jats';
import { parseJATS, toChunks, toMarkdown, toPlainText } from '@ncbijs/jats';

import type {
  FullTextArticle,
  OAIListOptions,
  OAIRecord,
  OALink,
  OAListOptions,
  OARecord,
  PMCConfig,
} from './interfaces/pmc.interface';
import {
  readAllBlocks,
  readAllBlocksWithAttributes,
  readAttribute,
  readBlock,
  readTag,
} from '@ncbijs/xml';

const OA_BASE_URL = 'https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi';
const OAI_BASE_URL = 'https://www.ncbi.nlm.nih.gov/pmc/oai/oai.cgi';

function normalizePmcid(pmcid: string): string {
  return pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`;
}

function numericPmcid(pmcid: string): string {
  return pmcid.startsWith('PMC') ? pmcid.slice(3) : pmcid;
}

function toJATSArticle(article: FullTextArticle): JATSArticle {
  return {
    front: article.front,
    body: article.body,
    back: article.back,
  };
}

export function pmcToMarkdown(article: FullTextArticle): string {
  return toMarkdown(toJATSArticle(article));
}

export function pmcToPlainText(article: FullTextArticle): string {
  return toPlainText(toJATSArticle(article));
}

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

function parseOARecord(recordXml: string, attributes: Readonly<Record<string, string>>): OARecord {
  const pmcid = attributes['id'] ?? '';
  const citation = attributes['citation'] ?? '';
  const license = attributes['license'] ?? '';
  const retracted = attributes['retracted'] === 'yes';

  const linkEntries = readAllBlocksWithAttributes(recordXml, 'link');
  const links: Array<OALink> = linkEntries.map((entry) => ({
    format: (entry.attributes['format'] as 'tgz' | 'pdf') ?? 'tgz',
    href: entry.attributes['href'] ?? '',
    updated: entry.attributes['updated'] ?? '',
  }));

  return { pmcid, citation, license, retracted, links };
}

function parseOAIRecordXml(recordXml: string): OAIRecord {
  const headerXml = readBlock(recordXml, 'header') ?? '';
  const identifier = readTag(headerXml, 'identifier') ?? '';
  const datestamp = readTag(headerXml, 'datestamp') ?? '';
  const setSpec = readTag(headerXml, 'setSpec') ?? '';
  const metadata = readBlock(recordXml, 'metadata') ?? '';

  return { identifier, datestamp, setSpec, metadata };
}

export class PMC {
  private readonly eutils: EUtils;
  private readonly config: PMCConfig;

  constructor(config: PMCConfig) {
    this.config = config;
    this.eutils = new EUtils({
      tool: config.tool,
      email: config.email,
      apiKey: config.apiKey,
      maxRetries: config.maxRetries,
    });
  }

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
    lookup: async (pmcid: string): Promise<OARecord> => {
      const normalized = normalizePmcid(pmcid);
      const params = new URLSearchParams({
        id: normalized,
        tool: this.config.tool,
        email: this.config.email,
      });
      const response = await fetch(`${OA_BASE_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`OA Service lookup failed for ${normalized}: HTTP ${response.status}`);
      }

      const xml = await response.text();

      const errorBlock = readBlock(xml, 'error');
      if (errorBlock) {
        throw new Error(`OA Service error for ${normalized}: ${errorBlock}`);
      }

      const recordEntries = readAllBlocksWithAttributes(xml, 'record');
      const entry = recordEntries[0];
      if (!entry) {
        throw new Error(`No OA record found for ${normalized}`);
      }

      return parseOARecord(entry.content, entry.attributes);
    },

    since: (date: string, options?: OAListOptions): AsyncIterableIterator<OARecord> => {
      const config = this.config;
      return (async function* () {
        const params = new URLSearchParams({
          from: date,
          tool: config.tool,
          email: config.email,
        });
        if (options?.until) params.set('until', options.until);
        if (options?.format) params.set('format', options.format);

        let url: string | undefined = `${OA_BASE_URL}?${params.toString()}`;

        while (url) {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`OA Service since failed: HTTP ${response.status}`);
          }

          const xml = await response.text();
          const recordEntries = readAllBlocksWithAttributes(xml, 'record');

          for (const entry of recordEntries) {
            yield parseOARecord(entry.content, entry.attributes);
          }

          const resumptionBlock = readBlock(xml, 'resumption');
          if (!resumptionBlock) break;

          const resumptionLink = readAttribute(resumptionBlock, 'link', 'href');
          url = resumptionLink;
        }
      })();
    },
  };

  readonly oai = {
    listRecords: (options: OAIListOptions): AsyncIterableIterator<OAIRecord> => {
      const config = this.config;
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
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`OAI-PMH ListRecords failed: HTTP ${response.status}`);
          }

          const xml = await response.text();

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

      const response = await fetch(`${OAI_BASE_URL}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`OAI-PMH GetRecord failed for ${pmcid}: HTTP ${response.status}`);
      }

      const xml = await response.text();

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
