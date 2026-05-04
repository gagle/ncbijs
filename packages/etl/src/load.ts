import { pipeline } from '@ncbijs/pipeline';
import type { PipelineResult, Sink, Source } from '@ncbijs/pipeline';
import { getDescriptor } from './dataset-registry';
import type { EtlDatasetType, LoadOptions } from './interfaces/etl.interface';

/** Load a single NCBI dataset from HTTP into the provided sink. */
export async function load(
  dataset: EtlDatasetType,
  sink: Sink<object>,
  options?: LoadOptions,
): Promise<PipelineResult> {
  const descriptor = getDescriptor(dataset);
  const source = descriptor.createSource();

  const originalParse = descriptor.parse;
  const transform = options?.transform;
  const parse =
    transform !== undefined
      ? (raw: string | Record<string, string>) => transform(originalParse(raw))
      : originalParse;

  return pipeline(
    source as Source<string>,
    parse as (raw: string) => ReadonlyArray<Record<string, unknown>>,
    sink as Sink<Record<string, unknown>>,
    {
      ...(options?.signal !== undefined && { signal: options.signal }),
      ...(options?.batchSize !== undefined && { batchSize: options.batchSize }),
      ...(options?.onProgress !== undefined && { onProgress: options.onProgress }),
    },
  );
}
