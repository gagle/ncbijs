import type { DatasetSyncState, SyncStateStore } from './interfaces/sync.interface';

function createDefaultState(dataset: string): DatasetSyncState {
  return {
    dataset,
    lastSyncedAt: undefined,
    lastSourceTimestamp: undefined,
    lastChecksum: undefined,
    lastProcessedFile: undefined,
    recordCount: 0,
    status: 'idle',
    lastError: undefined,
  };
}

/** In-memory sync state store for testing and lightweight use cases. */
export class InMemorySyncState implements SyncStateStore {
  private readonly _states = new Map<string, DatasetSyncState>();

  public async getState(dataset: string): Promise<DatasetSyncState> {
    return this._states.get(dataset) ?? createDefaultState(dataset);
  }

  public async setState(dataset: string, partial: Partial<DatasetSyncState>): Promise<void> {
    const current = this._states.get(dataset) ?? createDefaultState(dataset);
    this._states.set(dataset, { ...current, ...partial, dataset });
  }

  public async getAllStates(): Promise<ReadonlyArray<DatasetSyncState>> {
    return [...this._states.values()];
  }
}
