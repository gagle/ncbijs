import { describe, expect, it } from 'vitest';
import { parseTaxonomyDump } from './parse-taxonomy-dump';

const NAMES_DMP = [
  '1\t|\tall\t|\t\t|\tsynonym\t|',
  '1\t|\troot\t|\t\t|\tscientific name\t|',
  '2\t|\tBacteria\t|\tBacteria <bacteria>\t|\tscientific name\t|',
  '2\t|\teubacteria\t|\t\t|\tgenbank common name\t|',
  '6\t|\tAzorhizobium\t|\t\t|\tscientific name\t|',
  '7\t|\tAzorhizobium caulinodans\t|\t\t|\tscientific name\t|',
  '7\t|\tnitrogen-fixing bacterium\t|\t\t|\tcommon name\t|',
].join('\n');

const NODES_DMP = [
  '1\t|\t1\t|\tno rank\t|\t\t|',
  '2\t|\t1\t|\tsuperkingdom\t|\t\t|',
  '6\t|\t2\t|\tgenus\t|\t\t|',
  '7\t|\t6\t|\tspecies\t|\t\t|',
].join('\n');

describe('parseTaxonomyDump', () => {
  it('parses all taxonomy nodes', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });

    expect(result).toHaveLength(4);
  });

  it('extracts scientific name as organismName', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const bacteria = result.find((r) => r.taxId === 2);

    expect(bacteria?.organismName).toBe('Bacteria');
  });

  it('extracts common name', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const bacteria = result.find((r) => r.taxId === 2);

    expect(bacteria?.commonName).toBe('eubacteria');
  });

  it('prefers genbank common name over common name', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const species = result.find((r) => r.taxId === 7);

    expect(species?.commonName).toBe('nitrogen-fixing bacterium');
  });

  it('extracts rank', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const bacteria = result.find((r) => r.taxId === 2);

    expect(bacteria?.rank).toBe('superkingdom');
  });

  it('computes lineage from parent chain', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const species = result.find((r) => r.taxId === 7);

    expect(species?.lineage).toEqual([6, 2, 1]);
  });

  it('computes children from reverse parent mapping', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const root = result.find((r) => r.taxId === 1);
    const bacteria = result.find((r) => r.taxId === 2);

    expect(root?.children).toEqual([2]);
    expect(bacteria?.children).toEqual([6]);
  });

  it('root has empty lineage', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const root = result.find((r) => r.taxId === 1);

    expect(root?.lineage).toEqual([]);
  });

  it('leaf nodes have empty children', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });
    const species = result.find((r) => r.taxId === 7);

    expect(species?.children).toEqual([]);
  });

  it('sets counts to empty array', () => {
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: NODES_DMP });

    for (const report of result) {
      expect(report.counts).toEqual([]);
    }
  });

  it('returns empty array for empty input', () => {
    const result = parseTaxonomyDump({ namesDmp: '', nodesDmp: '' });

    expect(result).toEqual([]);
  });

  it('handles missing names gracefully', () => {
    const result = parseTaxonomyDump({ namesDmp: '', nodesDmp: NODES_DMP });
    const root = result.find((r) => r.taxId === 1);

    expect(root?.organismName).toBe('');
    expect(root?.commonName).toBe('');
  });

  it('skips malformed lines in names.dmp', () => {
    const badNames = 'not a valid line\n1\t|\troot\t|\t\t|\tscientific name\t|';
    const result = parseTaxonomyDump({ namesDmp: badNames, nodesDmp: NODES_DMP });
    const root = result.find((r) => r.taxId === 1);

    expect(root?.organismName).toBe('root');
  });

  it('skips malformed lines in nodes.dmp', () => {
    const badNodes = 'not valid\n1\t|\t1\t|\tno rank\t|\t\t|';
    const result = parseTaxonomyDump({ namesDmp: NAMES_DMP, nodesDmp: badNodes });

    expect(result).toHaveLength(1);
  });
});
