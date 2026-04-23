import type { DbSnpVcfVariant } from '../interfaces/snp.interface';

/**
 * Parse a dbSNP VCF file into an array of {@link DbSnpVcfVariant} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/snp/latest_release/VCF/
 */
export function parseDbSnpVcf(vcf: string): ReadonlyArray<DbSnpVcfVariant> {
  const lines = vcf.split('\n');
  const variants: Array<DbSnpVcfVariant> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = trimmedLine.split('\t');

    if (fields.length < 8) {
      continue;
    }

    const infoMap = parseInfoField(fields[7] ?? '');
    const altField = fields[4] ?? '';

    variants.push({
      chrom: fields[0] ?? '',
      pos: parseIntSafe(fields[1] ?? ''),
      rsId: fields[2] ?? '',
      ref: fields[3] ?? '',
      alt: altField !== '.' ? altField.split(',') : [],
      qual: fields[5] ?? '',
      filter: fields[6] ?? '',
      geneInfo: infoMap.get('GENEINFO') ?? '',
      variantClass: infoMap.get('VC') ?? '',
      dbSnpBuildId: parseIntSafe(infoMap.get('dbSNPBuildID') ?? ''),
    });
  }

  return variants;
}

function parseInfoField(info: string): Map<string, string> {
  const map = new Map<string, string>();

  if (info === '.' || info === '') {
    return map;
  }

  for (const pair of info.split(';')) {
    const equalsIndex = pair.indexOf('=');

    if (equalsIndex === -1) {
      map.set(pair, '');
    } else {
      map.set(pair.substring(0, equalsIndex), pair.substring(equalsIndex + 1));
    }
  }

  return map;
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}
