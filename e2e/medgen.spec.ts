import { describe, expect, it } from 'vitest';
import { MedGen } from '@ncbijs/medgen';

const medgen = new MedGen({
  apiKey: process.env['NCBI_API_KEY'],
});

describe('MedGen E2E', () => {
  it('should search for genetic conditions', async () => {
    const searchResult = await medgen.search('cystic fibrosis', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch concept details with parsed conceptmeta', async () => {
    const searchResult = await medgen.search('Marfan syndrome', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const concepts = await medgen.fetch(searchResult.ids);

    expect(concepts).toHaveLength(1);
    expect(concepts[0]!.uid).toBeTruthy();
    expect(concepts[0]!.title).toBeTruthy();
    expect(concepts[0]!.conceptId).toBeTruthy();
  });
});
