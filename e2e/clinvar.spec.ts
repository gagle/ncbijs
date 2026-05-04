import { describe, expect, it } from 'vitest';
import { ClinVar } from '@ncbijs/clinvar';
import { ncbiApiKey } from './test-config';

const clinvar = new ClinVar({
  apiKey: ncbiApiKey,
});

describe('ClinVar E2E', () => {
  it('should search for BRCA1 variants', async () => {
    const searchResult = await clinvar.search('BRCA1[gene]', { retmax: 5 });

    expect(searchResult.total).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeGreaterThan(0);
    expect(searchResult.ids.length).toBeLessThanOrEqual(5);
  });

  it('should fetch variant details by UID', async () => {
    const searchResult = await clinvar.search('BRCA1[gene] AND pathogenic[clinsig]', { retmax: 1 });
    expect(searchResult.ids.length).toBeGreaterThan(0);

    const reports = await clinvar.fetch(searchResult.ids);

    expect(reports).toHaveLength(1);
    expect(reports[0]!.uid).toBeTruthy();
    expect(reports[0]!.title).toBeTruthy();
    expect(typeof reports[0]!.clinicalSignificance).toBe('string');
  });
});
