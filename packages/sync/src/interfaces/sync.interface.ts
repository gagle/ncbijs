/** Persistent state for a single dataset's sync progress. */
export interface DatasetSyncState {
  readonly dataset: string;
  readonly lastSyncedAt: string | undefined;
  readonly lastSourceTimestamp: string | undefined;
  readonly lastChecksum: string | undefined;
  readonly lastProcessedFile: string | undefined;
  readonly recordCount: number;
  readonly status: 'idle' | 'checking' | 'syncing' | 'error';
  readonly lastError: string | undefined;
}

/** Result of checking an NCBI source for updates. */
export interface UpdateCheckResult {
  readonly hasUpdate: boolean;
  readonly sourceTimestamp: string | undefined;
  readonly checksum: string | undefined;
}

/** Checks a single NCBI data source for available updates. */
export interface UpdateChecker {
  readonly dataset: string;
  readonly check: (currentState: DatasetSyncState) => Promise<UpdateCheckResult>;
}

/** Configuration for the sync scheduler. */
export interface SyncSchedulerConfig {
  readonly checkIntervalMs: number;
  readonly datasets: ReadonlyArray<string>;
  readonly signal?: AbortSignal;
  readonly onUpdate?: (dataset: string) => Promise<void>;
  readonly onError?: (dataset: string, error: Error) => void;
}

/** Persists and retrieves sync state for datasets. */
export interface SyncStateStore {
  readonly getState: (dataset: string) => Promise<DatasetSyncState>;
  readonly setState: (dataset: string, state: Partial<DatasetSyncState>) => Promise<void>;
  readonly getAllStates: () => Promise<ReadonlyArray<DatasetSyncState>>;
}
