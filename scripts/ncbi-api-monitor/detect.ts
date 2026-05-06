import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// ─── Load .env ──────────────────────────────────────

if (!process.env['VITEST']) {
  try {
    const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional — env vars can be set directly (e.g. CI secrets)
  }
}

// ─── Types ───────────────────────────────────────────

export type ChangeSeverity = 'high' | 'medium' | 'low';

export type ChangeCategory = 'spec' | 'version' | 'einfo' | 'rss' | 'release' | 'header' | 'schema';

export interface Change {
  readonly category: ChangeCategory;
  readonly severity: ChangeSeverity;
  readonly description: string;
  readonly affectedPackages: ReadonlyArray<string>;
}

export interface DetectionReport {
  readonly date: string;
  readonly hasChanges: boolean;
  readonly summary: string;
  readonly changes: ReadonlyArray<Change>;
  readonly errors: ReadonlyArray<string>;
}

export interface SpecHashEntry {
  readonly hash: string;
  readonly version: string;
}

export interface EinfoEntry {
  readonly lastupdate: string;
  readonly dbbuild: string;
}

export interface LastCheckState {
  readonly date: string;
  readonly lastRssEntry: string;
  readonly lastGitHubRelease: string;
}

// ─── Configuration ───────────────────────────────────

const FETCH_TIMEOUT_MS = 30_000;
const NCBI_API_KEY = process.env['NCBI_API_KEY'] ?? '';
const RATE_LIMIT_BATCH_SIZE = NCBI_API_KEY ? 9 : 2;
const RATE_LIMIT_DELAY_MS = process.env['VITEST'] ? 0 : 1100;

interface EndpointConfig {
  readonly key: string;
  readonly url: string;
  readonly packages: ReadonlyArray<string>;
}

interface VersionEndpointConfig extends EndpointConfig {
  readonly fields: ReadonlyArray<string>;
  /** Subset of `fields` whose change indicates an API contract change (MEDIUM). Other field changes are LOW (data-refresh). */
  readonly apiContractFields: ReadonlyArray<string>;
}

interface ProbeConfig {
  readonly url: string;
  readonly packages: ReadonlyArray<string>;
}

const SPEC_ENDPOINTS: ReadonlyArray<EndpointConfig> = [
  {
    key: 'datasets',
    url: 'https://www.ncbi.nlm.nih.gov/datasets/docs/v2/openapi3/openapi3.docs.yaml',
    packages: ['@ncbijs/datasets'],
  },
  {
    key: 'variation',
    url: 'https://api.ncbi.nlm.nih.gov/variation/v0/var_service.yaml',
    packages: ['@ncbijs/snp'],
  },
  {
    key: 'mesh',
    url: 'https://id.nlm.nih.gov/mesh/swagger/swagger.json',
    packages: ['@ncbijs/mesh'],
  },
  {
    key: 'clinicaltrials',
    url: 'https://clinicaltrials.gov/data-api/api',
    packages: ['@ncbijs/clinical-trials'],
  },
];

const VERSION_ENDPOINTS: ReadonlyArray<VersionEndpointConfig> = [
  {
    key: 'clinicaltrials',
    url: 'https://clinicaltrials.gov/api/v2/version',
    fields: ['apiVersion', 'dataTimestamp'],
    apiContractFields: ['apiVersion'],
    packages: ['@ncbijs/clinical-trials'],
  },
  {
    key: 'rxnorm',
    url: 'https://rxnav.nlm.nih.gov/REST/version.json',
    fields: ['version', 'apiVersion'],
    apiContractFields: ['apiVersion'],
    packages: ['@ncbijs/rxnorm'],
  },
];

const DEPRECATION_PROBES: ReadonlyArray<ProbeConfig> = [
  { url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi', packages: ['@ncbijs/eutils'] },
  { url: 'https://api.ncbi.nlm.nih.gov/datasets/v2/gene/id/1', packages: ['@ncbijs/datasets'] },
  { url: 'https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/334', packages: ['@ncbijs/snp'] },
  {
    url: 'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids=PMC3531190&format=json',
    packages: ['@ncbijs/id-converter'],
  },
  {
    url: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula/JSON',
    packages: ['@ncbijs/pubchem'],
  },
  {
    url: 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/pubtator?pmids=33533846',
    packages: ['@ncbijs/pubtator'],
  },
  { url: 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi?CMD=Info', packages: ['@ncbijs/blast'] },
  {
    url: 'https://id.nlm.nih.gov/mesh/lookup/descriptor?label=Neoplasms&match=exact&limit=1',
    packages: ['@ncbijs/mesh'],
  },
  {
    url: 'https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/?id=33533846&format=csl',
    packages: ['@ncbijs/cite'],
  },
  {
    url: 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=diabetes&maxList=1',
    packages: ['@ncbijs/clinical-tables'],
  },
  { url: 'https://icite.od.nih.gov/api/pubs/33533846', packages: ['@ncbijs/icite'] },
  { url: 'https://rxnav.nlm.nih.gov/REST/rxcui.json?name=aspirin', packages: ['@ncbijs/rxnorm'] },
  {
    url: 'https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/autocomplete/?query=rs328',
    packages: ['@ncbijs/litvar'],
  },
  {
    url: 'https://clinicaltrials.gov/api/v2/studies?query.term=aspirin&pageSize=1',
    packages: ['@ncbijs/clinical-trials'],
  },
  {
    url: 'https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name=aspirin',
    packages: ['@ncbijs/dailymed'],
  },
  {
    url: 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/33533846/unicode',
    packages: ['@ncbijs/bioc'],
  },
  { url: 'https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/?verb=Identify', packages: ['@ncbijs/pmc'] },
];

const SCHEMA_ENDPOINTS: ReadonlyArray<EndpointConfig> = [
  {
    key: 'eutils-pubmed',
    url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=33533846&retmode=json',
    packages: ['@ncbijs/eutils', '@ncbijs/pubmed'],
  },
  {
    key: 'eutils-clinvar',
    url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=7105&retmode=json',
    packages: ['@ncbijs/eutils', '@ncbijs/clinvar'],
  },
  {
    key: 'eutils-cdd',
    url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=cdd&id=223044&retmode=json',
    packages: ['@ncbijs/eutils', '@ncbijs/cdd'],
  },
  {
    key: 'pubchem',
    url: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula,MolecularWeight,IUPACName/JSON',
    packages: ['@ncbijs/pubchem'],
  },
  {
    key: 'icite',
    url: 'https://icite.od.nih.gov/api/pubs/33533846',
    packages: ['@ncbijs/icite'],
  },
  {
    key: 'pubtator',
    url: 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/biocjson?pmids=33533846',
    packages: ['@ncbijs/pubtator'],
  },
  {
    key: 'rxnorm',
    url: 'https://rxnav.nlm.nih.gov/REST/rxcui/1191/properties.json',
    packages: ['@ncbijs/rxnorm'],
  },
  {
    key: 'dailymed',
    url: 'https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=aspirin&pagesize=1',
    packages: ['@ncbijs/dailymed'],
  },
  {
    key: 'clinical-tables',
    url: 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=diabetes&maxList=1',
    packages: ['@ncbijs/clinical-tables'],
  },
];

const EINFO_DATABASES: ReadonlyArray<string> = [
  'pubmed',
  'pmc',
  'snp',
  'clinvar',
  'gene',
  'protein',
  'nucleotide',
  'cdd',
  'medgen',
  'gtr',
  'geo',
  'sra',
  'structure',
  'omim',
  'dbvar',
  'books',
  'nlmcatalog',
];

const EINFO_PACKAGE_MAP: Readonly<Record<string, string>> = {
  pubmed: '@ncbijs/pubmed',
  pmc: '@ncbijs/pmc',
  snp: '@ncbijs/snp',
  clinvar: '@ncbijs/clinvar',
  gene: '@ncbijs/datasets',
  protein: '@ncbijs/protein',
  nucleotide: '@ncbijs/nucleotide',
  cdd: '@ncbijs/cdd',
  medgen: '@ncbijs/medgen',
  gtr: '@ncbijs/gtr',
  geo: '@ncbijs/geo',
  sra: '@ncbijs/sra',
  structure: '@ncbijs/structure',
  omim: '@ncbijs/omim',
  dbvar: '@ncbijs/dbvar',
  books: '@ncbijs/books',
  nlmcatalog: '@ncbijs/nlm-catalog',
};

const RSS_KEYWORDS: ReadonlyArray<string> = [
  'API',
  'E-utilities',
  'deprecated',
  'sunset',
  'breaking',
  'update',
  'change',
  'PMC',
  'PubMed',
  'Datasets',
  'PubChem',
  'BLAST',
  'ClinVar',
  'dbSNP',
  'RxNorm',
  'DailyMed',
  'RxClass',
  'LitVar',
  'MeSH',
  'iCite',
];

const DEPRECATION_HEADER_NAMES: ReadonlyArray<string> = [
  'sunset',
  'deprecation',
  'warning',
  'x-api-warn',
];

// ─── Helpers ─────────────────────────────────────────

export function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function appendApiKey(url: string): string {
  if (!NCBI_API_KEY) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}api_key=${NCBI_API_KEY}`;
}

async function readStateFile<T>(stateDir: string, filename: string): Promise<T | undefined> {
  try {
    const content = await readFile(join(stateDir, filename), 'utf-8');
    const parsed: T = JSON.parse(content);
    return parsed;
  } catch {
    return undefined;
  }
}

async function writeStateFile(stateDir: string, filename: string, data: unknown): Promise<void> {
  await mkdir(stateDir, { recursive: true });
  await writeFile(join(stateDir, filename), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

async function settleInBatches<TItem, TResult>(
  items: ReadonlyArray<TItem>,
  fetcher: (item: TItem) => Promise<TResult>,
): Promise<Array<PromiseSettledResult<TResult>>> {
  const allResults: Array<PromiseSettledResult<TResult>> = [];
  for (let i = 0; i < items.length; i += RATE_LIMIT_BATCH_SIZE) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }
    const batch = items.slice(i, i + RATE_LIMIT_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(fetcher));
    allResults.push(...results);
  }
  return allResults;
}

function extractSpecVersion(content: string): string {
  try {
    const parsed: Record<string, Record<string, string>> = JSON.parse(content);
    return parsed['info']?.['version'] ?? 'unknown';
  } catch {
    // noop
  }
  const match = content.match(/info:[\s\S]*?version:\s*['"]?([^\s'"]+)/);
  return match?.[1] ?? 'unknown';
}

export function extractJsonKeys(
  value: unknown,
  maxDepth = 4,
): Record<string, ReadonlyArray<string>> {
  const result: Record<string, Array<string>> = {};

  function walk(current: unknown, depth: number): void {
    if (depth > maxDepth || current === null || current === undefined) {
      return;
    }
    if (typeof current !== 'object') {
      return;
    }
    if (Array.isArray(current)) {
      for (const element of current) {
        walk(element, depth);
      }
      return;
    }
    const keys = Object.keys(current);
    const depthKey = `depth${String(depth)}`;
    const existing = result[depthKey] ?? [];
    result[depthKey] = existing;
    for (const key of keys) {
      if (!existing.includes(key)) {
        existing.push(key);
      }
    }
    const record = current as Record<string, unknown>;
    for (const key of keys) {
      walk(record[key], depth + 1);
    }
  }

  walk(value, 0);
  for (const depthKey of Object.keys(result)) {
    const sorted = result[depthKey];
    if (sorted) {
      sorted.sort();
    }
  }
  return result;
}

function extractXmlTag(xml: string, tagName: string): string | undefined {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`);
  const match = xml.match(pattern);
  return match?.[1]?.trim();
}

function splitXmlElements(xml: string, tagName: string): ReadonlyArray<string> {
  const pattern = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?</${tagName}>`, 'g');
  return xml.match(pattern) ?? [];
}

// ─── Check Functions ─────────────────────────────────

export async function checkSpecHashes(currentState: Record<string, SpecHashEntry>): Promise<{
  readonly changes: Array<Change>;
  readonly state: Record<string, SpecHashEntry>;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];
  const state: Record<string, SpecHashEntry> = { ...currentState };

  const results = await settleInBatches(SPEC_ENDPOINTS, async (endpoint) => {
    const response = await fetchWithTimeout(endpoint.url);
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} from ${endpoint.url}`);
    }
    const body = await response.text();
    const hash = sha256(body);
    const version = extractSpecVersion(body);
    return { endpoint, hash, version };
  });

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(`Spec fetch failed: ${String(result.reason)}`);
      continue;
    }
    const { endpoint, hash, version } = result.value;
    const previous = currentState[endpoint.key];
    if (!previous) {
      state[endpoint.key] = { hash, version };
      continue;
    }
    if (previous.hash !== hash) {
      changes.push({
        category: 'spec',
        severity: 'high',
        description: `${endpoint.key} OpenAPI spec changed (version: ${previous.version} -> ${version})`,
        affectedPackages: [...endpoint.packages],
      });
    }
    state[endpoint.key] = { hash, version };
  }

  return { changes, state, errors };
}

export async function checkVersionEndpoints(
  currentState: Record<string, Record<string, string>>,
): Promise<{
  readonly changes: Array<Change>;
  readonly state: Record<string, Record<string, string>>;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];
  const state: Record<string, Record<string, string>> = { ...currentState };

  const results = await settleInBatches(VERSION_ENDPOINTS, async (endpoint) => {
    const response = await fetchWithTimeout(endpoint.url);
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} from ${endpoint.url}`);
    }
    const text = await response.text();
    const body: Record<string, string> = JSON.parse(text);
    return { endpoint, body };
  });

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(`Version endpoint failed: ${String(result.reason)}`);
      continue;
    }
    const { endpoint, body } = result.value;
    const previous = currentState[endpoint.key];
    const currentValues: Record<string, string> = {};

    for (const field of endpoint.fields) {
      const fieldValue = body[field];
      if (fieldValue !== undefined) {
        currentValues[field] = String(fieldValue);
      }
    }

    if (!previous) {
      state[endpoint.key] = currentValues;
      continue;
    }

    const changedFields: Array<string> = [];
    for (const field of endpoint.fields) {
      const oldValue = previous[field];
      const newValue = currentValues[field];
      if (oldValue !== undefined && newValue !== undefined && oldValue !== newValue) {
        changedFields.push(`${field}: ${oldValue} -> ${newValue}`);
      }
    }

    if (changedFields.length > 0) {
      const contractChanged = endpoint.apiContractFields.some(
        (field) => previous[field] !== currentValues[field],
      );
      changes.push({
        category: 'version',
        severity: contractChanged ? 'medium' : 'low',
        description: `${endpoint.key} version bumped (${changedFields.join(', ')})`,
        affectedPackages: [...endpoint.packages],
      });
    }
    state[endpoint.key] = currentValues;
  }

  return { changes, state, errors };
}

export async function checkDeprecationHeaders(): Promise<{
  readonly changes: Array<Change>;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];

  const results = await settleInBatches(DEPRECATION_PROBES, async (probe) => {
    const fetchUrl = probe.url.includes('eutils.ncbi.nlm.nih.gov')
      ? appendApiKey(probe.url)
      : probe.url;
    const response = await fetchWithTimeout(fetchUrl);
    const foundHeaders: Array<{ readonly name: string; readonly value: string }> = [];
    for (const headerName of DEPRECATION_HEADER_NAMES) {
      const headerValue = response.headers.get(headerName);
      if (headerValue) {
        foundHeaders.push({ name: headerName, value: headerValue });
      }
    }
    return { probe, foundHeaders };
  });

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(`Deprecation probe failed: ${String(result.reason)}`);
      continue;
    }
    const { probe, foundHeaders } = result.value;
    for (const header of foundHeaders) {
      changes.push({
        category: 'header',
        severity: 'high',
        description: `${header.name} header found on ${probe.url}: "${header.value}"`,
        affectedPackages: [...probe.packages],
      });
    }
  }

  return { changes, errors };
}

export async function checkSchemaFingerprints(
  currentState: Record<string, Record<string, ReadonlyArray<string>>>,
): Promise<{
  readonly changes: Array<Change>;
  readonly state: Record<string, Record<string, ReadonlyArray<string>>>;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];
  const state: Record<string, Record<string, ReadonlyArray<string>>> = { ...currentState };

  const results = await settleInBatches(SCHEMA_ENDPOINTS, async (endpoint) => {
    const fetchUrl = endpoint.url.includes('eutils.ncbi.nlm.nih.gov')
      ? appendApiKey(endpoint.url)
      : endpoint.url;
    const response = await fetchWithTimeout(fetchUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} from ${endpoint.url}`);
    }
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body) {
      throw new Error(`Error response from ${endpoint.url}: ${JSON.stringify(body)}`);
    }
    const fingerprint = extractJsonKeys(body);
    return { endpoint, fingerprint };
  });

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(`Schema fetch failed: ${String(result.reason)}`);
      continue;
    }
    const { endpoint, fingerprint } = result.value;
    const previous = currentState[endpoint.key];

    if (!previous) {
      state[endpoint.key] = fingerprint;
      continue;
    }

    const addedKeys: Array<string> = [];
    const removedKeys: Array<string> = [];

    const allDepths = new Set([...Object.keys(previous), ...Object.keys(fingerprint)]);
    for (const depthKey of allDepths) {
      const oldKeys = new Set(previous[depthKey] ?? []);
      const newKeys = new Set(fingerprint[depthKey] ?? []);
      for (const key of newKeys) {
        if (!oldKeys.has(key)) {
          addedKeys.push(`${depthKey}.${key}`);
        }
      }
      for (const key of oldKeys) {
        if (!newKeys.has(key)) {
          removedKeys.push(`${depthKey}.${key}`);
        }
      }
    }

    if (removedKeys.length > 0) {
      changes.push({
        category: 'schema',
        severity: 'high',
        description: `${endpoint.key}: ${String(removedKeys.length)} keys removed (${removedKeys.join(', ')})`,
        affectedPackages: [...endpoint.packages],
      });
    }
    if (addedKeys.length > 0) {
      changes.push({
        category: 'schema',
        severity: 'low',
        description: `${endpoint.key}: ${String(addedKeys.length)} keys added (${addedKeys.join(', ')})`,
        affectedPackages: [...endpoint.packages],
      });
    }
    state[endpoint.key] = fingerprint;
  }

  return { changes, state, errors };
}

export async function checkRssFeed(lastRssEntry: string): Promise<{
  readonly changes: Array<Change>;
  readonly lastRssEntry: string;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];
  let updatedLastEntry = lastRssEntry;

  try {
    const response = await fetchWithTimeout('https://ncbiinsights.ncbi.nlm.nih.gov/feed/');
    const xml = await response.text();
    const items = splitXmlElements(xml, 'item');
    const cutoff = lastRssEntry ? new Date(lastRssEntry) : new Date(0);

    for (const item of items) {
      const title = extractXmlTag(item, 'title') ?? '';
      const pubDate = extractXmlTag(item, 'pubDate') ?? '';
      const link = extractXmlTag(item, 'link') ?? '';
      const itemDate = new Date(pubDate);

      if (isNaN(itemDate.getTime()) || itemDate <= cutoff) {
        continue;
      }

      const titleLower = title.toLowerCase();
      const matchesKeyword = RSS_KEYWORDS.some((keyword) =>
        titleLower.includes(keyword.toLowerCase()),
      );
      if (!matchesKeyword) {
        continue;
      }

      const isBreaking = ['deprecated', 'sunset', 'breaking', 'removed'].some((word) =>
        titleLower.includes(word),
      );

      changes.push({
        category: 'rss',
        severity: isBreaking ? 'medium' : 'low',
        description: `"${title}" (${pubDate}). Link: ${link}`,
        affectedPackages: [],
      });

      if (itemDate.toISOString() > updatedLastEntry) {
        updatedLastEntry = itemDate.toISOString();
      }
    }
  } catch (rssError) {
    errors.push(`RSS fetch failed: ${String(rssError)}`);
  }

  return { changes, lastRssEntry: updatedLastEntry, errors };
}

export async function checkGitHubReleases(lastRelease: string): Promise<{
  readonly changes: Array<Change>;
  readonly lastRelease: string;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];
  let updatedLastRelease = lastRelease;

  try {
    const response = await fetchWithTimeout('https://github.com/ncbi/datasets/releases.atom');
    const xml = await response.text();
    const entries = splitXmlElements(xml, 'entry');
    const cutoff = lastRelease ? new Date(lastRelease) : new Date(0);

    for (const entry of entries) {
      const title = extractXmlTag(entry, 'title') ?? '';
      const updated = extractXmlTag(entry, 'updated') ?? '';
      const entryDate = new Date(updated);

      if (isNaN(entryDate.getTime()) || entryDate <= cutoff) {
        continue;
      }

      changes.push({
        category: 'release',
        severity: 'low',
        description: `ncbi/datasets ${title} released (${updated})`,
        affectedPackages: ['@ncbijs/datasets'],
      });

      if (entryDate.toISOString() > updatedLastRelease) {
        updatedLastRelease = entryDate.toISOString();
      }
    }
  } catch (releaseError) {
    errors.push(`GitHub releases fetch failed: ${String(releaseError)}`);
  }

  return { changes, lastRelease: updatedLastRelease, errors };
}

export async function checkEinfoDatabases(currentState: Record<string, EinfoEntry>): Promise<{
  readonly changes: Array<Change>;
  readonly state: Record<string, EinfoEntry>;
  readonly errors: Array<string>;
}> {
  const changes: Array<Change> = [];
  const errors: Array<string> = [];
  const state: Record<string, EinfoEntry> = { ...currentState };

  const results = await settleInBatches(EINFO_DATABASES, async (database) => {
    const baseUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi?db=${database}&retmode=json`;
    const response = await fetchWithTimeout(appendApiKey(baseUrl));
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} from ${baseUrl}`);
    }
    const text = await response.text();
    const body: {
      readonly einforesult?: {
        readonly dbinfo?: ReadonlyArray<
          string | { readonly lastupdate?: string; readonly dbbuild?: string }
        >;
      };
    } = JSON.parse(text);
    const dbinfo = body.einforesult?.dbinfo?.[0];
    if (typeof dbinfo === 'string') {
      return { database, skipped: true as const };
    }
    if (!dbinfo?.dbbuild) {
      throw new Error(`Missing dbinfo for ${database}`);
    }
    return {
      database,
      skipped: false as const,
      lastupdate: dbinfo.lastupdate ?? '',
      dbbuild: dbinfo.dbbuild,
    };
  });

  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(`EInfo fetch failed: ${String(result.reason)}`);
      continue;
    }
    if (result.value.skipped) {
      continue;
    }
    const { database, lastupdate, dbbuild } = result.value;
    const previous = currentState[database];

    if (!previous) {
      state[database] = { lastupdate, dbbuild };
      continue;
    }

    if (previous.lastupdate !== lastupdate || previous.dbbuild !== dbbuild) {
      const packageName = EINFO_PACKAGE_MAP[database] ?? `@ncbijs/${database}`;
      changes.push({
        category: 'einfo',
        severity: 'low',
        description: `${database} database updated (${previous.dbbuild} -> ${dbbuild})`,
        affectedPackages: ['@ncbijs/eutils', packageName],
      });
    }
    state[database] = { lastupdate, dbbuild };
  }

  return { changes, state, errors };
}

// ─── Orchestrator ────────────────────────────────────

export async function detect(stateDir?: string): Promise<DetectionReport> {
  const dir = stateDir ?? join(process.cwd(), '.ncbi-check-updates');
  const allChanges: Array<Change> = [];
  const allErrors: Array<string> = [];

  const specState =
    (await readStateFile<Record<string, SpecHashEntry>>(dir, 'spec-hashes.json')) ?? {};
  const versionState =
    (await readStateFile<Record<string, Record<string, string>>>(dir, 'version-endpoints.json')) ??
    {};
  const schemaState =
    (await readStateFile<Record<string, Record<string, ReadonlyArray<string>>>>(
      dir,
      'schema-fingerprints.json',
    )) ?? {};
  const einfoState =
    (await readStateFile<Record<string, EinfoEntry>>(dir, 'einfo-state.json')) ?? {};
  const lastCheck =
    (await readStateFile<LastCheckState>(dir, 'last-check.json')) ??
    ({ date: '', lastRssEntry: '', lastGitHubRelease: '' } as const);

  const specResult = await checkSpecHashes(specState);
  allChanges.push(...specResult.changes);
  allErrors.push(...specResult.errors);

  const versionResult = await checkVersionEndpoints(versionState);
  allChanges.push(...versionResult.changes);
  allErrors.push(...versionResult.errors);

  const headerResult = await checkDeprecationHeaders();
  allChanges.push(...headerResult.changes);
  allErrors.push(...headerResult.errors);

  const schemaResult = await checkSchemaFingerprints(schemaState);
  allChanges.push(...schemaResult.changes);
  allErrors.push(...schemaResult.errors);

  const rssResult = await checkRssFeed(lastCheck.lastRssEntry);
  allChanges.push(...rssResult.changes);
  allErrors.push(...rssResult.errors);

  const releaseResult = await checkGitHubReleases(lastCheck.lastGitHubRelease);
  allChanges.push(...releaseResult.changes);
  allErrors.push(...releaseResult.errors);

  const einfoResult = await checkEinfoDatabases(einfoState);
  allChanges.push(...einfoResult.changes);
  allErrors.push(...einfoResult.errors);

  await writeStateFile(dir, 'spec-hashes.json', specResult.state);
  await writeStateFile(dir, 'version-endpoints.json', versionResult.state);
  await writeStateFile(dir, 'schema-fingerprints.json', schemaResult.state);
  await writeStateFile(dir, 'einfo-state.json', einfoResult.state);
  await writeStateFile(dir, 'last-check.json', {
    date: new Date().toISOString(),
    lastRssEntry: rssResult.lastRssEntry,
    lastGitHubRelease: releaseResult.lastRelease,
  });

  const highCount = allChanges.filter((change) => change.severity === 'high').length;
  const mediumCount = allChanges.filter((change) => change.severity === 'medium').length;
  const lowCount = allChanges.filter((change) => change.severity === 'low').length;

  let summary: string;
  if (allChanges.length === 0) {
    summary = 'No changes detected. All API signals match stored baselines.';
  } else {
    const parts: Array<string> = [];
    if (highCount > 0) {
      parts.push(`${String(highCount)} HIGH`);
    }
    if (mediumCount > 0) {
      parts.push(`${String(mediumCount)} MEDIUM`);
    }
    if (lowCount > 0) {
      parts.push(`${String(lowCount)} LOW`);
    }
    summary = `${String(allChanges.length)} changes detected: ${parts.join(', ')}`;
  }

  return {
    date: new Date().toISOString(),
    hasChanges: allChanges.length > 0,
    summary,
    changes: allChanges,
    errors: allErrors,
  };
}

// ─── CLI Entry Point ─────────────────────────────────

if (!process.env['VITEST']) {
  const report = await detect();
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}
