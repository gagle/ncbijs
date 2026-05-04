import type { CompoundLiteratureLink } from '../interfaces/pubchem.interface';

/**
 * Parse a PubChem compound-literature link TSV file into an array of {@link CompoundLiteratureLink} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/pubchem/Compound/Extras/CID-PMID.gz
 */
export function parsePubchemLiteratureTsv(tsv: string): ReadonlyArray<CompoundLiteratureLink> {
  const lines = tsv.split('\n');
  const links: Array<CompoundLiteratureLink> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = trimmedLine.split('\t');

    if (fields.length < 3) {
      continue;
    }

    const cid = parseIntSafe(fields[0] ?? '');
    const pmid = parseIntSafe(fields[1] ?? '');
    const type = (fields[2] ?? '').trim();

    if (cid === 0 || pmid === 0) {
      continue;
    }

    links.push({ cid, pmid, type });
  }

  return links;
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}
