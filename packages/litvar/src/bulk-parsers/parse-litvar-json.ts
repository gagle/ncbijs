import type { LitVarVariant } from '../interfaces/litvar.interface';

/**
 * Parse a LitVar bulk JSON file into an array of {@link LitVarVariant} records.
 *
 * Accepts both a JSON array and newline-delimited JSON (NDJSON).
 *
 * The FTP bulk file uses a slightly different field layout than the HTTP API:
 * `gene` is a string (mapped to a single-element array) and `hgvs` is an array
 * (the first element is used). Fields not present in the bulk format (`name`,
 * `clinicalSignificance`) default to empty.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/pub/lu/LitVar/litvar2_variants.json.gz
 */
export function parseLitVarJson(json: string): ReadonlyArray<LitVarVariant> {
  const trimmed = json.trim();

  if (trimmed === '') {
    return [];
  }

  if (trimmed.startsWith('[')) {
    return parseJsonArray(trimmed);
  }

  return parseNdjson(trimmed);
}

function parseJsonArray(json: string): ReadonlyArray<LitVarVariant> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return (parsed as ReadonlyArray<RawLitVarVariant>).map(mapVariant);
}

function parseNdjson(ndjson: string): ReadonlyArray<LitVarVariant> {
  const variants: Array<LitVarVariant> = [];

  for (const line of ndjson.split('\n')) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      continue;
    }

    try {
      const raw = JSON.parse(trimmedLine) as RawLitVarVariant;
      variants.push(mapVariant(raw));
    } catch {
      // noop
    }
  }

  return variants;
}

interface RawLitVarVariant {
  readonly rsid?: string;
  readonly hgvs?: ReadonlyArray<string>;
  readonly gene?: string;
  readonly publication_count?: number;
}

function mapVariant(raw: RawLitVarVariant): LitVarVariant {
  return {
    rsid: raw.rsid ?? '',
    gene: raw.gene ? [raw.gene] : [],
    name: '',
    hgvs: raw.hgvs?.[0] ?? '',
    clinicalSignificance: [],
  };
}
