import { listDatasets } from './dataset-registry';
import { load } from './load';
import type {
  DatasetLoadResult,
  EtlDatasetType,
  LoadAllOptions,
  LoadAllResult,
  SinkFactory,
} from './interfaces/etl.interface';

/** Load multiple (or all) NCBI datasets from HTTP into sinks created by the factory. */
export async function loadAll(
  sinkFactory: SinkFactory,
  options?: LoadAllOptions,
): Promise<LoadAllResult> {
  const allDatasets = listDatasets();
  const datasetIds: ReadonlyArray<EtlDatasetType> =
    options?.datasets ?? allDatasets.map((dataset) => dataset.id);

  const startTime = Date.now();
  const results: Array<DatasetLoadResult> = [];
  const errorStrategy = options?.onError ?? 'abort';

  for (const datasetId of datasetIds) {
    try {
      const result = await load(datasetId, sinkFactory(datasetId), {
        ...(options?.signal !== undefined && { signal: options.signal }),
        ...(options?.batchSize !== undefined && { batchSize: options.batchSize }),
      });

      results.push({ dataset: datasetId, result });
      options?.onDatasetComplete?.(datasetId, result);
    } catch (thrown) {
      const error = thrown instanceof Error ? thrown : new Error(String(thrown));
      results.push({ dataset: datasetId, error });

      if (errorStrategy === 'abort') {
        break;
      }
    }
  }

  return {
    results,
    totalDurationMs: Date.now() - startTime,
  };
}
