#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { Blast } from '@ncbijs/blast';
import { ClinVar } from '@ncbijs/clinvar';
import { Datasets } from '@ncbijs/datasets';
import { PMC } from '@ncbijs/pmc';
import { PubChem } from '@ncbijs/pubchem';
import { PubMed } from '@ncbijs/pubmed';
import { Snp } from '@ncbijs/snp';

import { registerAllTools } from './register-tools';

const SERVER_NAME = 'ncbijs';
const SERVER_VERSION = '0.0.1';

const ncbiConfig = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-mcp',
  email: process.env['NCBI_EMAIL'] ?? 'ncbijs-mcp@users.noreply.github.com',
  apiKey: process.env['NCBI_API_KEY'],
};

let pubmed: PubMed | undefined;
let pmc: PMC | undefined;
let datasets: Datasets | undefined;
let blast: Blast | undefined;
let snp: Snp | undefined;
let clinvar: ClinVar | undefined;
let pubchem: PubChem | undefined;

function getPubmed(): PubMed {
  if (pubmed === undefined) {
    pubmed = new PubMed(ncbiConfig);
  }
  return pubmed;
}

function getPmc(): PMC {
  if (pmc === undefined) {
    pmc = new PMC(ncbiConfig);
  }
  return pmc;
}

function getDatasets(): Datasets {
  if (datasets === undefined) {
    datasets = new Datasets({
      ...(ncbiConfig.apiKey !== undefined && { apiKey: ncbiConfig.apiKey }),
    });
  }
  return datasets;
}

function getBlast(): Blast {
  if (blast === undefined) {
    blast = new Blast();
  }
  return blast;
}

function getSnp(): Snp {
  if (snp === undefined) {
    snp = new Snp();
  }
  return snp;
}

function getClinVar(): ClinVar {
  if (clinvar === undefined) {
    clinvar = new ClinVar({
      ...(ncbiConfig.apiKey !== undefined && { apiKey: ncbiConfig.apiKey }),
      tool: ncbiConfig.tool,
      email: ncbiConfig.email,
    });
  }
  return clinvar;
}

function getPubChem(): PubChem {
  if (pubchem === undefined) {
    pubchem = new PubChem();
  }
  return pubchem;
}

const server = new McpServer(
  { name: SERVER_NAME, version: SERVER_VERSION },
  {
    instructions:
      'NCBI biomedical tools. Search PubMed (37M+ articles), fetch PMC full text, ' +
      'extract named entities via PubTator3, convert article IDs, get formatted citations, ' +
      'query the MeSH vocabulary, look up genes and genomes via NCBI Datasets API v2, ' +
      'run BLAST sequence alignments, look up SNP variants from dbSNP, search ClinVar ' +
      'for clinical variant data, and search PubChem for chemical compounds. ' +
      'Set NCBI_API_KEY env var for higher rate limits.',
  },
);

registerAllTools(server, {
  getPubmed,
  getPmc,
  getDatasets,
  getBlast,
  getSnp,
  getClinVar,
  getPubChem,
});

const transport = new StdioServerTransport();
await server.connect(transport);
