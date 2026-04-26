// Retrieve citation impact metrics from NIH iCite for PubMed articles.
// Shows Relative Citation Ratio, NIH percentile, and clinical citation data.

import { ICite } from '@ncbijs/icite';

async function main(): Promise<void> {
  const icite = new ICite();

  const pmids = [33533846, 25613900, 29083409];

  console.log(`Fetching iCite metrics for ${pmids.length} articles...\n`);

  const publications = await icite.publications(pmids);

  for (const pub of publications) {
    console.log(`PMID ${pub.pmid}: ${pub.title.slice(0, 70)}...`);
    console.log(`  Year: ${pub.year}`);
    console.log(`  Journal: ${pub.journal}`);
    console.log(`  Research article: ${pub.isResearchArticle}`);
    console.log(`  Relative Citation Ratio: ${pub.relativeCitationRatio ?? 'N/A'}`);
    console.log(`  NIH Percentile: ${pub.nihPercentile ?? 'N/A'}`);
    console.log(`  Cited by: ${pub.citedByCount} articles`);
    console.log(`  References: ${pub.referencesCount} articles`);
    console.log(`  Cited by clinical article: ${pub.citedByClinicalArticle}`);
    console.log(`  DOI: ${pub.doi}`);
    console.log();
  }
}

main().catch(console.error);
