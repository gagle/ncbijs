import { InMemorySyncState } from './in-memory-sync-state';
import { SyncScheduler } from './sync-scheduler';
import type { UpdateChecker, UpdateCheckResult } from './interfaces/sync.interface';

function createMockChecker(dataset: string, result: UpdateCheckResult): UpdateChecker {
  return {
    dataset,
    check: vi.fn().mockResolvedValue(result),
  };
}

describe('SyncScheduler', () => {
  let stateStore: InMemorySyncState;

  beforeEach(() => {
    stateStore = new InMemorySyncState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs onUpdate callback for datasets with updates', async () => {
    const updatedDatasets: Array<string> = [];
    const checker = createMockChecker('mesh', {
      hasUpdate: true,
      sourceTimestamp: '2025-01-15',
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [checker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh'],
      onUpdate: async (dataset) => {
        updatedDatasets.push(dataset);
      },
    });

    const result = await scheduler.checkOnce();

    expect(result).toEqual(['mesh']);
    expect(updatedDatasets).toEqual(['mesh']);

    const state = await stateStore.getState('mesh');
    expect(state.status).toBe('idle');
    expect(state.lastSourceTimestamp).toBe('2025-01-15');
    expect(state.lastSyncedAt).toBeDefined();

    scheduler.stop();
  });

  it('skips datasets without updates', async () => {
    const updatedDatasets: Array<string> = [];
    const checker = createMockChecker('mesh', {
      hasUpdate: false,
      sourceTimestamp: '2025-01-15',
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [checker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh'],
      onUpdate: async (dataset) => {
        updatedDatasets.push(dataset);
      },
    });

    const result = await scheduler.checkOnce();

    expect(result).toEqual([]);
    expect(updatedDatasets).toEqual([]);

    const state = await stateStore.getState('mesh');
    expect(state.status).toBe('idle');

    scheduler.stop();
  });

  it('handles checker errors and sets error state', async () => {
    const errors: Array<{ dataset: string; message: string }> = [];
    const failingChecker: UpdateChecker = {
      dataset: 'genes',
      check: vi.fn().mockRejectedValue(new Error('Network timeout')),
    };

    const scheduler = new SyncScheduler(stateStore, [failingChecker], {
      checkIntervalMs: 60_000,
      datasets: ['genes'],
      onError: (dataset, error) => {
        errors.push({ dataset, message: error.message });
      },
    });

    const result = await scheduler.checkOnce();

    expect(result).toEqual([]);
    expect(errors).toEqual([{ dataset: 'genes', message: 'Network timeout' }]);

    const state = await stateStore.getState('genes');
    expect(state.status).toBe('error');
    expect(state.lastError).toBe('Network timeout');

    scheduler.stop();
  });

  it('skips datasets without a matching checker', async () => {
    const checker = createMockChecker('mesh', {
      hasUpdate: true,
      sourceTimestamp: '2025-01-15',
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [checker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh', 'nonexistent'],
    });

    const result = await scheduler.checkOnce();

    expect(result).toEqual(['mesh']);

    scheduler.stop();
  });

  it('checks multiple datasets in a single cycle', async () => {
    const meshChecker = createMockChecker('mesh', {
      hasUpdate: true,
      sourceTimestamp: 'ts-mesh',
      checksum: undefined,
    });
    const genesChecker = createMockChecker('genes', {
      hasUpdate: true,
      sourceTimestamp: 'ts-genes',
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [meshChecker, genesChecker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh', 'genes'],
    });

    const result = await scheduler.checkOnce();

    expect(result).toEqual(['mesh', 'genes']);

    scheduler.stop();
  });

  it('start() triggers immediate check and sets interval', async () => {
    const checker = createMockChecker('mesh', {
      hasUpdate: false,
      sourceTimestamp: undefined,
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [checker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh'],
    });

    await scheduler.start();

    expect(checker.check).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(checker.check).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('stop() clears the interval', async () => {
    const checker = createMockChecker('mesh', {
      hasUpdate: false,
      sourceTimestamp: undefined,
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [checker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh'],
    });

    await scheduler.start();
    scheduler.stop();

    await vi.advanceTimersByTimeAsync(120_000);

    expect(checker.check).toHaveBeenCalledTimes(1);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    const checker = createMockChecker('mesh', {
      hasUpdate: false,
      sourceTimestamp: undefined,
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [checker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh'],
      signal: controller.signal,
    });

    await scheduler.start();
    controller.abort();

    await vi.advanceTimersByTimeAsync(120_000);

    expect(checker.check).toHaveBeenCalledTimes(1);
  });

  it('stops checking remaining datasets when signal is aborted mid-cycle', async () => {
    const controller = new AbortController();
    const meshChecker: UpdateChecker = {
      dataset: 'mesh',
      check: vi.fn().mockImplementation(async () => {
        controller.abort();
        return { hasUpdate: false, sourceTimestamp: undefined, checksum: undefined };
      }),
    };
    const genesChecker = createMockChecker('genes', {
      hasUpdate: true,
      sourceTimestamp: 'ts',
      checksum: undefined,
    });

    const scheduler = new SyncScheduler(stateStore, [meshChecker, genesChecker], {
      checkIntervalMs: 60_000,
      datasets: ['mesh', 'genes'],
      signal: controller.signal,
    });

    const result = await scheduler.checkOnce();

    expect(result).toEqual([]);
    expect(genesChecker.check).not.toHaveBeenCalled();

    scheduler.stop();
  });
});
