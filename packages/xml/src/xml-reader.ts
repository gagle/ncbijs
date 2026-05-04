/**
 * Regex-based XML reader for extracting tags, blocks, and attributes from
 * NCBI XML responses. Handles nested same-name tags, entity decoding,
 * self-closing elements, and namespaced attributes without external
 * dependencies.
 */

const XML_TAG_NAME_REGEX = /^[a-zA-Z_][\w.-]*$/;

function assertTagName(tagName: string): void {
  if (!XML_TAG_NAME_REGEX.test(tagName)) {
    throw new Error(`Invalid XML tag name: "${tagName}"`);
  }
}

/** Read the text content of the first occurrence of an XML tag. */
export function readTag(xml: string, tagName: string): string | undefined {
  assertTagName(tagName);
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([^<]*)</${tagName}>`);
  const match = regex.exec(xml);
  return match?.[1] !== undefined ? decodeEntities(match[1]) : undefined;
}

/** Read the text content of all occurrences of an XML tag. */
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

/** Read the full inner content (including nested tags) of the first occurrence of an XML block. */
export function readBlock(xml: string, tagName: string): string | undefined {
  assertTagName(tagName);
  return readBlockAt(xml, tagName, 0)?.[0];
}

/** Read the full inner content of all occurrences of an XML block. */
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

/** Read the value of a named attribute from the first occurrence of an XML tag. */
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

/** Decode XML character entities (named, decimal, and hexadecimal) in a string. */
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

/** Remove all XML/HTML tags from a string, leaving only text content. */
export function stripTags(xml: string): string {
  return xml.replace(/<[^>]+>/g, '');
}

/** An XML tag's text content paired with its parsed attributes. */
export interface TagWithAttributes {
  readonly text: string;
  readonly attributes: Readonly<Record<string, string>>;
}

/** An XML block's inner content paired with its opening tag's parsed attributes. */
export interface BlockWithAttributes {
  readonly content: string;
  readonly attributes: Readonly<Record<string, string>>;
}

/** Read the text content and attributes of the first occurrence of an XML tag. */
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

/** Read the text content and attributes of all occurrences of an XML tag. */
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

/** Read the inner content and attributes of all occurrences of an XML block. */
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

/** Remove all occurrences of the specified XML block (including nested content) from a string. */
export function removeAllBlocks(xml: string, tagName: string): string {
  assertTagName(tagName);
  let result = xml;

  for (;;) {
    const openRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
    const openMatch = openRegex.exec(result);
    if (!openMatch) {
      break;
    }

    if (openMatch[0].endsWith('/>')) {
      result =
        result.slice(0, openMatch.index) + result.slice(openMatch.index + openMatch[0].length);
      continue;
    }

    const closeEnd = findCloseTag(result, tagName, openMatch.index + openMatch[0].length)?.[1];
    if (closeEnd === undefined) {
      break;
    }
    result = result.slice(0, openMatch.index) + result.slice(closeEnd);
  }

  return result;
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

  const closeResult = findCloseTag(xml, tagName, contentStart);
  if (!closeResult) {
    return undefined;
  }
  return [xml.slice(contentStart, closeResult[0]), attributeMap, closeResult[1]];
}

function findCloseTag(
  xml: string,
  tagName: string,
  startIndex: number,
): [closeStart: number, closeEnd: number] | undefined {
  const tagRegex = new RegExp(`<(/?)${tagName}(?:\\s[^>]*)?>`, 'g');
  tagRegex.lastIndex = startIndex;
  let depth = 1;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = tagRegex.exec(xml)) !== null) {
    if (tagMatch[1] === '/') {
      depth--;
      if (depth === 0) {
        return [tagMatch.index, tagMatch.index + tagMatch[0].length];
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
