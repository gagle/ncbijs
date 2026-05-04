import { readAllBlocks, readAllTagsWithAttributes, readAttribute, readTag } from '@ncbijs/xml';

import type { Annotation, BioDocument, BioPassage } from './interfaces/pubtator.interface';

/** Parse a BioC document from either JSON or XML format into a structured BioDocument. */
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
  readonly PubTator3?: ReadonlyArray<BioCJsonDocument>;
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
    : (parsed.PubTator3 ?? parsed.documents ?? []);

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

  const documents = readAllBlocks(input, 'document').map((docXml) => {
    const id = readTag(docXml, 'id') ?? '';
    const passages = readAllBlocks(docXml, 'passage').map(parseXmlPassage);
    return { id, passages };
  });

  return { documents };
}

function parseXmlPassage(passageXml: string): BioPassage {
  const annotationStart = passageXml.indexOf('<annotation');
  const passageLevelXml = annotationStart >= 0 ? passageXml.slice(0, annotationStart) : passageXml;
  const infons = extractInfons(passageLevelXml);
  const text = readTag(passageXml, 'text') ?? '';
  const offsetStr = readTag(passageXml, 'offset');
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  const annotations = readAllBlocks(passageXml, 'annotation').map((annXml) => {
    const annInfons = extractInfons(annXml);
    const annText = readTag(annXml, 'text') ?? '';
    const annOffset = readAttribute(annXml, 'location', 'offset');
    const annLength = readAttribute(annXml, 'location', 'length');
    return {
      text: annText,
      type: annInfons['type'] ?? '',
      id: annInfons['identifier'] ?? annInfons['Identifier'] ?? '',
      offset: annOffset ? parseInt(annOffset, 10) : 0,
      length: annLength ? parseInt(annLength, 10) : 0,
    };
  });

  return { type: infons['type'] ?? '', text, offset, annotations };
}

function extractInfons(xml: string): Record<string, string> {
  const infons: Record<string, string> = {};
  for (const tag of readAllTagsWithAttributes(xml, 'infon')) {
    const key = tag.attributes['key'];
    if (key !== undefined) {
      infons[key] = tag.text;
    }
  }
  return infons;
}
