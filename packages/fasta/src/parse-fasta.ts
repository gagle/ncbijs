import type { FastaRecord } from './interfaces/fasta.interface';

export function parseFasta(text: string): Array<FastaRecord> {
  const records: Array<FastaRecord> = [];
  const lines = text.split(/\r?\n/);

  let currentId = '';
  let currentDescription = '';
  let sequenceChunks: Array<string> = [];

  for (const line of lines) {
    if (line.startsWith(';') || line.trim() === '') {
      continue;
    }

    if (line.startsWith('>')) {
      if (currentId !== '') {
        records.push({
          id: currentId,
          description: currentDescription,
          sequence: sequenceChunks.join(''),
        });
      }

      const header = line.slice(1);
      const spaceIndex = header.indexOf(' ');

      if (spaceIndex === -1) {
        currentId = header.trim();
        currentDescription = '';
      } else {
        currentId = header.slice(0, spaceIndex);
        currentDescription = header.slice(spaceIndex + 1).trim();
      }

      sequenceChunks = [];
      continue;
    }

    sequenceChunks.push(line.trim());
  }

  if (currentId !== '') {
    records.push({
      id: currentId,
      description: currentDescription,
      sequence: sequenceChunks.join(''),
    });
  }

  return records;
}
