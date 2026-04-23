// Fetch citations for PubMed articles in multiple formats: CSL-JSON for structured
// metadata and pre-rendered APA/MLA/AMA/NLM styles.

import { Cite } from '@ncbijs/cite';
import type { CitationData, CSLData } from '@ncbijs/cite';

async function main(): Promise<void> {
  const citeClient = new Cite();
  const pmids = ['23193287', '29083299'];

  for (const pmid of pmids) {
    const csl: CSLData = await citeClient.cite(pmid, 'csl');
    const rendered: CitationData = await citeClient.cite(pmid, 'citation');

    console.log(`--- PMID ${pmid} ---\n`);

    console.log('CSL-JSON metadata:');
    console.log(`  Title:   ${csl.title}`);
    console.log(`  Journal: ${csl['container-title'] ?? 'N/A'}`);
    console.log(`  DOI:     ${csl.DOI ?? 'N/A'}`);
    console.log(`  Authors: ${csl.author.map((a) => `${a.given} ${a.family}`).join(', ')}\n`);

    console.log('Pre-rendered citations:');
    console.log(`  APA: ${rendered.apa.format}`);
    console.log(`  MLA: ${rendered.mla.format}`);
    console.log(`  AMA: ${rendered.ama.format}`);
    console.log(`  NLM: ${rendered.nlm.format}\n`);
  }
}

main().catch(console.error);
