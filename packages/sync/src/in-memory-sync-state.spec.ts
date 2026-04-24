import { InMemorySyncState } from './in-memory-sync-state';

describe('InMemorySyncState', () => {
  let store: InMemorySyncState;

  beforeEach(() => {
    store = new InMemorySyncState();
  });

  it('returns default state for unknown dataset', async () => {
    const state = await store.getState('mesh');

    expect(state.dataset).toBe('mesh');
    expect(state.status).toBe('idle');
    expect(state.recordCount).toBe(0);
    expect(state.lastSyncedAt).toBeUndefined();
    expect(state.lastSourceTimestamp).toBeUndefined();
    expect(state.lastChecksum).toBeUndefined();
    expect(state.lastProcessedFile).toBeUndefined();
    expect(state.lastError).toBeUndefined();
  });

  it('persists state updates', async () => {
    await store.setState('mesh', {
      status: 'syncing',
      lastSyncedAt: '2024-01-15T10:00:00Z',
      recordCount: 30000,
    });

    const state = await store.getState('mesh');

    expect(state.status).toBe('syncing');
    expect(state.lastSyncedAt).toBe('2024-01-15T10:00:00Z');
    expect(state.recordCount).toBe(30000);
  });

  it('merges partial updates without overwriting other fields', async () => {
    await store.setState('genes', { recordCount: 35000, status: 'idle' });
    await store.setState('genes', { lastChecksum: 'abc123' });

    const state = await store.getState('genes');

    expect(state.recordCount).toBe(35000);
    expect(state.lastChecksum).toBe('abc123');
    expect(state.status).toBe('idle');
  });

  it('preserves dataset name from key, not partial', async () => {
    await store.setState('taxonomy', { recordCount: 100 });

    const state = await store.getState('taxonomy');

    expect(state.dataset).toBe('taxonomy');
  });

  it('returns all stored states', async () => {
    await store.setState('mesh', { recordCount: 30000 });
    await store.setState('genes', { recordCount: 35000 });

    const allStates = await store.getAllStates();

    expect(allStates).toHaveLength(2);
    const datasets = allStates.map((s) => s.dataset);
    expect(datasets).toContain('mesh');
    expect(datasets).toContain('genes');
  });

  it('returns empty array when no states exist', async () => {
    const allStates = await store.getAllStates();

    expect(allStates).toEqual([]);
  });
});
