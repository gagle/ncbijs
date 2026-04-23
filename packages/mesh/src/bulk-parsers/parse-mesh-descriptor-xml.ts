import { readAllBlocks, readAllTags, readBlock, readTag } from '@ncbijs/xml';
import type { MeshDescriptor, MeshQualifier, MeshTreeData } from '../interfaces/mesh.interface';

/** Parse NLM MeSH descriptor XML (desc20XX.xml) into a {@link MeshTreeData} object. */
export function parseMeshDescriptorXml(xml: string): MeshTreeData {
  const descriptorBlocks = readAllBlocks(xml, 'DescriptorRecord');

  const descriptors: Array<MeshDescriptor> = [];

  for (const block of descriptorBlocks) {
    descriptors.push(parseDescriptorRecord(block));
  }

  return { descriptors };
}

function parseDescriptorRecord(block: string): MeshDescriptor {
  const id = readTag(block, 'DescriptorUI') ?? '';
  const nameBlock = readBlock(block, 'DescriptorName');
  const name = nameBlock !== undefined ? (readTag(nameBlock, 'String') ?? '') : '';

  const treeNumberBlock = readBlock(block, 'TreeNumberList');
  const treeNumbers =
    treeNumberBlock !== undefined ? readAllTags(treeNumberBlock, 'TreeNumber') : [];

  const qualifiers = parseQualifiers(block);
  const pharmacologicalActions = parsePharmacologicalActions(block);
  return {
    id,
    name,
    treeNumbers,
    qualifiers,
    pharmacologicalActions,
    supplementaryConcepts: [],
  };
}

function parseQualifiers(block: string): ReadonlyArray<MeshQualifier> {
  const listBlock = readBlock(block, 'AllowableQualifiersList');

  if (listBlock === undefined) {
    return [];
  }

  const qualifierBlocks = readAllBlocks(listBlock, 'AllowableQualifier');
  const qualifiers: Array<MeshQualifier> = [];

  for (const qualifierBlock of qualifierBlocks) {
    const referredBlock = readBlock(qualifierBlock, 'QualifierReferredTo');
    const nameBlock =
      referredBlock !== undefined ? readBlock(referredBlock, 'QualifierName') : undefined;
    const name = nameBlock !== undefined ? (readTag(nameBlock, 'String') ?? '') : '';
    const abbreviation = readTag(qualifierBlock, 'Abbreviation') ?? '';

    qualifiers.push({ name, abbreviation });
  }

  return qualifiers;
}

function parsePharmacologicalActions(block: string): ReadonlyArray<string> {
  const listBlock = readBlock(block, 'PharmacologicalActionList');

  if (listBlock === undefined) {
    return [];
  }

  const actionBlocks = readAllBlocks(listBlock, 'PharmacologicalAction');
  const actions: Array<string> = [];

  for (const actionBlock of actionBlocks) {
    const referredBlock = readBlock(actionBlock, 'DescriptorReferredTo');
    const nameBlock =
      referredBlock !== undefined ? readBlock(referredBlock, 'DescriptorName') : undefined;
    const name = nameBlock !== undefined ? (readTag(nameBlock, 'String') ?? '') : '';

    if (name !== '') {
      actions.push(name);
    }
  }

  return actions;
}
