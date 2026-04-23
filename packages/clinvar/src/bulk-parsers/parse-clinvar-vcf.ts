import type { ClinVarVcfVariant } from '../interfaces/clinvar.interface';

/**
 * Parse a ClinVar VCF file into an array of {@link ClinVarVcfVariant} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/pub/clinvar/vcf_GRCh38/clinvar.vcf.gz
 */
export function parseClinVarVcf(vcf: string): ReadonlyArray<ClinVarVcfVariant> {
  const lines = vcf.split('\n');
  const variants: Array<ClinVarVcfVariant> = [];

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

    variants.push({
      chrom: fields[0] ?? '',
      pos: parseIntSafe(fields[1] ?? ''),
      id: fields[2] ?? '',
      ref: fields[3] ?? '',
      alt: fields[4] ?? '',
      qual: fields[5] ?? '',
      filter: fields[6] ?? '',
      clinicalSignificance: infoMap.get('CLNSIG') ?? '',
      diseaseNames: decodeVcfValue(infoMap.get('CLNDN') ?? ''),
      geneInfo: infoMap.get('GENEINFO') ?? '',
      rsId: infoMap.get('RS') ?? '',
      variantClass: infoMap.get('CLNVC') ?? '',
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

function decodeVcfValue(value: string): string {
  return value
    .replaceAll('%2C', ',')
    .replaceAll('%3B', ';')
    .replaceAll('%3D', '=')
    .replaceAll('%25', '%');
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}
