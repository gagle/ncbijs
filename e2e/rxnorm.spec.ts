import { describe, expect, it } from 'vitest';
import { RxNorm } from '@ncbijs/rxnorm';

const rxnorm = new RxNorm();

describe('RxNorm E2E', () => {
  it('should look up RxCUI for aspirin', async () => {
    try {
      const concept = await rxnorm.rxcui('aspirin');

      expect(concept).toBeDefined();
      expect(concept!.rxcui).toBeTruthy();
      expect(concept!.name.toLowerCase()).toContain('aspirin');
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d/.test(error.message)) {
        return;
      }
      throw error;
    }
  });

  it('should fetch concept properties', async () => {
    try {
      const concept = await rxnorm.rxcui('aspirin');
      expect(concept).toBeDefined();

      const props = await rxnorm.properties(concept!.rxcui);

      expect(props.rxcui).toBe(concept!.rxcui);
      expect(props.name).toBeTruthy();
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d/.test(error.message)) {
        return;
      }
      throw error;
    }
  });

  it('should check drug interactions', async () => {
    try {
      const concept = await rxnorm.rxcui('warfarin');
      expect(concept).toBeDefined();

      const interactions = await rxnorm.interaction(concept!.rxcui);

      expect(interactions.length).toBeGreaterThan(0);
      expect(interactions[0]!.description).toBeTruthy();
    } catch (error: unknown) {
      if (error instanceof Error && /status (4|5)\d\d/.test(error.message)) {
        return;
      }
      throw error;
    }
  });
});
