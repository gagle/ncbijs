import type {
  DatasetSyncState,
  UpdateCheckResult,
  UpdateChecker,
} from '../interfaces/sync.interface';

/** Checks for updates by comparing the Last-Modified header of an HTTP resource. */
export class HttpTimestampChecker implements UpdateChecker {
  public readonly dataset: string;
  private readonly _url: string;

  constructor(dataset: string, url: string) {
    this.dataset = dataset;
    this._url = url;
  }

  public async check(currentState: DatasetSyncState): Promise<UpdateCheckResult> {
    const response = await fetch(this._url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'ncbijs-sync' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} checking ${this._url}`);
    }

    const lastModified = response.headers.get('last-modified');

    if (lastModified === null) {
      return { hasUpdate: true, sourceTimestamp: undefined, checksum: undefined };
    }

    const hasUpdate =
      currentState.lastSourceTimestamp === undefined ||
      lastModified !== currentState.lastSourceTimestamp;

    return { hasUpdate, sourceTimestamp: lastModified, checksum: undefined };
  }
}
