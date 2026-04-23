import type { TaxonomyReport } from '../interfaces/datasets.interface';

/** Input files for parsing an NCBI taxonomy dump (taxdump.tar.gz). */
export interface TaxonomyDumpInput {
  readonly namesDmp: string;
  readonly nodesDmp: string;
}

/** Parse NCBI taxonomy dump files (names.dmp + nodes.dmp) into an array of {@link TaxonomyReport} records. */
export function parseTaxonomyDump(files: TaxonomyDumpInput): ReadonlyArray<TaxonomyReport> {
  const nameMap = parseNamesDmp(files.namesDmp);
  const nodeMap = parseNodesDmp(files.nodesDmp);
  const childrenMap = buildChildrenMap(nodeMap);

  const reports: Array<TaxonomyReport> = [];

  for (const [taxId, nodeInfo] of nodeMap) {
    const names = nameMap.get(taxId);
    const lineage = buildLineage(taxId, nodeMap);
    const children = childrenMap.get(taxId) ?? [];

    reports.push({
      taxId,
      organismName: names?.scientificName ?? '',
      commonName: names?.commonName ?? '',
      rank: nodeInfo.rank,
      lineage,
      children,
      counts: [],
    });
  }

  return reports;
}

interface TaxonomyNames {
  readonly scientificName: string;
  readonly commonName: string;
}

interface NodeInfo {
  readonly parentTaxId: number;
  readonly rank: string;
}

function parseNamesDmp(content: string): Map<number, TaxonomyNames> {
  const nameMap = new Map<number, { scientificName: string; commonName: string }>();
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    const parts = line.split('\t|\t');

    if (parts.length < 4) {
      continue;
    }

    const taxId = Number.parseInt((parts[0] ?? '').trim(), 10);

    if (Number.isNaN(taxId)) {
      continue;
    }

    const nameTxt = (parts[1] ?? '').trim();
    const nameClass = (parts[3] ?? '').replace(/\t?\|$/, '').trim();

    let entry = nameMap.get(taxId);

    if (entry === undefined) {
      entry = { scientificName: '', commonName: '' };
      nameMap.set(taxId, entry);
    }

    if (nameClass === 'scientific name') {
      entry.scientificName = nameTxt;
    } else if (nameClass === 'genbank common name' || nameClass === 'common name') {
      if (entry.commonName === '') {
        entry.commonName = nameTxt;
      }
    }
  }

  return nameMap;
}

function parseNodesDmp(content: string): Map<number, NodeInfo> {
  const nodeMap = new Map<number, NodeInfo>();
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      continue;
    }

    const parts = line.split('\t|\t');

    if (parts.length < 3) {
      continue;
    }

    const taxId = Number.parseInt((parts[0] ?? '').trim(), 10);
    const parentTaxId = Number.parseInt((parts[1] ?? '').trim(), 10);
    const rank = (parts[2] ?? '').trim();

    if (Number.isNaN(taxId) || Number.isNaN(parentTaxId)) {
      continue;
    }

    nodeMap.set(taxId, { parentTaxId, rank });
  }

  return nodeMap;
}

function buildChildrenMap(nodeMap: Map<number, NodeInfo>): Map<number, ReadonlyArray<number>> {
  const childrenMap = new Map<number, Array<number>>();

  for (const [taxId, nodeInfo] of nodeMap) {
    if (taxId === nodeInfo.parentTaxId) {
      continue;
    }

    let children = childrenMap.get(nodeInfo.parentTaxId);

    if (children === undefined) {
      children = [];
      childrenMap.set(nodeInfo.parentTaxId, children);
    }

    children.push(taxId);
  }

  return childrenMap;
}

function buildLineage(taxId: number, nodeMap: Map<number, NodeInfo>): ReadonlyArray<number> {
  const lineage: Array<number> = [];
  let currentId = taxId;
  const visited = new Set<number>();

  while (true) {
    const node = nodeMap.get(currentId);

    if (node === undefined || currentId === node.parentTaxId) {
      break;
    }

    if (visited.has(currentId)) {
      break;
    }

    visited.add(currentId);
    lineage.push(node.parentTaxId);
    currentId = node.parentTaxId;
  }

  return lineage;
}
