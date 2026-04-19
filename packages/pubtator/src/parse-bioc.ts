import type { Annotation, BioDocument, BioPassage } from './interfaces/pubtator.interface';

export function parseBioC(input: string): BioDocument {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Empty input');
  }
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseBioCJson(trimmed);
  }
  if (trimmed.startsWith('<')) {
    return parseBioCXml(trimmed);
  }

  throw new Error('Unexpected format: input must be JSON or XML');
}

interface BioCJsonAnnotation {
  readonly text?: string;
  readonly infons?: Readonly<Record<string, string>>;
  readonly locations?: ReadonlyArray<Readonly<{ offset: number; length: number }>>;
}

interface BioCJsonPassage {
  readonly infons?: Readonly<Record<string, string>>;
  readonly text?: string;
  readonly offset?: number;
  readonly annotations?: ReadonlyArray<BioCJsonAnnotation>;
}

interface BioCJsonDocument {
  readonly id?: string;
  readonly passages?: ReadonlyArray<BioCJsonPassage>;
}

interface BioCJsonRoot {
  readonly documents?: ReadonlyArray<BioCJsonDocument>;
}

function parseBioCJson(input: string): BioDocument {
  let parsed: BioCJsonRoot;
  try {
    parsed = JSON.parse(input) as BioCJsonRoot;
  } catch {
    throw new Error('Invalid JSON input');
  }

  const rawDocuments = Array.isArray(parsed)
    ? (parsed as ReadonlyArray<BioCJsonDocument>)
    : (parsed.documents ?? []);

  const documents = rawDocuments.map((doc) => ({
    id: String(doc.id ?? ''),
    passages: (doc.passages ?? []).map(parseJsonPassage),
  }));

  return { documents };
}

function parseJsonPassage(passage: BioCJsonPassage): BioPassage {
  const annotations: Array<Annotation> = (passage.annotations ?? []).map((ann) => {
    const location = ann.locations?.[0];
    return {
      text: ann.text ?? '',
      type: ann.infons?.['type'] ?? '',
      id: ann.infons?.['identifier'] ?? ann.infons?.['Identifier'] ?? '',
      offset: location?.offset ?? 0,
      length: location?.length ?? 0,
    };
  });

  return {
    type: passage.infons?.['type'] ?? '',
    text: passage.text ?? '',
    offset: passage.offset ?? 0,
    annotations,
  };
}

function parseBioCXml(input: string): BioDocument {
  if (!input.includes('<document') && !input.includes('<collection')) {
    throw new Error('Invalid XML input: no BioC document or collection found');
  }

  const documents = extractAllXmlBlocks(input, 'document').map((docXml) => {
    const id = extractXmlTag(docXml, 'id') ?? '';
    const passages = extractAllXmlBlocks(docXml, 'passage').map(parseXmlPassage);
    return { id, passages };
  });

  return { documents };
}

function parseXmlPassage(passageXml: string): BioPassage {
  const annotationStart = passageXml.indexOf('<annotation');
  const passageLevelXml = annotationStart >= 0 ? passageXml.slice(0, annotationStart) : passageXml;
  const infons = extractInfons(passageLevelXml);
  const text = extractXmlTag(passageXml, 'text') ?? '';
  const offsetStr = extractXmlTag(passageXml, 'offset');
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  const annotations = extractAllXmlBlocks(passageXml, 'annotation').map((annXml) => {
    const annInfons = extractInfons(annXml);
    const annText = extractXmlTag(annXml, 'text') ?? '';
    const offsetMatch = /offset="(\d+)"/.exec(annXml);
    const lengthMatch = /length="(\d+)"/.exec(annXml);
    return {
      text: annText,
      type: annInfons['type'] ?? '',
      id: annInfons['identifier'] ?? annInfons['Identifier'] ?? '',
      offset: offsetMatch ? parseInt(offsetMatch[1] ?? '0', 10) : 0,
      length: lengthMatch ? parseInt(lengthMatch[1] ?? '0', 10) : 0,
    };
  });

  return { type: infons['type'] ?? '', text, offset, annotations };
}

function extractInfons(xml: string): Record<string, string> {
  const infons: Record<string, string> = {};
  const regex = /<infon\s+key="([^"]*)"[^>]*>([^<]*)<\/infon>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1] !== undefined && match[2] !== undefined) {
      infons[match[1]] = match[2];
    }
  }
  return infons;
}

function extractXmlTag(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([^<]*)</${tagName}>`);
  const match = regex.exec(xml);
  return match?.[1];
}

function extractAllXmlBlocks(xml: string, tagName: string): ReadonlyArray<string> {
  const results: Array<string> = [];
  const openRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
  let openMatch: RegExpExecArray | null;

  while ((openMatch = openRegex.exec(xml)) !== null) {
    if (openMatch[0].endsWith('/>')) {
      results.push('');
      continue;
    }

    const contentStart = openMatch.index + openMatch[0].length;
    const tagRegex = new RegExp(`<(/?)${tagName}(?:\\s[^>]*)?>`, 'g');
    tagRegex.lastIndex = contentStart;
    let depth = 1;
    let tagMatch: RegExpExecArray | null;

    while ((tagMatch = tagRegex.exec(xml)) !== null) {
      if (tagMatch[1] === '/') {
        depth--;
        if (depth === 0) {
          results.push(xml.slice(contentStart, tagMatch.index));
          break;
        }
      } else if (!tagMatch[0].endsWith('/>')) {
        depth++;
      }
    }
  }

  return results;
}
