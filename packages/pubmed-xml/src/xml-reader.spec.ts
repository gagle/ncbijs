import { describe, expect, it } from 'vitest';
import {
  decodeEntities,
  readAllBlocks,
  readAllBlocksWithAttributes,
  readAllTags,
  readAllTagsWithAttributes,
  readAttribute,
  readBlock,
  readTag,
  readTagWithAttributes,
  stripTags,
} from './xml-reader';

describe('readTag', () => {
  it('should extract text content of a tag', () => {
    expect(readTag('<PMID>12345</PMID>', 'PMID')).toBe('12345');
  });

  it('should return undefined when tag is absent', () => {
    expect(readTag('<Year>2024</Year>', 'Month')).toBeUndefined();
  });

  it('should decode entities in text content', () => {
    expect(readTag('<Title>A &amp; B</Title>', 'Title')).toBe('A & B');
  });

  it('should handle tag with attributes', () => {
    expect(readTag('<PMID Version="1">12345</PMID>', 'PMID')).toBe('12345');
  });
});

describe('readAllTags', () => {
  it('should extract all occurrences', () => {
    const xml = '<Id>1</Id><Id>2</Id><Id>3</Id>';
    expect(readAllTags(xml, 'Id')).toEqual(['1', '2', '3']);
  });

  it('should return empty array when no matches', () => {
    expect(readAllTags('<Foo>bar</Foo>', 'Baz')).toEqual([]);
  });
});

describe('readBlock', () => {
  it('should extract nested content', () => {
    const xml = '<Journal><Title>Nature</Title><ISSN>1234</ISSN></Journal>';
    expect(readBlock(xml, 'Journal')).toBe('<Title>Nature</Title><ISSN>1234</ISSN>');
  });

  it('should handle nested same-name tags', () => {
    const xml = '<Outer><Outer>inner</Outer></Outer>';
    expect(readBlock(xml, 'Outer')).toBe('<Outer>inner</Outer>');
  });

  it('should return undefined when block is absent', () => {
    expect(readBlock('<Foo>bar</Foo>', 'Baz')).toBeUndefined();
  });

  it('should handle self-closing tags', () => {
    expect(readBlock('<Empty />', 'Empty')).toBe('');
  });
});

describe('readAllBlocks', () => {
  it('should extract all block occurrences', () => {
    const xml = '<Grant><GrantID>1</GrantID></Grant><Grant><GrantID>2</GrantID></Grant>';
    expect(readAllBlocks(xml, 'Grant')).toEqual(['<GrantID>1</GrantID>', '<GrantID>2</GrantID>']);
  });
});

describe('readAttribute', () => {
  it('should extract attribute value', () => {
    const xml = '<ArticleId IdType="doi">10.1000/test</ArticleId>';
    expect(readAttribute(xml, 'ArticleId', 'IdType')).toBe('doi');
  });

  it('should return undefined when attribute is absent', () => {
    const xml = '<ArticleId>12345</ArticleId>';
    expect(readAttribute(xml, 'ArticleId', 'IdType')).toBeUndefined();
  });

  it('should not match when attribute name is a suffix of another attribute', () => {
    const xml = '<Tag FooType="wrong" Type="right">text</Tag>';
    expect(readAttribute(xml, 'Tag', 'Type')).toBe('right');
  });
});

describe('decodeEntities', () => {
  it('should decode named entities', () => {
    expect(decodeEntities('&amp;&lt;&gt;&quot;&apos;')).toBe('&<>"\'');
  });

  it('should decode hex numeric entities', () => {
    expect(decodeEntities('&#x41;')).toBe('A');
  });

  it('should decode decimal numeric entities', () => {
    expect(decodeEntities('&#65;')).toBe('A');
  });

  it('should pass through text without entities', () => {
    expect(decodeEntities('plain text')).toBe('plain text');
  });
});

describe('stripTags', () => {
  it('should remove all XML markup', () => {
    expect(stripTags('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
  });

  it('should handle self-closing tags', () => {
    expect(stripTags('text<br/>more')).toBe('textmore');
  });
});

describe('readTagWithAttributes', () => {
  it('should extract text and attributes from a leaf element', () => {
    const xml = '<DescriptorName UI="D001249" MajorTopicYN="N">Asthma</DescriptorName>';
    const result = readTagWithAttributes(xml, 'DescriptorName');
    expect(result).toEqual({
      text: 'Asthma',
      attributes: { UI: 'D001249', MajorTopicYN: 'N' },
    });
  });

  it('should return null when tag is absent', () => {
    expect(readTagWithAttributes('<Foo>bar</Foo>', 'Baz')).toBeNull();
  });

  it('should return empty attributes when tag has none', () => {
    const result = readTagWithAttributes('<Year>2024</Year>', 'Year');
    expect(result).toEqual({ text: '2024', attributes: {} });
  });

  it('should decode entities in attribute values', () => {
    const xml = '<Tag Attr="A &amp; B">text</Tag>';
    const result = readTagWithAttributes(xml, 'Tag');
    expect(result?.attributes['Attr']).toBe('A & B');
  });

  it('should extract ArticleId with IdType', () => {
    const xml = '<ArticleId IdType="doi">10.1000/example</ArticleId>';
    const result = readTagWithAttributes(xml, 'ArticleId');
    expect(result).toEqual({
      text: '10.1000/example',
      attributes: { IdType: 'doi' },
    });
  });

  it('should extract AbstractText with Label and NlmCategory', () => {
    const xml =
      '<AbstractText Label="METHODS" NlmCategory="METHODS">Method details.</AbstractText>';
    const result = readTagWithAttributes(xml, 'AbstractText');
    expect(result).toEqual({
      text: 'Method details.',
      attributes: { Label: 'METHODS', NlmCategory: 'METHODS' },
    });
  });
});

describe('readAllTagsWithAttributes', () => {
  it('should extract all leaf elements with attributes', () => {
    const xml =
      '<ArticleId IdType="pubmed">123</ArticleId>' +
      '<ArticleId IdType="doi">10.1/x</ArticleId>' +
      '<ArticleId IdType="pmc">PMC456</ArticleId>';
    const results = readAllTagsWithAttributes(xml, 'ArticleId');
    expect(results).toEqual([
      { text: '123', attributes: { IdType: 'pubmed' } },
      { text: '10.1/x', attributes: { IdType: 'doi' } },
      { text: 'PMC456', attributes: { IdType: 'pmc' } },
    ]);
  });

  it('should return empty array when no matches', () => {
    expect(readAllTagsWithAttributes('<Foo>bar</Foo>', 'Baz')).toEqual([]);
  });

  it('should extract Keyword elements with MajorTopicYN', () => {
    const xml =
      '<Keyword MajorTopicYN="N">cytokines</Keyword>' +
      '<Keyword MajorTopicYN="Y">interleukins</Keyword>';
    const results = readAllTagsWithAttributes(xml, 'Keyword');
    expect(results).toEqual([
      { text: 'cytokines', attributes: { MajorTopicYN: 'N' } },
      { text: 'interleukins', attributes: { MajorTopicYN: 'Y' } },
    ]);
  });

  it('should extract QualifierName elements', () => {
    const xml =
      '<QualifierName UI="Q000188" MajorTopicYN="Y">drug therapy</QualifierName>' +
      '<QualifierName UI="Q000503" MajorTopicYN="N">physiopathology</QualifierName>';
    const results = readAllTagsWithAttributes(xml, 'QualifierName');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      text: 'drug therapy',
      attributes: { UI: 'Q000188', MajorTopicYN: 'Y' },
    });
  });
});

describe('readAllBlocksWithAttributes', () => {
  it('should extract nested blocks with opening-tag attributes', () => {
    const xml =
      '<KeywordList Owner="NLM">' +
      '<Keyword MajorTopicYN="N">term1</Keyword>' +
      '</KeywordList>' +
      '<KeywordList Owner="NOTNLM">' +
      '<Keyword MajorTopicYN="Y">term2</Keyword>' +
      '</KeywordList>';
    const results = readAllBlocksWithAttributes(xml, 'KeywordList');
    expect(results).toHaveLength(2);
    expect(results[0]?.attributes).toEqual({ Owner: 'NLM' });
    expect(results[0]?.content).toContain('term1');
    expect(results[1]?.attributes).toEqual({ Owner: 'NOTNLM' });
    expect(results[1]?.content).toContain('term2');
  });

  it('should return empty array when no matches', () => {
    expect(readAllBlocksWithAttributes('<Foo>bar</Foo>', 'Baz')).toEqual([]);
  });

  it('should extract CommentsCorrections with RefType', () => {
    const xml =
      '<CommentsCorrections RefType="ErratumIn">' +
      '<RefSource>J Example. 2024;10:100</RefSource>' +
      '<PMID>99999</PMID>' +
      '</CommentsCorrections>';
    const results = readAllBlocksWithAttributes(xml, 'CommentsCorrections');
    expect(results).toHaveLength(1);
    expect(results[0]?.attributes).toEqual({ RefType: 'ErratumIn' });
    expect(results[0]?.content).toContain('<RefSource>');
    expect(results[0]?.content).toContain('<PMID>');
  });

  it('should handle self-closing blocks', () => {
    const xml = '<Empty Attr="val" />';
    const results = readAllBlocksWithAttributes(xml, 'Empty');
    expect(results).toEqual([{ content: '', attributes: { Attr: 'val' } }]);
  });
});
