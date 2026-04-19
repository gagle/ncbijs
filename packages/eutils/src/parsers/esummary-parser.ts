import type { DocSum, ESummaryResult } from '../types/responses';
import { readAllBlocks, readTag, stripTags } from '../xml-reader';

export function parseESummaryXml(xml: string): ESummaryResult {
  const itemRegex = /<Item\s+Name="([^"]*)"\s+Type="([^"]*)">([\s\S]*?)<\/Item>/g;
  const childItemRegex = /<Item\s[^>]*>([^<]*)<\/Item>/g;

  const docSumBlocks = readAllBlocks(xml, 'DocSum');
  const docSums: Array<DocSum> = [];
  let firstUid = '';

  for (const block of docSumBlocks) {
    const uid = readTag(block, 'Id') ?? '';
    if (!firstUid) {
      firstUid = uid;
    }

    const fields: Record<string, unknown> = { uid };

    itemRegex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(block)) !== null) {
      const name = match[1];
      const type = match[2];
      const content = match[3];

      if (!name || content === undefined) {
        continue;
      }

      if (type === 'List') {
        const children: Array<string> = [];
        childItemRegex.lastIndex = 0;
        let childMatch: RegExpExecArray | null;
        while ((childMatch = childItemRegex.exec(content)) !== null) {
          if (childMatch[1] !== undefined) {
            children.push(childMatch[1].trim());
          }
        }
        fields[name] = children;
      } else {
        fields[name] = stripTags(content).trim();
      }
    }

    docSums.push(fields as DocSum);
  }

  return { uid: firstUid, docSums };
}

export function parseESummaryJson(raw: string): ESummaryResult {
  const json = JSON.parse(raw) as { result?: Record<string, unknown> };
  const result = json.result;
  if (!result) {
    throw new Error('Invalid ESummary JSON: missing result');
  }

  const uids = result['uids'] as ReadonlyArray<string> | undefined;
  const docSums: Array<DocSum> = [];

  if (uids) {
    for (const uid of uids) {
      const record = result[uid];
      if (record && typeof record === 'object') {
        docSums.push({ uid, ...(record as Record<string, unknown>) } as DocSum);
      }
    }
  }

  return { uid: uids?.[0] ?? '', docSums };
}
