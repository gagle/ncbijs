import { describe, expect, it } from 'vitest';
import { ICite } from '@ncbijs/icite';

const icite = new ICite();

describe('iCite E2E', () => {
  it('should fetch citation metrics for a single PMID', async () => {
    const pubs = await icite.publications([33533846]);

    expect(pubs).toHaveLength(1);
    expect(pubs[0]!.pmid).toBe(33533846);
    expect(pubs[0]!.title).toBeTruthy();
    expect(pubs[0]!.year).toBeGreaterThan(2000);
    expect(pubs[0]!.citedByCount).toBeGreaterThanOrEqual(0);
  });

  it('should fetch citation metrics for multiple PMIDs', async () => {
    const pubs = await icite.publications([33533846, 17284678]);

    expect(pubs).toHaveLength(2);
    expect(pubs.map((p) => p.pmid).sort()).toEqual([17284678, 33533846]);
  });
});
