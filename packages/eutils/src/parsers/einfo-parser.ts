import type { DbInfo, EInfoResult, FieldInfo, LinkInfo } from '../types/responses';
import { readAllBlocks, readAllTags, readBlock, readTag } from '@ncbijs/xml';

export function parseEInfoXml(xml: string): EInfoResult {
  const dbListBlock = readBlock(xml, 'DbList');
  if (dbListBlock) {
    return { dbList: readAllTags(dbListBlock, 'DbName') };
  }

  const dbInfoBlock = readBlock(xml, 'DbInfo');
  if (!dbInfoBlock) {
    throw new Error('Invalid EInfo response: missing DbList or DbInfo');
  }

  const fieldBlocks = readAllBlocks(dbInfoBlock, 'Field');
  const fieldList: Array<FieldInfo> = [];

  for (const fieldBlock of fieldBlocks) {
    const name = readTag(fieldBlock, 'Name');
    const fullName = readTag(fieldBlock, 'FullName');
    if (!name || !fullName) {
      continue;
    }

    const isTruncatable = readTag(fieldBlock, 'IsTruncatable');
    const isRangeable = readTag(fieldBlock, 'IsRangeable');

    fieldList.push({
      name,
      fullName,
      description: readTag(fieldBlock, 'Description') ?? '',
      termCount: Number(readTag(fieldBlock, 'TermCount') ?? '0'),
      isDate: readTag(fieldBlock, 'IsDate') === 'Y',
      isNumerical: readTag(fieldBlock, 'IsNumerical') === 'Y',
      ...(isTruncatable !== undefined ? { isTruncatable: isTruncatable === 'Y' } : {}),
      ...(isRangeable !== undefined ? { isRangeable: isRangeable === 'Y' } : {}),
    });
  }

  const linkBlocks = readAllBlocks(dbInfoBlock, 'Link');
  const linkList: Array<LinkInfo> = [];

  for (const linkBlock of linkBlocks) {
    const name = readTag(linkBlock, 'Name');
    const menu = readTag(linkBlock, 'Menu');
    if (!name || !menu) {
      continue;
    }

    linkList.push({
      name,
      menu,
      description: readTag(linkBlock, 'Description') ?? '',
      dbTo: readTag(linkBlock, 'DbTo') ?? '',
    });
  }

  const dbInfo: DbInfo = {
    dbName: readTag(dbInfoBlock, 'DbName') ?? '',
    description: readTag(dbInfoBlock, 'Description') ?? '',
    count: Number(readTag(dbInfoBlock, 'Count') ?? '0'),
    lastUpdate: readTag(dbInfoBlock, 'LastUpdate') ?? '',
    fieldList,
    linkList,
  };

  return { dbInfo };
}

export function parseEInfoJson(raw: string): EInfoResult {
  const json = JSON.parse(raw) as {
    dblist?: ReadonlyArray<string>;
    dbinfo?: {
      dbname?: string;
      description?: string;
      count?: string;
      lastupdate?: string;
      fieldlist?: ReadonlyArray<{
        name?: string;
        fullname?: string;
        description?: string;
        termcount?: string;
        isdate?: string;
        isnumerical?: string;
        istruncatable?: string;
        israngeable?: string;
      }>;
      linklist?: ReadonlyArray<{
        name?: string;
        menu?: string;
        description?: string;
        dbto?: string;
      }>;
    };
  };

  if (json.dblist) {
    return { dbList: json.dblist };
  }

  const info = json.dbinfo;
  if (!info) {
    throw new Error('Invalid EInfo JSON: missing dblist or dbinfo');
  }

  const fieldList: Array<FieldInfo> = (info.fieldlist ?? []).map((field) => ({
    name: field.name ?? '',
    fullName: field.fullname ?? '',
    description: field.description ?? '',
    termCount: Number(field.termcount ?? '0'),
    isDate: field.isdate === 'Y',
    isNumerical: field.isnumerical === 'Y',
    ...(field.istruncatable !== undefined ? { isTruncatable: field.istruncatable === 'Y' } : {}),
    ...(field.israngeable !== undefined ? { isRangeable: field.israngeable === 'Y' } : {}),
  }));

  const linkList: Array<LinkInfo> = (info.linklist ?? []).map((link) => ({
    name: link.name ?? '',
    menu: link.menu ?? '',
    description: link.description ?? '',
    dbTo: link.dbto ?? '',
  }));

  return {
    dbInfo: {
      dbName: info.dbname ?? '',
      description: info.description ?? '',
      count: Number(info.count ?? '0'),
      lastUpdate: info.lastupdate ?? '',
      fieldList,
      linkList,
    },
  };
}
