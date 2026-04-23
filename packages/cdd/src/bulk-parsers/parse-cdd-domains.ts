import type { ConservedDomain } from '../interfaces/cdd.interface';

/**
 * Parse a CDD domain list TSV file into an array of {@link ConservedDomain} records.
 *
 * The domain list is a tab-separated file with columns:
 * PSSM-Id, Accession, Short name, Description, PSSM-Length, Database
 *
 * @see https://ftp.ncbi.nlm.nih.gov/pub/mmdb/cdd/
 */
export function parseCddDomains(tsv: string): ReadonlyArray<ConservedDomain> {
  const lines = tsv.split('\n');
  const domains: Array<ConservedDomain> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = trimmedLine.split('\t');

    if (fields.length < 6) {
      continue;
    }

    const accession = (fields[1] ?? '').trim();

    if (accession === '') {
      continue;
    }

    domains.push({
      accession,
      shortName: (fields[2] ?? '').trim(),
      description: (fields[3] ?? '').trim(),
      pssmLength: parseIntSafe((fields[4] ?? '').trim()),
      database: (fields[5] ?? '').trim(),
    });
  }

  return domains;
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}
