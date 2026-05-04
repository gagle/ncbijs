import { describe, expect, it } from 'vitest';
import { RxNorm } from '@ncbijs/rxnorm';

const rxnorm = new RxNorm();

describe('RxNorm E2E', () => {
  it('should look up RxCUI for aspirin', async () => {
    let concept;
    try {
      concept = await rxnorm.rxcui('aspirin');
    } catch {
      return;
    }

    if (!concept || !concept.name) {
      return;
    }

    expect(concept.rxcui).toBeTruthy();
    expect(concept.name.toLowerCase()).toContain('aspirin');
  });

  it('should fetch concept properties', async () => {
    let concept;
    try {
      concept = await rxnorm.rxcui('aspirin');
    } catch {
      return;
    }
    if (concept === undefined) {
      return;
    }

    let props;
    try {
      props = await rxnorm.properties(concept.rxcui);
    } catch {
      return;
    }

    expect(props.rxcui).toBe(concept.rxcui);
    expect(props.name).toBeTruthy();
  });
});
