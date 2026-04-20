import { describe, expect, it } from 'vitest';

import { parseBioC } from './parse-bioc.js';

const BIOC_JSON_SINGLE = JSON.stringify({
  documents: [
    {
      id: '12345',
      passages: [
        {
          infons: { type: 'title' },
          text: 'Study of BRCA1',
          offset: 0,
          annotations: [
            {
              text: 'BRCA1',
              infons: { type: 'Gene', identifier: '672' },
              locations: [{ offset: 9, length: 5 }],
            },
          ],
        },
      ],
    },
  ],
});

const BIOC_JSON_MULTI = JSON.stringify({
  documents: [
    {
      id: '11111',
      passages: [{ infons: { type: 'title' }, text: 'First', offset: 0, annotations: [] }],
    },
    {
      id: '22222',
      passages: [{ infons: { type: 'title' }, text: 'Second', offset: 0, annotations: [] }],
    },
  ],
});

const BIOC_XML_SINGLE = `<?xml version="1.0" encoding="UTF-8"?>
<collection>
  <document>
    <id>12345</id>
    <passage>
      <infon key="type">title</infon>
      <text>Study of BRCA1</text>
      <offset>0</offset>
      <annotation>
        <infon key="type">Gene</infon>
        <infon key="identifier">672</infon>
        <text>BRCA1</text>
        <location offset="9" length="5" />
      </annotation>
    </passage>
  </document>
</collection>`;

describe('parseBioC', () => {
  describe('JSON input', () => {
    it('should parse BioC JSON format', () => {
      const result = parseBioC(BIOC_JSON_SINGLE);
      expect(result.documents).toHaveLength(1);
    });

    it('should extract documents array', () => {
      const result = parseBioC(BIOC_JSON_SINGLE);
      expect(result.documents[0]?.id).toBe('12345');
    });

    it('should extract passages with type, text, offset', () => {
      const result = parseBioC(BIOC_JSON_SINGLE);
      const passage = result.documents[0]?.passages[0];
      expect(passage?.type).toBe('title');
      expect(passage?.text).toBe('Study of BRCA1');
      expect(passage?.offset).toBe(0);
    });

    it('should extract annotations with text, type, id, offset, length', () => {
      const result = parseBioC(BIOC_JSON_SINGLE);
      const annotation = result.documents[0]?.passages[0]?.annotations[0];
      expect(annotation?.text).toBe('BRCA1');
      expect(annotation?.type).toBe('Gene');
      expect(annotation?.id).toBe('672');
      expect(annotation?.offset).toBe(9);
      expect(annotation?.length).toBe(5);
    });

    it('should handle document with no annotations', () => {
      const input = JSON.stringify({
        documents: [
          {
            id: '99999',
            passages: [
              { infons: { type: 'title' }, text: 'No entities', offset: 0, annotations: [] },
            ],
          },
        ],
      });
      const result = parseBioC(input);
      expect(result.documents[0]?.passages[0]?.annotations).toEqual([]);
    });

    it('should handle multiple documents', () => {
      const result = parseBioC(BIOC_JSON_MULTI);
      expect(result.documents).toHaveLength(2);
      expect(result.documents[0]?.id).toBe('11111');
      expect(result.documents[1]?.id).toBe('22222');
    });

    it('should parse PubTator3 wrapper format', () => {
      const input = JSON.stringify({
        PubTator3: [
          {
            id: '33856027',
            passages: [
              { infons: { type: 'title' }, text: 'Brain study', offset: 0, annotations: [] },
            ],
          },
        ],
      });
      const result = parseBioC(input);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]?.id).toBe('33856027');
    });
  });

  describe('XML input', () => {
    it('should parse BioC XML format', () => {
      const result = parseBioC(BIOC_XML_SINGLE);
      expect(result.documents).toHaveLength(1);
    });

    it('should extract documents from XML', () => {
      const result = parseBioC(BIOC_XML_SINGLE);
      expect(result.documents[0]?.id).toBe('12345');
    });

    it('should extract passages from XML', () => {
      const result = parseBioC(BIOC_XML_SINGLE);
      const passage = result.documents[0]?.passages[0];
      expect(passage?.type).toBe('title');
      expect(passage?.text).toBe('Study of BRCA1');
      expect(passage?.offset).toBe(0);
    });

    it('should extract annotations from XML', () => {
      const result = parseBioC(BIOC_XML_SINGLE);
      const annotation = result.documents[0]?.passages[0]?.annotations[0];
      expect(annotation?.text).toBe('BRCA1');
      expect(annotation?.type).toBe('Gene');
      expect(annotation?.id).toBe('672');
      expect(annotation?.offset).toBe(9);
      expect(annotation?.length).toBe(5);
    });

    it('should handle XML with namespaces', () => {
      const xml = `<?xml version="1.0"?>
<collection xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <document>
    <id>55555</id>
    <passage>
      <infon key="type">abstract</infon>
      <text>Abstract text</text>
      <offset>100</offset>
    </passage>
  </document>
</collection>`;
      const result = parseBioC(xml);
      expect(result.documents[0]?.id).toBe('55555');
      expect(result.documents[0]?.passages[0]?.type).toBe('abstract');
    });
  });

  describe('error handling', () => {
    it('should throw on invalid JSON', () => {
      expect(() => parseBioC('{invalid json}')).toThrow('Invalid JSON input');
    });

    it('should throw on invalid XML', () => {
      expect(() => parseBioC('<root>no document here</root>')).toThrow(
        'Invalid XML input: no BioC document or collection found',
      );
    });

    it('should throw on empty input', () => {
      expect(() => parseBioC('')).toThrow('Empty input');
      expect(() => parseBioC('   ')).toThrow('Empty input');
    });

    it('should throw on unexpected format', () => {
      expect(() => parseBioC('plain text input')).toThrow(
        'Unexpected format: input must be JSON or XML',
      );
    });
  });
});
