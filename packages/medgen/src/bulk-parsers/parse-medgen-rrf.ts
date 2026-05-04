import type {
  MedGenConcept,
  MedGenDefinition,
  MedGenName,
  MedGenRrfInput,
} from '../interfaces/medgen.interface';

/**
 * Parse MedGen RRF bulk files into an array of {@link MedGenConcept} records.
 *
 * Requires MGCONSO.RRF at minimum. MGDEF.RRF adds definitions,
 * MGSTY.RRF adds semantic types.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/pub/medgen/
 */
export function parseMedGenRrf(files: MedGenRrfInput): ReadonlyArray<MedGenConcept> {
  const conceptMap = parseMgconso(files.mgconso);
  const definitionMap =
    files.mgdef !== undefined
      ? parseMgdef(files.mgdef)
      : new Map<string, ReadonlyArray<MedGenDefinition>>();
  const semanticTypeMap =
    files.mgsty !== undefined ? parseMgsty(files.mgsty) : new Map<string, string>();

  const concepts: Array<MedGenConcept> = [];

  for (const [cui, entry] of conceptMap) {
    concepts.push({
      uid: cui,
      conceptId: cui,
      title: entry.preferredName,
      definition: (definitionMap.get(cui) ?? [])[0]?.text ?? '',
      semanticType: semanticTypeMap.get(cui) ?? '',
      associatedGenes: [],
      modesOfInheritance: [],
      clinicalFeatures: [],
      omimIds: [],
      definitions: definitionMap.get(cui) ?? [],
      names: entry.names,
    });
  }

  return concepts;
}

interface ConsoEntry {
  readonly preferredName: string;
  readonly names: ReadonlyArray<MedGenName>;
}

function parseMgconso(mgconso: string): Map<string, ConsoEntry> {
  const map = new Map<string, { preferredName: string; names: Array<MedGenName> }>();

  for (const line of mgconso.split('\n')) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = trimmedLine.split('|');

    if (fields.length < 5) {
      continue;
    }

    const cui = (fields[0] ?? '').trim();
    const source = (fields[1] ?? '').trim();
    const type = (fields[2] ?? '').trim();
    const name = (fields[3] ?? '').trim();
    const isPref = (fields[4] ?? '').trim();

    if (cui === '' || name === '') {
      continue;
    }

    let entry = map.get(cui);

    if (entry === undefined) {
      entry = { preferredName: '', names: [] };
      map.set(cui, entry);
    }

    entry.names.push({ name, source, type });

    if (isPref === 'Y' || entry.preferredName === '') {
      entry.preferredName = name;
    }
  }

  return map as Map<string, ConsoEntry>;
}

function parseMgdef(mgdef: string): Map<string, ReadonlyArray<MedGenDefinition>> {
  const map = new Map<string, Array<MedGenDefinition>>();

  for (const line of mgdef.split('\n')) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = trimmedLine.split('|');

    if (fields.length < 3) {
      continue;
    }

    const cui = (fields[0] ?? '').trim();
    const text = (fields[1] ?? '').trim();
    const source = (fields[2] ?? '').trim();

    if (cui === '' || text === '') {
      continue;
    }

    let definitions = map.get(cui);

    if (definitions === undefined) {
      definitions = [];
      map.set(cui, definitions);
    }

    definitions.push({ source, text });
  }

  return map as Map<string, ReadonlyArray<MedGenDefinition>>;
}

function parseMgsty(mgsty: string): Map<string, string> {
  const map = new Map<string, string>();

  for (const line of mgsty.split('\n')) {
    const trimmedLine = line.trim();

    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      continue;
    }

    const fields = trimmedLine.split('|');

    if (fields.length < 2) {
      continue;
    }

    const cui = (fields[0] ?? '').trim();
    const semanticType = (fields[1] ?? '').trim();

    if (cui !== '' && semanticType !== '' && !map.has(cui)) {
      map.set(cui, semanticType);
    }
  }

  return map;
}
