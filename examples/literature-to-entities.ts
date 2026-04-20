// Multi-package workflow: Search PubMed for articles on a topic, check PMC availability
// via ID conversion, then extract named entities (genes, diseases, chemicals) using PubTator.
//
// Packages: @ncbijs/pubmed, @ncbijs/id-converter, @ncbijs/pubtator

import { convert } from '@ncbijs/id-converter';
import { PubMed } from '@ncbijs/pubmed';
import { PubTator } from '@ncbijs/pubtator';

const NCBI_CONFIG = {
  tool: process.env['NCBI_TOOL'] ?? 'ncbijs-examples',
  email: process.env['NCBI_EMAIL'] ?? 'ncbijs@users.noreply.github.com',
  apiKey: process.env['NCBI_API_KEY'],
};

async function main(): Promise<void> {
  const pubmed = new PubMed(NCBI_CONFIG);
  const pubtator = new PubTator();

  // 1. Search PubMed for recent CRISPR gene therapy reviews
  console.log('1. Searching PubMed for CRISPR gene therapy reviews...\n');

  const articles = await pubmed
    .search('CRISPR gene therapy')
    .publicationType('Review')
    .freeFullText()
    .sort('pub_date')
    .limit(5)
    .fetchAll();

  console.log(`   Found ${articles.length} articles:\n`);
  for (const article of articles) {
    const authorList = article.authors
      .slice(0, 3)
      .map((a) => a.lastName ?? a.collectiveName ?? 'Unknown')
      .join(', ');
    console.log(`   PMID ${article.pmid}: ${article.title.slice(0, 70)}...`);
    console.log(`     Authors: ${authorList}${article.authors.length > 3 ? ' et al.' : ''}`);
    console.log(`     Journal: ${article.journal.isoAbbrev} (${article.publicationDate.year})\n`);
  }

  // 2. Convert PMIDs to check for PMC full-text availability
  const pmids = articles.map((a) => a.pmid);
  console.log('2. Converting IDs to check PMC availability...\n');

  const convertedIds = await convert(pmids);
  const withPmc = convertedIds.filter((entry) => entry.pmcid !== null);

  console.log(`   ${withPmc.length}/${pmids.length} articles have PMC full text:`);
  for (const entry of convertedIds) {
    const pmcStatus = entry.pmcid ?? 'No PMC';
    const doiStatus = entry.doi ?? 'No DOI';
    console.log(`   PMID ${entry.pmid} -> ${pmcStatus} | ${doiStatus}`);
  }
  console.log();

  // 3. Extract named entities from articles via PubTator
  console.log('3. Extracting named entities via PubTator...\n');

  const bioc = await pubtator.export(pmids);

  const entityCounts = new Map<string, Map<string, number>>();

  for (const document of bioc.documents) {
    for (const passage of document.passages) {
      for (const annotation of passage.annotations) {
        const typeMap = entityCounts.get(annotation.type) ?? new Map<string, number>();
        typeMap.set(annotation.text, (typeMap.get(annotation.text) ?? 0) + 1);
        entityCounts.set(annotation.type, typeMap);
      }
    }
  }

  for (const [entityType, entities] of entityCounts) {
    const sorted = [...entities.entries()].sort((a, b) => b[1] - a[1]);
    const topEntities = sorted.slice(0, 5).map(([name, count]) => `${name} (${count})`);
    console.log(`   ${entityType}: ${topEntities.join(', ')}`);
  }
}

main().catch(console.error);
