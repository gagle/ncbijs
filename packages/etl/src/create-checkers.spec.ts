import { HttpTimestampChecker, Md5ChecksumChecker } from '@ncbijs/sync';
import { createCheckers } from './create-checkers';

describe('createCheckers', () => {
  it('returns a checker for every dataset when called without arguments', () => {
    const checkers = createCheckers();
    expect(checkers).toHaveLength(6);

    const datasets = checkers.map((checker) => checker.dataset);
    expect(datasets).toEqual(['mesh', 'clinvar', 'genes', 'taxonomy', 'compounds', 'id-mappings']);
  });

  it('returns checkers for a subset when dataset IDs are provided', () => {
    const checkers = createCheckers(['clinvar', 'genes']);
    expect(checkers).toHaveLength(2);
    expect(checkers[0]?.dataset).toBe('clinvar');
    expect(checkers[1]?.dataset).toBe('genes');
  });

  it('uses Md5ChecksumChecker for datasets with .md5 companions', () => {
    const checkers = createCheckers(['clinvar', 'taxonomy', 'compounds']);

    for (const checker of checkers) {
      expect(checker).toBeInstanceOf(Md5ChecksumChecker);
    }
  });

  it('uses HttpTimestampChecker for datasets without .md5 companions', () => {
    const checkers = createCheckers(['mesh', 'genes', 'id-mappings']);

    for (const checker of checkers) {
      expect(checker).toBeInstanceOf(HttpTimestampChecker);
    }
  });

  it('returns an empty array for an empty dataset list', () => {
    const checkers = createCheckers([]);
    expect(checkers).toHaveLength(0);
  });
});
