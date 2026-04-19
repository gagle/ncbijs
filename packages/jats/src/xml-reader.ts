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
    if (!result) break;
    results.push(result[0]);
    offset = result[1];
  }

  return results;
}

export interface BlockWithAttributes {
  readonly content: string;
  readonly attributes: Readonly<Record<string, string>>;
}

export function readAllBlocksWithAttributes(
  xml: string,
  tagName: string,
): ReadonlyArray<BlockWithAttributes> {
  assertTagName(tagName);
  const results: Array<BlockWithAttributes> = [];
  let offset = 0;

  for (;;) {
    const result = readBlockWithAttributesAt(xml, tagName, offset);
    if (!result) break;
    results.push({ content: result[0], attributes: result[1] });
    offset = result[2];
  }

  return results;
}

export function removeAllBlocks(xml: string, tagName: string): string {
  assertTagName(tagName);
  let result = xml;

  for (;;) {
    const openRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
    const openMatch = openRegex.exec(result);
    if (!openMatch) break;

    if (openMatch[0].endsWith('/>')) {
      result =
        result.slice(0, openMatch.index) + result.slice(openMatch.index + openMatch[0].length);
      continue;
    }

    const tagRegex = new RegExp(`<(/?)${tagName}(?:\\s[^>]*)?>`, 'g');
    tagRegex.lastIndex = openMatch.index + openMatch[0].length;
    let depth = 1;
    let closeEnd = -1;
    let tagMatch: RegExpExecArray | null;

    while ((tagMatch = tagRegex.exec(result)) !== null) {
      if (tagMatch[1] === '/') {
        depth--;
        if (depth === 0) {
          closeEnd = tagMatch.index + tagMatch[0].length;
          break;
        }
      } else if (!tagMatch[0].endsWith('/>')) {
        depth++;
      }
    }

    if (closeEnd === -1) break;
    result = result.slice(0, openMatch.index) + result.slice(closeEnd);
  }

  return result;
}

export function readAttribute(xml: string, tagName: string, attrName: string): string | undefined {
  assertTagName(tagName);
  const regex = new RegExp(`<${tagName}\\s[^>]*\\b${attrName}="([^"]*)"`);
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
  if (!openMatch) return undefined;

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
      depth--;
      if (depth === 0) {
        return [xml.slice(contentStart, tagMatch.index), tagMatch.index + tagMatch[0].length];
      }
    } else if (!tagMatch[0].endsWith('/>')) {
      depth++;
    }
  }

  return undefined;
}

function readBlockWithAttributesAt(
  xml: string,
  tagName: string,
  offset: number,
): [string, Record<string, string>, number] | undefined {
  const openRegex = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'g');
  openRegex.lastIndex = offset;
  const openMatch = openRegex.exec(xml);
  if (!openMatch) return undefined;

  const attributes = openMatch[1] ? parseAttributesFromTag(openMatch[1]) : {};
  const contentStart = openMatch.index + openMatch[0].length;

  if (openMatch[0].endsWith('/>')) {
    return ['', attributes, contentStart];
  }

  const tagRegex = new RegExp(`<(/?)${tagName}(?:\\s[^>]*)?>`, 'g');
  tagRegex.lastIndex = contentStart;
  let depth = 1;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(xml)) !== null) {
    if (tagMatch[1] === '/') {
      depth--;
      if (depth === 0) {
        return [
          xml.slice(contentStart, tagMatch.index),
          attributes,
          tagMatch.index + tagMatch[0].length,
        ];
      }
    } else if (!tagMatch[0].endsWith('/>')) {
      depth++;
    }
  }

  return undefined;
}

function parseAttributesFromTag(attributeString: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const regex = /([\w:.-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attributeString)) !== null) {
    if (match[1] !== undefined && match[2] !== undefined) {
      attributes[match[1]] = decodeEntities(match[2]);
    }
  }
  return attributes;
}
