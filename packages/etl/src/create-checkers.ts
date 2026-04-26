import { HttpTimestampChecker, Md5ChecksumChecker } from '@ncbijs/sync';
import type { UpdateChecker } from '@ncbijs/sync';
import { getDescriptor, listDatasets } from './dataset-registry';
import type { EtlDatasetType } from './interfaces/etl.interface';

/**
 * Create update checkers for NCBI datasets.
 *
 * Automatically selects the best change detection strategy per dataset:
 * MD5 checksum comparison for ClinVar, Taxonomy, and PubChem (reliable
 * content-based detection via tiny `.md5` companion files); HTTP
 * `Last-Modified` header for all others (universal fallback).
 *
 * Returns checkers for all datasets when called without arguments, or
 * for a specific subset when dataset IDs are provided.
 */
export function createCheckers(
  datasets?: ReadonlyArray<EtlDatasetType>,
): ReadonlyArray<UpdateChecker> {
  const ids = datasets ?? listDatasets().map((info) => info.id);

  return ids.map((id) => {
    const descriptor = getDescriptor(id);
    const md5Url = descriptor.md5Url;

    if (md5Url !== undefined) {
      return new Md5ChecksumChecker(id, md5Url);
    }

    const sourceUrl = descriptor.info.sourceUrls[0];

    if (sourceUrl === undefined) {
      throw new Error(`Dataset ${id} has no source URLs`);
    }

    return new HttpTimestampChecker(id, sourceUrl);
  });
}
