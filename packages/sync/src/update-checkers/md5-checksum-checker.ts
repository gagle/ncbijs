import type {
  DatasetSyncState,
  UpdateCheckResult,
  UpdateChecker,
} from '../interfaces/sync.interface';

const MD5_PATTERN = /\b[0-9a-f]{32}\b/i;

/** Extracts the 32-character hex MD5 hash from GNU md5sum output (`<hash>  <filename>`). */
export function parseMd5(text: string): string {
  const match = MD5_PATTERN.exec(text.trim());

  if (match === null) {
    throw new Error(`Could not parse MD5 hash from: ${text.trim().slice(0, 100)}`);
  }

  return match[0].toLowerCase();
}

/** Checks for updates by comparing the MD5 checksum of a companion `.md5` file. */
export class Md5ChecksumChecker implements UpdateChecker {
  public readonly dataset: string;
  private readonly _md5Url: string;

  constructor(dataset: string, md5Url: string) {
    this.dataset = dataset;
    this._md5Url = md5Url;
  }

  public async check(currentState: DatasetSyncState): Promise<UpdateCheckResult> {
    const response = await fetch(this._md5Url, {
      headers: { 'User-Agent': 'ncbijs-sync' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)} fetching ${this._md5Url}`);
    }

    const body = await response.text();
    const checksum = parseMd5(body);

    const hasUpdate =
      currentState.lastChecksum === undefined || checksum !== currentState.lastChecksum;

    return { hasUpdate, sourceTimestamp: undefined, checksum };
  }
}
