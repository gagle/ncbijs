import type { PubTatorAnnotation } from './interfaces/pubtator.interface';

const ANNOTATION_REGEX = /^(\d+)\t(\d+)\t(\d+)\t([^\t]*)\t([^\t]*)\t(.*)$/;

/** Parse PubTator TSV-format annotations into structured annotation records. */
export function parsePubTatorTsv(input: string): ReadonlyArray<PubTatorAnnotation> {
  if (!input.trim()) {
    return [];
  }

  const lines = input.split('\n');
  const annotations: Array<PubTatorAnnotation> = [];

  for (const line of lines) {
    const match = ANNOTATION_REGEX.exec(line);
    if (!match) continue;

    const pmid = match[1] ?? '';
    const start = parseInt(match[2] ?? '0', 10);
    const end = parseInt(match[3] ?? '0', 10);
    const text = match[4] ?? '';
    const type = match[5] ?? '';
    const id = match[6] ?? '';

    annotations.push({ pmid, start, end, text, type, id });
  }

  return annotations;
}
