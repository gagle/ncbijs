import type {
  ELinkResult,
  IdCheckResult,
  Link,
  LinkOutUrl,
  LinkSet,
  LinkSetDb,
} from '../types/responses';
import { readAllBlocks, readAllTags, readBlock, readTag } from '../xml-reader';

export function parseELinkXml(xml: string): ELinkResult {
  const linkSetBlocks = readAllBlocks(xml, 'LinkSet');
  const linkSets: Array<LinkSet> = [];

  for (const linkSetBlock of linkSetBlocks) {
    const dbFrom = readTag(linkSetBlock, 'DbFrom') ?? '';
    const idListBlock = readBlock(linkSetBlock, 'IdList');
    const idList = idListBlock ? readAllTags(idListBlock, 'Id') : [];

    const linkSet: LinkSet = {
      dbFrom,
      idList,
      ...parseLinkSetDbs(linkSetBlock),
      ...parseHistory(linkSetBlock),
      ...parseLinkOutUrls(linkSetBlock),
      ...parseIdCheckResults(linkSetBlock),
    };

    linkSets.push(linkSet);
  }

  return { linkSets };
}

export function parseELinkJson(raw: string): ELinkResult {
  const json = JSON.parse(raw) as {
    linksets?: ReadonlyArray<{
      dbfrom?: string;
      ids?: ReadonlyArray<{ id?: string; value?: string }>;
      linksetdbs?: ReadonlyArray<{
        dbto?: string;
        linkname?: string;
        links?: ReadonlyArray<{ id?: { value?: string }; score?: string }>;
      }>;
      webenv?: string;
      querykey?: string;
    }>;
  };

  const linkSets: Array<LinkSet> = [];

  for (const linkset of json.linksets ?? []) {
    const dbFrom = linkset.dbfrom ?? '';
    const idList = (linkset.ids ?? []).map((id) => id.value ?? id.id ?? '');

    const linkSetDbs: Array<LinkSetDb> = [];
    for (const linksetDb of linkset.linksetdbs ?? []) {
      const links: Array<Link> = (linksetDb.links ?? []).map((link) => ({
        id: link.id?.value ?? '',
        ...(link.score !== undefined ? { score: Number(link.score) } : {}),
      }));

      linkSetDbs.push({
        dbTo: linksetDb.dbto ?? '',
        linkName: linksetDb.linkname ?? '',
        links,
      });
    }

    linkSets.push({
      dbFrom,
      idList,
      ...(linkSetDbs.length > 0 ? { linkSetDbs } : {}),
      ...(linkset.webenv ? { webEnv: linkset.webenv } : {}),
      ...(linkset.querykey ? { queryKey: Number(linkset.querykey) } : {}),
    });
  }

  return { linkSets };
}

function parseLinkSetDbs(
  linkSetBlock: string,
): { linkSetDbs: ReadonlyArray<LinkSetDb> } | Record<string, never> {
  const dbBlocks = readAllBlocks(linkSetBlock, 'LinkSetDb');
  if (dbBlocks.length === 0) {
    return {};
  }

  const linkSetDbs: Array<LinkSetDb> = [];

  for (const dbBlock of dbBlocks) {
    const dbTo = readTag(dbBlock, 'DbTo') ?? '';
    const linkName = readTag(dbBlock, 'LinkName') ?? '';
    const linkBlocks = readAllBlocks(dbBlock, 'Link');

    const links: Array<Link> = [];
    for (const linkBlock of linkBlocks) {
      const id = readTag(linkBlock, 'Id');
      if (!id) {
        continue;
      }
      const score = readTag(linkBlock, 'Score');
      links.push({
        id,
        ...(score !== undefined ? { score: Number(score) } : {}),
      });
    }

    linkSetDbs.push({ dbTo, linkName, links });
  }

  return { linkSetDbs };
}

function parseHistory(
  linkSetBlock: string,
): { webEnv: string; queryKey: number } | Record<string, never> {
  const webEnv = readTag(linkSetBlock, 'WebEnv');
  const queryKey = readTag(linkSetBlock, 'QueryKey');

  if (!webEnv || !queryKey) {
    return {};
  }

  return { webEnv, queryKey: Number(queryKey) };
}

function parseLinkOutUrls(
  linkSetBlock: string,
): { linkOutUrls: ReadonlyArray<LinkOutUrl> } | Record<string, never> {
  const idUrlListBlock = readBlock(linkSetBlock, 'IdUrlList');
  if (!idUrlListBlock) {
    return {};
  }

  const objUrlBlocks = readAllBlocks(idUrlListBlock, 'ObjUrl');
  if (objUrlBlocks.length === 0) {
    return {};
  }

  const linkOutUrls: Array<LinkOutUrl> = [];

  for (const objBlock of objUrlBlocks) {
    const url = readTag(objBlock, 'Url');
    if (!url) {
      continue;
    }

    const providerBlock = readBlock(objBlock, 'Provider');
    const provider = providerBlock ? (readTag(providerBlock, 'Name') ?? '') : '';
    const providerAbbr = providerBlock ? readTag(providerBlock, 'NameAbbr') : undefined;
    const iconUrl = readTag(objBlock, 'IconUrl');
    const subjectType = readTag(objBlock, 'SubjectType');

    linkOutUrls.push({
      url,
      provider,
      ...(iconUrl ? { iconUrl } : {}),
      ...(subjectType ? { subjectType } : {}),
      ...(providerAbbr ? { providerAbbr } : {}),
    });
  }

  return { linkOutUrls };
}

function parseIdCheckResults(
  linkSetBlock: string,
): { idCheckResults: ReadonlyArray<IdCheckResult> } | Record<string, never> {
  const checkListBlock = readBlock(linkSetBlock, 'IdCheckList');
  if (!checkListBlock) {
    return {};
  }

  const idCheckResults: Array<IdCheckResult> = [];
  const idRegex = /<Id\s([^>]*)>([^<]*)<\/Id>/g;
  let match: RegExpExecArray | null;

  while ((match = idRegex.exec(checkListBlock)) !== null) {
    const attributes = match[1] ?? '';
    const id = match[2] ?? '';

    const hasLinkOutMatch = /HasLinkOut="([^"]*)"/.exec(attributes);
    const hasNeighborMatch = /HasNeighbor="([^"]*)"/.exec(attributes);

    idCheckResults.push({
      id,
      ...(hasLinkOutMatch?.[1] !== undefined ? { hasLinkOut: hasLinkOutMatch[1] === 'Y' } : {}),
      ...(hasNeighborMatch?.[1] !== undefined ? { hasNeighbor: hasNeighborMatch[1] === 'Y' } : {}),
    });
  }

  if (idCheckResults.length === 0) {
    return {};
  }

  return { idCheckResults };
}
