import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const MCP_PACKAGE_DIR = resolve(import.meta.dirname, '..', 'packages', 'http-mcp');
const SERVER_PATH = resolve(MCP_PACKAGE_DIR, 'dist', 'index.js');

describe('MCP Server E2E', () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: 'node',
      args: [SERVER_PATH],
      cwd: MCP_PACKAGE_DIR,
      env: {
        ...process.env,
        NCBI_API_KEY: process.env['NCBI_API_KEY'] ?? '',
      },
    });
    client = new Client({ name: 'ncbijs-e2e', version: '1.0.0' });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client.close();
  });

  function textContent(result: Awaited<ReturnType<typeof client.callTool>>): string {
    const { content } = result as { content: Array<{ type: string; text: string }> };
    const first = content[0];
    if (first === undefined || first.type !== 'text') {
      throw new Error('Expected text content');
    }
    return first.text;
  }

  it('should list all 29 tools', async () => {
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(29);
    const names = tools.map((tool) => tool.name).sort();
    expect(names).toContain('search-pubmed');
    expect(names).toContain('get-full-text');
    expect(names).toContain('find-entity');
    expect(names).toContain('convert-ids');
    expect(names).toContain('get-citation');
    expect(names).toContain('mesh-lookup');
    expect(names).toContain('mesh-sparql');
    expect(names).toContain('search-gene');
    expect(names).toContain('lookup-taxonomy');
    expect(names).toContain('search-genome');
    expect(names).toContain('blast-search');
    expect(names).toContain('lookup-variant');
    expect(names).toContain('search-clinvar');
    expect(names).toContain('search-compound');
    expect(names).toContain('lookup-refsnp');
    expect(names).toContain('lookup-frequency');
    expect(names).toContain('search-gene-by-compound');
    expect(names).toContain('dataset-catalog');
    expect(names).toContain('citation-metrics');
    expect(names).toContain('citation-graph');
    expect(names).toContain('drug-lookup');
    expect(names).toContain('drug-interaction');
    expect(names).toContain('search-litvar');
  });

  it('should search PubMed', async () => {
    const result = await client.callTool({
      name: 'search-pubmed',
      arguments: { query: 'CRISPR', maxResults: 3 },
    });

    const articles = JSON.parse(textContent(result)) as Array<{ pmid: string; title: string }>;
    expect(articles.length).toBeGreaterThan(0);
    expect(articles.length).toBeLessThanOrEqual(3);
    expect(articles[0]!.pmid).toBeTruthy();
    expect(articles[0]!.title).toBeTruthy();
  });

  it('should get related articles', async () => {
    const result = await client.callTool({
      name: 'search-related',
      arguments: { pmid: '33533846' },
    });

    const related = JSON.parse(textContent(result)) as Array<unknown>;
    expect(related.length).toBeGreaterThan(0);
  });

  it('should get full text from PMC', async () => {
    const result = await client.callTool({
      name: 'get-full-text',
      arguments: { pmcid: 'PMC7886120' },
    });

    const markdown = textContent(result);
    expect(markdown).toContain('PMC7886120');
    expect(markdown).toContain('License:');
    expect(markdown.length).toBeGreaterThan(100);
  });

  it('should get full text chunks from PMC', async () => {
    const result = await client.callTool({
      name: 'get-full-text-chunks',
      arguments: { pmcid: 'PMC7886120', maxTokens: 256 },
    });

    const chunks = JSON.parse(textContent(result)) as Array<{ section: string; text: string }>;
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]!.text).toBeTruthy();
  });

  it('should find a biomedical entity', async () => {
    const result = await client.callTool({
      name: 'find-entity',
      arguments: { query: 'BRCA1', entityType: 'gene' },
    });

    const entities = JSON.parse(textContent(result)) as Array<{ name: string }>;
    expect(entities.length).toBeGreaterThan(0);
  });

  it('should annotate text', async () => {
    const result = await client.callTool({
      name: 'annotate-text',
      arguments: { text: 'BRCA1 is associated with breast cancer' },
    });

    const annotation = textContent(result);
    expect(annotation.length).toBeGreaterThan(0);
  });

  it('should convert article IDs', async () => {
    const result = await client.callTool({
      name: 'convert-ids',
      arguments: { ids: ['17284678'] },
    });

    const converted = JSON.parse(textContent(result)) as Array<{ pmid: string; pmcid: string }>;
    expect(converted).toHaveLength(1);
    expect(converted[0]!.pmid).toBe('17284678');
    expect(converted[0]!.pmcid).toBeTruthy();
  });

  it('should get a citation', async () => {
    const result = await client.callTool({
      name: 'get-citation',
      arguments: { pmid: '33533846', format: 'ris' },
    });

    const ris = textContent(result);
    expect(ris).toContain('TY  -');
  });

  it('should look up a MeSH term', async () => {
    const result = await client.callTool({
      name: 'mesh-lookup',
      arguments: { term: 'Neoplasms' },
    });

    const matches = JSON.parse(textContent(result)) as Array<{ label: string }>;
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should search genes', async () => {
    const result = await client.callTool({
      name: 'search-gene',
      arguments: { geneIds: [672] },
    });

    const reports = JSON.parse(textContent(result)) as Array<{ gene: { geneId: number } }>;
    expect(reports.length).toBeGreaterThan(0);
  });

  it('should look up taxonomy', async () => {
    const result = await client.callTool({
      name: 'lookup-taxonomy',
      arguments: { taxons: [9606] },
    });

    expect(result.isError).not.toBe(true);
    const text = textContent(result);
    const reports = JSON.parse(text) as Array<unknown>;
    expect(reports).toBeInstanceOf(Array);
  });

  it('should look up a variant', async () => {
    const result = await client.callTool({
      name: 'lookup-variant',
      arguments: { rsIds: [7412] },
    });

    const reports = JSON.parse(textContent(result)) as Array<{ rsId: number }>;
    expect(reports.length).toBeGreaterThan(0);
  });

  it('should search ClinVar', async () => {
    const result = await client.callTool({
      name: 'search-clinvar',
      arguments: { term: 'BRCA1', retmax: 3 },
    });

    const text = textContent(result);
    expect(text.length).toBeGreaterThan(0);
    expect(result.isError).not.toBe(true);
  });

  it('should look up a RefSNP variant', async () => {
    const result = await client.callTool({
      name: 'lookup-refsnp',
      arguments: { rsid: 7412 },
    });

    const report = JSON.parse(textContent(result)) as { rsid: number };
    expect(report.rsid).toBe(7412);
  });

  it('should look up variant frequency', async () => {
    const result = await client.callTool({
      name: 'lookup-frequency',
      arguments: { rsid: 7412 },
    });

    const text = textContent(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it('should get citation metrics', async () => {
    const result = await client.callTool({
      name: 'citation-metrics',
      arguments: { pmids: [33533846] },
    });

    const pubs = JSON.parse(textContent(result)) as Array<{ pmid: number }>;
    expect(pubs.length).toBeGreaterThan(0);
    expect(pubs[0]!.pmid).toBe(33533846);
  });

  it('should look up a drug by fuzzy name', async () => {
    const result = await client.callTool({
      name: 'drug-lookup',
      arguments: { name: 'aspirin', maxResults: 5 },
    });

    const candidates = JSON.parse(textContent(result)) as Array<{ name: string }>;
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('should search LitVar for a variant', async () => {
    const result = await client.callTool({
      name: 'search-litvar',
      arguments: { rsid: 'rs328' },
    });

    const text = textContent(result);
    expect(text.length).toBeGreaterThan(0);
  });

  it('should search PubChem compound', async () => {
    const result = await client.callTool({
      name: 'search-compound',
      arguments: { name: 'aspirin' },
    });

    const data = JSON.parse(textContent(result)) as {
      properties: { molecularFormula: string };
    };
    expect(data.properties.molecularFormula).toBeTruthy();
  });
});
