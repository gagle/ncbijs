import type { EGQueryResult, EGQueryResultItem } from '../types/responses';
import { readAllBlocks, readTag } from '../xml-reader';

export function parseEGQueryXml(xml: string): EGQueryResult {
  const term = readTag(xml, 'Term') ?? '';
  const itemBlocks = readAllBlocks(xml, 'ResultItem');

  const eGQueryResultItems: Array<EGQueryResultItem> = [];

  for (const block of itemBlocks) {
    const dbName = readTag(block, 'DbName');
    const count = readTag(block, 'Count');
    const status = readTag(block, 'Status');

    if (dbName && count && status === 'Ok') {
      eGQueryResultItems.push({
        dbName,
        count: Number(count),
      });
    }
  }

  return { term, eGQueryResultItems };
}
