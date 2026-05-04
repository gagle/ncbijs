import type { ESearchResult, Translation } from '../types/responses';
import { readAllBlocks, readAllTags, readBlock, readTag } from '@ncbijs/xml';

export function parseESearchXml(xml: string): ESearchResult {
  const count = Number(readTag(xml, 'Count') ?? '0');
  const retMax = Number(readTag(xml, 'RetMax') ?? '0');
  const retStart = Number(readTag(xml, 'RetStart') ?? '0');
  const idList = readAllTags(xml, 'Id');
  const queryTranslation = readTag(xml, 'QueryTranslation') ?? '';

  const translationBlocks = readAllBlocks(xml, 'Translation');
  const translationSet: Array<Translation> = [];

  for (const block of translationBlocks) {
    const from = readTag(block, 'From');
    const to = readTag(block, 'To');
    if (from !== undefined && to !== undefined) {
      translationSet.push({ from, to });
    }
  }

  const webEnv = readTag(xml, 'WebEnv');
  const queryKeyStr = readTag(xml, 'QueryKey');

  const errorListBlock = readBlock(xml, 'ErrorList');
  const errorList = errorListBlock ? readAllTags(errorListBlock, 'FieldNotFound') : undefined;

  return {
    count,
    retMax,
    retStart,
    idList,
    translationSet,
    queryTranslation,
    ...(webEnv ? { webEnv } : {}),
    ...(queryKeyStr ? { queryKey: Number(queryKeyStr) } : {}),
    ...(errorList && errorList.length > 0 ? { errorList } : {}),
  };
}

export function parseESearchJson(raw: string): ESearchResult {
  const json = JSON.parse(raw) as {
    esearchresult?: {
      count?: string;
      retmax?: string;
      retstart?: string;
      idlist?: ReadonlyArray<string>;
      translationset?: ReadonlyArray<{ from: string; to: string }>;
      querytranslation?: string;
      webenv?: string;
      querykey?: string;
      errorlist?: { fieldnotfound?: ReadonlyArray<string> };
    };
  };

  const esearchResult = json.esearchresult;
  if (!esearchResult) {
    throw new Error('Invalid ESearch JSON: missing esearchresult');
  }

  const webEnv = esearchResult.webenv;
  const queryKeyStr = esearchResult.querykey;

  return {
    count: Number(esearchResult.count ?? '0'),
    retMax: Number(esearchResult.retmax ?? '0'),
    retStart: Number(esearchResult.retstart ?? '0'),
    idList: esearchResult.idlist ?? [],
    translationSet: (esearchResult.translationset ?? []).map((translation) => ({
      from: translation.from,
      to: translation.to,
    })),
    queryTranslation: esearchResult.querytranslation ?? '',
    ...(webEnv ? { webEnv } : {}),
    ...(queryKeyStr ? { queryKey: Number(queryKeyStr) } : {}),
    ...(esearchResult.errorlist?.fieldnotfound?.length
      ? { errorList: esearchResult.errorlist.fieldnotfound }
      : {}),
  };
}
