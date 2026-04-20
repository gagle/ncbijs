import type {
  GenBankFeature,
  GenBankLocus,
  GenBankQualifier,
  GenBankRecord,
  GenBankReference,
} from './interfaces/genbank.interface';

const GENBANK_DIVISION_CODES = new Set([
  'PRI',
  'MAM',
  'ROD',
  'VRT',
  'INV',
  'PLN',
  'BCT',
  'VRL',
  'PHG',
  'SYN',
  'UNA',
  'EST',
  'PAT',
  'STS',
  'GSS',
  'HTG',
  'HTC',
  'ENV',
  'CON',
  'TSA',
]);

export function createEmptyGenBankRecord(accession: string): GenBankRecord {
  return {
    locus: { name: accession, length: 0, moleculeType: '', topology: '', division: '', date: '' },
    definition: '',
    accession,
    version: '',
    dbSource: '',
    keywords: '',
    source: '',
    organism: '',
    lineage: '',
    references: [],
    features: [],
    sequence: '',
  };
}

export function parseGenBank(text: string): ReadonlyArray<GenBankRecord> {
  return text
    .split(/\n\/\/\s*\n?/)
    .filter((rawRecord) => rawRecord.trim().length > 0)
    .map((rawRecord) => parseRecord(rawRecord.trim()));
}

function parseRecord(text: string): GenBankRecord {
  const sections = splitSections(text);

  return {
    locus: parseLocus(sections.get('LOCUS') ?? ''),
    definition: joinContinuation(sections.get('DEFINITION') ?? ''),
    accession: (sections.get('ACCESSION') ?? '').trim().split(/\s+/)[0] ?? '',
    version: (sections.get('VERSION') ?? '').trim(),
    dbSource: joinContinuation(sections.get('DBSOURCE') ?? ''),
    keywords: joinContinuation(sections.get('KEYWORDS') ?? '').replace(/\.$/, ''),
    source: (sections.get('SOURCE') ?? '').trim().split('\n')[0]?.trim() ?? '',
    organism: parseOrganism(sections.get('SOURCE') ?? ''),
    lineage: parseLineage(sections.get('SOURCE') ?? ''),
    references: sections.getAll('REFERENCE').map(parseReference),
    features: parseFeatures(sections.get('FEATURES') ?? ''),
    sequence: parseOrigin(sections.get('ORIGIN') ?? ''),
  };
}

class SectionMap {
  private readonly _entries: Array<{ readonly key: string; readonly value: string }> = [];

  public add(key: string, value: string): void {
    this._entries.push({ key, value });
  }

  public get(key: string): string | undefined {
    return this._entries.find((entry) => entry.key === key)?.value;
  }

  public getAll(key: string): ReadonlyArray<string> {
    return this._entries.filter((entry) => entry.key === key).map((entry) => entry.value);
  }
}

function splitSections(text: string): SectionMap {
  const sections = new SectionMap();
  const lines = text.split('\n');
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    const match = /^([A-Z][A-Z /]+?)\s{2,}(.*)$/.exec(line);
    const bareMatch = !match ? /^([A-Z]{2,})\s*$/.exec(line) : null;

    if (match || bareMatch) {
      if (currentKey) {
        sections.add(currentKey, currentValue);
      }
      currentKey = match ? (match[1] ?? '').trim() : (bareMatch?.[1] ?? '').trim();
      currentValue = match ? (match[2] ?? '') : '';
    } else if (currentKey) {
      currentValue += '\n' + line;
    }
  }

  if (currentKey) {
    sections.add(currentKey, currentValue);
  }

  return sections;
}

function joinContinuation(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');
}

function parseLocus(line: string): GenBankLocus {
  const parts = line.trim().split(/\s+/);

  const name = parts[0] ?? '';

  if (parts.length <= 1) {
    return { name, length: 0, moleculeType: '', topology: '', division: '', date: '' };
  }

  const lengthStr = parts[1] ?? '0';
  const length = parseInt(lengthStr, 10) || 0;

  let moleculeType = '';
  let topology = '';
  let division = '';
  let date = '';

  for (let partIndex = 2; partIndex < parts.length; partIndex++) {
    const part = parts[partIndex] ?? '';

    if (part === 'aa') {
      moleculeType = 'aa';
      continue;
    }

    if (part === 'bp') {
      continue;
    }

    if (part === 'linear' || part === 'circular') {
      topology = part;
      continue;
    }

    if (/^\d{2}-[A-Z]{3}-\d{4}$/.test(part)) {
      date = part;
      continue;
    }

    if (/^[A-Z]{3}$/.test(part) && division === '') {
      if (moleculeType === '' && !GENBANK_DIVISION_CODES.has(part)) {
        moleculeType = part;
      } else {
        division = part;
      }
      continue;
    }

    if (moleculeType === '') {
      moleculeType = part;
    }
  }

  return { name, length, moleculeType, topology, division, date };
}

function parseOrganism(sourceSection: string): string {
  const lines = sourceSection.split('\n');
  for (const line of lines) {
    const match = /^\s+ORGANISM\s+(.+)$/.exec(line);
    if (match) {
      return (match[1] ?? '').trim();
    }
  }
  return '';
}

function parseLineage(sourceSection: string): string {
  const lines = sourceSection.split('\n');
  let inLineage = false;
  const lineageLines: Array<string> = [];

  for (const line of lines) {
    if (/^\s+ORGANISM\s+/.test(line)) {
      inLineage = true;
      continue;
    }

    if (inLineage) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        lineageLines.push(trimmed);
      }
    }
  }

  return lineageLines.join(' ').replace(/\.$/, '');
}

function parseReference(text: string): GenBankReference {
  const lines = text.split('\n');
  let number = 0;
  let range = '';
  let authors = '';
  let title = '';
  let journal = '';
  let pubmedId = '';
  let currentField = '';
  let currentValue = '';

  const firstLine = lines[0] ?? '';
  const refMatch = /^(\d+)\s*(?:\((.+)\))?/.exec(firstLine.trim());
  if (refMatch) {
    number = parseInt(refMatch[1] ?? '0', 10) || 0;
    range = refMatch[2]?.trim() ?? '';
  }

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? '';
    const fieldMatch = /^\s{2,}(\w+)\s{2,}(.*)$/.exec(line);

    if (fieldMatch) {
      if (currentField) {
        assignReferenceField(currentField, currentValue);
      }
      currentField = fieldMatch[1] ?? '';
      currentValue = fieldMatch[2] ?? '';
    } else if (currentField) {
      currentValue += ' ' + line.trim();
    }
  }

  if (currentField) {
    assignReferenceField(currentField, currentValue);
  }

  return { number, range, authors, title, journal, pubmedId };

  function assignReferenceField(field: string, value: string): void {
    switch (field) {
      case 'AUTHORS':
        authors = value.trim();
        break;
      case 'TITLE':
        title = value.trim();
        break;
      case 'JOURNAL':
        journal = value.trim();
        break;
      case 'PUBMED':
        pubmedId = value.trim();
        break;
    }
  }
}

function parseFeatures(text: string): ReadonlyArray<GenBankFeature> {
  const features: Array<GenBankFeature> = [];
  const lines = text.split('\n');
  let currentKey = '';
  let currentLocation = '';
  let currentQualifiers: Array<GenBankQualifier> = [];
  let currentQualifierName = '';
  let currentQualifierValue = '';

  for (const line of lines) {
    if (line.length < 6) {
      continue;
    }

    const featureMatch = /^\s{5}(\S+)\s+(\S.*)$/.exec(line);

    if (featureMatch) {
      if (currentKey) {
        flushQualifier();
        features.push({
          key: currentKey,
          location: currentLocation,
          qualifiers: currentQualifiers,
        });
      }
      currentKey = featureMatch[1] ?? '';
      currentLocation = featureMatch[2] ?? '';
      currentQualifiers = [];
      currentQualifierName = '';
      currentQualifierValue = '';
      continue;
    }

    const qualifierLine = line.trim();

    if (qualifierLine.startsWith('/')) {
      flushQualifier();
      const eqIndex = qualifierLine.indexOf('=');
      if (eqIndex === -1) {
        currentQualifierName = qualifierLine.slice(1);
        currentQualifierValue = '';
      } else {
        currentQualifierName = qualifierLine.slice(1, eqIndex);
        currentQualifierValue = qualifierLine
          .slice(eqIndex + 1)
          .replace(/^"/, '')
          .replace(/"$/, '');
      }
    } else if (currentQualifierName) {
      currentQualifierValue += ' ' + qualifierLine.replace(/"$/, '');
    } else if (currentKey) {
      currentLocation += qualifierLine;
    }
  }

  if (currentKey) {
    flushQualifier();
    features.push({ key: currentKey, location: currentLocation, qualifiers: currentQualifiers });
  }

  return features;

  function flushQualifier(): void {
    if (currentQualifierName) {
      currentQualifiers.push({ name: currentQualifierName, value: currentQualifierValue });
      currentQualifierName = '';
      currentQualifierValue = '';
    }
  }
}

function parseOrigin(text: string): string {
  const lines = text.split('\n');
  const sequenceParts: Array<string> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const sequenceMatch = /^\d+\s+(.+)$/.exec(trimmed);
    if (sequenceMatch) {
      sequenceParts.push((sequenceMatch[1] ?? '').replace(/\s/g, ''));
    }
  }

  return sequenceParts.join('');
}
