import type { EPostResult } from '../types/responses';
import { readTag } from '../xml-reader';

export function parseEPostXml(xml: string): EPostResult {
  const webEnv = readTag(xml, 'WebEnv');
  const queryKey = readTag(xml, 'QueryKey');

  if (!webEnv || !queryKey) {
    throw new Error('Invalid EPost response: missing WebEnv or QueryKey');
  }

  return {
    webEnv,
    queryKey: Number(queryKey),
  };
}
