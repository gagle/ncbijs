import type { ESpellResult } from '../types/responses.js';
import { readBlock, readTag, stripTags } from '@ncbijs/xml';

export function parseESpellXml(xml: string): ESpellResult {
  const query = readTag(xml, 'Query') ?? '';
  const correctedQuery = readTag(xml, 'CorrectedQuery') ?? '';

  const spelledQueryBlock = readBlock(xml, 'SpelledQuery');
  const spelledQuery = spelledQueryBlock ? stripTags(spelledQueryBlock) : '';

  return { query, correctedQuery, spelledQuery };
}
