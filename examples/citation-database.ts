// Multi-package workflow: Search PubMed for articles, fetch structured CSL-JSON
// metadata and pre-rendered citations, then cross-reference all IDs (PMID/PMCID/DOI).
//
// Packages: @ncbijs/pubmed, @ncbijs/cite, @ncbijs/id-converter

import { Cite } from '@ncbijs/cite';
import type { CSLData } from '@ncbijs/cite';
import { convert } from '@ncbijs/id-converter';
import { PubMed } from '@ncbijs/pubmed';

const NCBI_CONFIG = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-examples',
  email: process.env['NCBI_EMAIL'] ?? 'ncbijs@users.noreply.github.com',
  ...(process.env['NCBI_API_KEY'] !== undefined && { apiKey: process.env['NCBI_API_KEY'] }),
};

interface PublicationRecord {
  readonly pmid: string;
  readonly pmcid: string | null;
  readonly doi: string | null;
  readonly title: string;
  readonly journal: string;
  readonly year: number;
  readonly authors: string;
  readonly apaCitation: string;
}

async function main(): Promise<void> {
  const pubmed = new PubMed(NCBI_CONFIG);
  const citeClient = new Cite();

  // 1. Search for recent systematic reviews
  console.log('1. Searching PubMed for systematic reviews on diabetes...\n');

  const articles = await pubmed
    .search('type 2 diabetes treatment outcomes')
    .publicationType('Systematic Review')
    .sort('pub_date')
    .limit(5)
    .fetchAll();

  console.log(`   Found ${articles.length} systematic reviews\n`);

  // 2. Get CSL-JSON metadata via Citation Exporter
  const pmids = articles.map((a) => a.pmid);
  console.log('2. Fetching CSL-JSON metadata for each article...\n');

  const cslEntries = new Map<string, CSLData>();
  for await (const entry of citeClient.citeMany(pmids, 'csl')) {
    cslEntries.set(entry.id, entry.citation as CSLData);
  }

  // 3. Get pre-rendered APA citations
  console.log('3. Fetching pre-rendered APA citations...\n');

  const apaCitations = new Map<string, string>();
  for await (const entry of citeClient.citeMany(pmids, 'citation')) {
    const rendered = entry.citation as { apa: { format: string } };
    apaCitations.set(entry.id, rendered.apa.format);
  }

  // 4. Cross-reference all IDs
  console.log('4. Cross-referencing PMIDs with PMCIDs and DOIs...\n');

  const convertedIds = await convert(pmids);
  const idMap = new Map(convertedIds.map((entry) => [entry.pmid, entry]));

  // 5. Build publication records
  const records: Array<PublicationRecord> = articles.map((article) => {
    const ids = idMap.get(article.pmid);
    const csl = cslEntries.get(article.pmid);
    const authorNames = article.authors
      .slice(0, 3)
      .map((a) => a.lastName ?? a.collectiveName ?? 'Unknown')
      .join(', ');

    return {
      pmid: article.pmid,
      pmcid: ids?.pmcid ?? null,
      doi: ids?.doi ?? csl?.DOI ?? null,
      title: article.title,
      journal: article.journal.isoAbbrev,
      year: article.publicationDate.year,
      authors: article.authors.length > 3 ? `${authorNames} et al.` : authorNames,
      apaCitation: apaCitations.get(article.pmid) ?? 'N/A',
    };
  });

  // 6. Print structured output
  console.log('=== Publication Database Records ===\n');

  for (const record of records) {
    console.log(`PMID:    ${record.pmid}`);
    console.log(`PMCID:   ${record.pmcid ?? 'N/A'}`);
    console.log(`DOI:     ${record.doi ?? 'N/A'}`);
    console.log(`Title:   ${record.title.slice(0, 80)}${record.title.length > 80 ? '...' : ''}`);
    console.log(`Journal: ${record.journal} (${record.year})`);
    console.log(`Authors: ${record.authors}`);
    console.log(`APA:     ${record.apaCitation.slice(0, 120)}...`);
    console.log();
  }

  console.log(`Total: ${records.length} records built`);
  console.log(`With PMC full text: ${records.filter((r) => r.pmcid !== null).length}`);
  console.log(`With DOI: ${records.filter((r) => r.doi !== null).length}`);
}

main().catch(console.error);
