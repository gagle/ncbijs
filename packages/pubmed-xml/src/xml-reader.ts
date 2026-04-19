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

export interface TagWithAttributes {
  readonly text: string;
  readonly attributes: Readonly<Record<string, string>>;
}

export interface BlockWithAttributes {
  readonly content: string;
  readonly attributes: Readonly<Record<string, string>>;
}

function parseAttributesFromTag(openingTag: string): Record<string, string> {
  const attributeMap: Record<string, string> = {};
  const attributeRegex = /([\w.-]+)="([^"]*)"/g;
  let attributeMatch: RegExpExecArray | null;
  while ((attributeMatch = attributeRegex.exec(openingTag)) !== null) {
    const name = attributeMatch[1];
    const value = attributeMatch[2];
    if (name !== undefined && value !== undefined) {
      attributeMap[name] = decodeEntities(value);
    }
  }
  return attributeMap;
}

export function readTagWithAttributes(xml: string, tagName: string): TagWithAttributes | null {
  assertTagName(tagName);
  const regex = new RegExp(`<${tagName}(\\s[^>]*)?>([^<]*)</${tagName}>`);
  const match = regex.exec(xml);
  if (!match || match[2] === undefined) {
    return null;
  }
  const attributeString = match[1] ?? '';
  return {
    text: decodeEntities(match[2]),
    attributes: parseAttributesFromTag(attributeString),
  };
}

export function readAllTagsWithAttributes(
  xml: string,
  tagName: string,
): ReadonlyArray<TagWithAttributes> {
  assertTagName(tagName);
  const regex = new RegExp(`<${tagName}(\\s[^>]*)?>([^<]*)</${tagName}>`, 'g');
  const results: Array<TagWithAttributes> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    if (match[2] === undefined) {
      continue;
    }
    const attributeString = match[1] ?? '';
    results.push({
      text: decodeEntities(match[2]),
      attributes: parseAttributesFromTag(attributeString),
    });
  }
  return results;
}

export function readAllBlocksWithAttributes(
  xml: string,
  tagName: string,
): ReadonlyArray<BlockWithAttributes> {
  assertTagName(tagName);
  const results: Array<BlockWithAttributes> = [];
  let offset = 0;

  for (;;) {
    const blockResult = readBlockWithAttributesAt(xml, tagName, offset);
    if (!blockResult) {
      break;
    }
    results.push({ content: blockResult[0], attributes: blockResult[1] });
    offset = blockResult[2];
  }

  return results;
}

function readBlockAt(xml: string, tagName: string, offset: number): [string, number] | undefined {
  const result = readBlockWithAttributesAt(xml, tagName, offset);
  if (!result) {
    return undefined;
  }
  return [result[0], result[2]];
}

function readBlockWithAttributesAt(
  xml: string,
  tagName: string,
  offset: number,
): [string, Record<string, string>, number] | undefined {
  const openRegex = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'g');
  openRegex.lastIndex = offset;
  const openMatch = openRegex.exec(xml);
  if (!openMatch) {
    return undefined;
  }

  const attributeString = openMatch[1] ?? '';
  const attributeMap = parseAttributesFromTag(attributeString);
  const contentStart = openMatch.index + openMatch[0].length;

  if (openMatch[0].endsWith('/>')) {
    return ['', attributeMap, contentStart];
  }

  const tagRegex = new RegExp(`<(/?)${tagName}(?:\\s[^>]*)?>`, 'g');
  tagRegex.lastIndex = contentStart;
  let depth = 1;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(xml)) !== null) {
    if (tagMatch[1] === '/') {
      depth -= 1;
      if (depth === 0) {
        const endOffset = tagMatch.index + tagMatch[0].length;
        return [xml.slice(contentStart, tagMatch.index), attributeMap, endOffset];
      }
    } else if (!tagMatch[0].endsWith('/>')) {
      depth += 1;
    }
  }

  return undefined;
}
