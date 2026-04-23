import type { PmcS3Record } from '../interfaces/pmc.interface';

/**
 * Parse a PMC Open Access S3 inventory CSV into an array of {@link PmcS3Record} records.
 *
 * The inventory CSV has columns: bucket, key, size, last_modified_date, e_tag, storage_class.
 * The PMCID, version, and format are extracted from the S3 key path.
 *
 * @see https://www.ncbi.nlm.nih.gov/pmc/tools/pmcaws/
 */
export function parsePmcS3Inventory(csv: string): ReadonlyArray<PmcS3Record> {
  const lines = csv.split('\n');
  const records: Array<PmcS3Record> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = parseCsvLine(trimmedLine);

    if (fields.length < 6) {
      continue;
    }

    const bucket = fields[0] ?? '';
    const key = fields[1] ?? '';
    const sizeBytes = parseIntSafe(fields[2] ?? '');
    const lastModified = fields[3] ?? '';
    const eTag = stripQuotes(fields[4] ?? '');
    const storageClass = fields[5] ?? '';

    const keyParts = extractKeyParts(key);

    records.push({
      bucket,
      key,
      sizeBytes,
      lastModified,
      eTag,
      storageClass,
      pmcid: keyParts.pmcid,
      version: keyParts.version,
      format: keyParts.format,
    });
  }

  return records;
}

interface KeyParts {
  readonly pmcid: string;
  readonly version: string;
  readonly format: string;
}

function extractKeyParts(key: string): KeyParts {
  const segments = key.split('/');
  const lastSegment = segments[segments.length - 1] ?? '';
  const directorySegments = segments.slice(0, -1);

  let pmcid = '';
  let version = '';

  for (const segment of directorySegments) {
    if (/^PMC\d+$/.test(segment)) {
      pmcid = segment;
    }

    if (/^v\d+$/.test(segment)) {
      version = segment;
    }
  }

  const dotIndex = lastSegment.lastIndexOf('.');
  const format = dotIndex !== -1 ? lastSegment.substring(dotIndex + 1) : '';

  return { pmcid, version, format };
}

function parseCsvLine(line: string): ReadonlyArray<string> {
  const fields: Array<string> = [];
  let current = '';
  let inQuotes = false;

  for (let charIndex = 0; charIndex < line.length; charIndex++) {
    const character = line.charAt(charIndex);

    if (inQuotes) {
      if (character === '"') {
        if (charIndex + 1 < line.length && line.charAt(charIndex + 1) === '"') {
          current += '"';
          charIndex++;
        } else {
          inQuotes = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  fields.push(current.trim());

  return fields;
}

function stripQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.substring(1, value.length - 1);
  }

  return value;
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}
