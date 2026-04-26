import type {
  SyncSchedulerConfig,
  SyncStateStore,
  UpdateChecker,
} from './interfaces/sync.interface';

/** Periodically checks NCBI sources for updates and triggers pipeline re-runs. */
export class SyncScheduler {
  private readonly _stateStore: SyncStateStore;
  private readonly _checkers: ReadonlyMap<string, UpdateChecker>;
  private readonly _config: SyncSchedulerConfig;
  private _intervalId: ReturnType<typeof setInterval> | undefined;
  private _checking = false;

  constructor(
    stateStore: SyncStateStore,
    checkers: ReadonlyArray<UpdateChecker>,
    config: SyncSchedulerConfig,
  ) {
    this._stateStore = stateStore;
    this._checkers = new Map(checkers.map((checker) => [checker.dataset, checker]));
    this._config = config;
  }

  /** Start the scheduler: check immediately, then on interval. */
  public async start(): Promise<void> {
    if (this._intervalId !== undefined) {
      return;
    }

    await this.checkOnce();

    this._intervalId = setInterval(() => {
      void this.checkOnce();
    }, this._config.checkIntervalMs);

    this._config.signal?.addEventListener('abort', () => {
      this.stop();
    });
  }

  /** Stop the scheduler interval. */
  public stop(): void {
    if (this._intervalId !== undefined) {
      clearInterval(this._intervalId);
      this._intervalId = undefined;
    }
  }

  /** Run a single check cycle across all configured datasets. */
  public async checkOnce(): Promise<ReadonlyArray<string>> {
    if (this._checking) {
      return [];
    }

    this._checking = true;

    try {
      return await this._runCheckCycle();
    } finally {
      this._checking = false;
    }
  }

  private async _runCheckCycle(): Promise<ReadonlyArray<string>> {
    const updatedDatasets: Array<string> = [];

    for (const dataset of this._config.datasets) {
      if (this._config.signal?.aborted === true) {
        break;
      }

      const checker = this._checkers.get(dataset);
      if (checker === undefined) {
        continue;
      }

      try {
        await this._stateStore.setState(dataset, { status: 'checking' });
        const currentState = await this._stateStore.getState(dataset);
        const result = await checker.check(currentState);

        if (!result.hasUpdate) {
          await this._stateStore.setState(dataset, { status: 'idle' });
          continue;
        }

        await this._stateStore.setState(dataset, { status: 'syncing' });

        if (this._config.onUpdate !== undefined) {
          await this._config.onUpdate(dataset);
        }

        await this._stateStore.setState(dataset, {
          status: 'idle',
          lastSyncedAt: new Date().toISOString(),
          lastSourceTimestamp: result.sourceTimestamp,
          lastChecksum: result.checksum,
          lastError: undefined,
        });

        updatedDatasets.push(dataset);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this._stateStore.setState(dataset, {
          status: 'error',
          lastError: errorMessage,
        });

        if (this._config.onError !== undefined) {
          this._config.onError(dataset, error instanceof Error ? error : new Error(errorMessage));
        }
      }
    }

    return updatedDatasets;
  }
}
