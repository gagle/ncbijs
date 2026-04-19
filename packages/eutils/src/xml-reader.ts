/**
 * Regex-based XML reader for extracting tags, blocks, and attributes from
 * NCBI E-utilities XML responses. Handles nested same-name tags, entity
 * decoding, and self-closing elements without external dependencies.
 */

const XML_TAG_NAME_REGEX = /^[a-zA-Z_][\w.-]*$/;

function assertTagName(tagName: string): void {
  if (!XML_TAG_NAME_REGEX.test(tagName)) {
    throw new Error(`Invalid XML tag name: "${tagName}"`);
  }
}

export function readTag(xml: string, tagName: string): string | undefined {
  assertTagName(tagName);
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([^<]*)</${tagName}>`);
  const match = regex.exec(xml);
  return match?.[1] !== undefined ? decodeEntities(match[1]) : undefined;
}

export function readAllTags(xml: string, tagName: string): ReadonlyArray<string> {
  assertTagName(tagName);
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([^<]*)</${tagName}>`, 'g');
  const results: Array<string> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[1] !== undefined) {
      results.push(decodeEntities(match[1]));
    }
  }
  return results;
}

export function readBlock(xml: string, tagName: string): string | undefined {
  return readBlockAt(xml, tagName, 0)?.[0];
}

export function readAllBlocks(xml: string, tagName: string): ReadonlyArray<string> {
  assertTagName(tagName);
  const results: Array<string> = [];
  let offset = 0;

  for (;;) {
    const result = readBlockAt(xml, tagName, offset);
    if (!result) {
      break;
    }
    results.push(result[0]);
    offset = result[1];
  }

  return results;
}

export function readAttribute(xml: string, tagName: string, attrName: string): string | undefined {
  assertTagName(tagName);
  assertTagName(attrName);
  const regex = new RegExp(`<${tagName}\\s[^>]*${attrName}="([^"]*)"`);
  const match = regex.exec(xml);
  return match?.[1] !== undefined ? decodeEntities(match[1]) : undefined;
}

const ENTITY_REGEX = /&(?:#x([0-9a-fA-F]+);|#(\d+);|amp;|lt;|gt;|quot;|apos;)/g;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  'amp;': '&',
  'lt;': '<',
  'gt;': '>',
  'quot;': '"',
  'apos;': "'",
};

export function decodeEntities(text: string): string {
  if (!text.includes('&')) {
    return text;
  }

  return text.replace(
    ENTITY_REGEX,
    (match: string, hexCode: string | undefined, decCode: string | undefined): string => {
      if (hexCode !== undefined) {
        return String.fromCodePoint(parseInt(hexCode, 16));
      }
      if (decCode !== undefined) {
        return String.fromCodePoint(parseInt(decCode, 10));
      }
      return NAMED_ENTITIES[match.slice(1)] ?? match;
    },
  );
}

export function stripTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, '');
}

function readBlockAt(xml: string, tagName: string, offset: number): [string, number] | undefined {
  const openRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
  openRegex.lastIndex = offset;
  const openMatch = openRegex.exec(xml);
  if (!openMatch) {
    return undefined;
  }

  const contentStart = openMatch.index + openMatch[0].length;

  if (openMatch[0].endsWith('/>')) {
    return ['', contentStart];
  }

  const tagRegex = new RegExp(`<(/?)${tagName}(?:\\s[^>]*)?>`, 'g');
  tagRegex.lastIndex = contentStart;
  let depth = 1;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(xml)) !== null) {
    if (tagMatch[1] === '/') {
      depth -= 1;
      if (depth === 0) {
        return [xml.slice(contentStart, tagMatch.index), tagMatch.index + tagMatch[0].length];
      }
    } else if (!tagMatch[0].endsWith('/>')) {
      depth += 1;
    }
  }

  return undefined;
}
