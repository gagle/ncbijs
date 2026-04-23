/** Input files from PubChem Compound Extras FTP directory. */
export interface CompoundExtrasInput {
  readonly cidSmiles?: string;
  readonly cidInchiKey?: string;
  readonly cidIupac?: string;
}

/** Compound properties extracted from PubChem Extras bulk files. */
export interface CompoundExtrasProperty {
  readonly cid: number;
  readonly canonicalSmiles: string;
  readonly inchiKey: string;
  readonly iupacName: string;
}

/** Parse PubChem Compound Extras TSV files into an array of {@link CompoundExtrasProperty} records. */
export function parseCompoundExtras(
  files: CompoundExtrasInput,
): ReadonlyArray<CompoundExtrasProperty> {
  const smilesMap = files.cidSmiles !== undefined ? parseTsvPairs(files.cidSmiles) : new Map();
  const inchiMap = files.cidInchiKey !== undefined ? parseTsvPairs(files.cidInchiKey) : new Map();
  const iupacMap = files.cidIupac !== undefined ? parseTsvPairs(files.cidIupac) : new Map();

  const allCids = new Set<number>();

  for (const cid of smilesMap.keys()) {
    allCids.add(cid);
  }

  for (const cid of inchiMap.keys()) {
    allCids.add(cid);
  }

  for (const cid of iupacMap.keys()) {
    allCids.add(cid);
  }

  const records: Array<CompoundExtrasProperty> = [];

  for (const cid of allCids) {
    records.push({
      cid,
      canonicalSmiles: smilesMap.get(cid) ?? '',
      inchiKey: inchiMap.get(cid) ?? '',
      iupacName: iupacMap.get(cid) ?? '',
    });
  }

  return records;
}

function parseTsvPairs(content: string): Map<number, string> {
  const map = new Map<number, string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      continue;
    }

    const tabIndex = trimmedLine.indexOf('\t');

    if (tabIndex === -1) {
      continue;
    }

    const cid = Number.parseInt(trimmedLine.substring(0, tabIndex), 10);

    if (Number.isNaN(cid)) {
      continue;
    }

    const value = trimmedLine.substring(tabIndex + 1);
    map.set(cid, value);
  }

  return map;
}
