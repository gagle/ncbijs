import { describe, expect, it } from 'vitest';
import { MeSH } from '@ncbijs/mesh';

const mesh = new MeSH({ descriptors: [] });

describe('MeSH E2E', () => {
  describe('lookupOnline', () => {
    it('should find descriptors matching a query', async () => {
      const results = await mesh.lookupOnline('Asthma');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name');
    });
  });

  describe('sparql', () => {
    it('should execute a SPARQL query and return results', async () => {
      const sparqlQuery = `
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
        SELECT ?descriptor ?label
        WHERE {
          ?descriptor a meshv:TopicalDescriptor .
          ?descriptor rdfs:label ?label .
          FILTER(REGEX(?label, "^Asthma$", "i"))
        }
        LIMIT 5
      `;

      const result = await mesh.sparql(sparqlQuery);

      expect(result).toHaveProperty('head');
      expect(result).toHaveProperty('results');
      expect(result.head.vars.length).toBeGreaterThan(0);
      expect(Array.isArray(result.results.bindings)).toBe(true);
    });
  });
});
