import type { BlastPollResult, BlastStatus, BlastSubmitResult } from './interfaces/blast.interface';

const VALID_STATUSES = new Set<string>(['waiting', 'ready', 'failed', 'unknown']);

function isBlastStatus(value: string): value is BlastStatus {
  return VALID_STATUSES.has(value);
}

function extractField(text: string, fieldName: string): string | undefined {
  const pattern = new RegExp(`^\\s*${fieldName}\\s*=\\s*(.+)$`, 'm');
  const match = pattern.exec(text);

  if (match?.[1] === undefined) {
    return undefined;
  }

  return match[1].trim();
}

export function parseSubmitResponse(responseText: string): BlastSubmitResult {
  const rid = extractField(responseText, 'RID');

  if (rid === undefined) {
    throw new Error('BLAST submit response missing RID');
  }

  const rtoe = extractField(responseText, 'RTOE');
  const estimatedSeconds = rtoe !== undefined ? Number(rtoe) : 0;

  return { rid, estimatedSeconds };
}

export function parsePollResponse(responseText: string): BlastPollResult {
  const rawStatus = extractField(responseText, 'Status');

  if (rawStatus === undefined) {
    throw new Error('BLAST poll response missing Status');
  }

  const normalizedStatus = rawStatus.toLowerCase();

  if (!isBlastStatus(normalizedStatus)) {
    throw new Error(`BLAST poll response has unexpected status: ${rawStatus}`);
  }

  return { status: normalizedStatus };
}
