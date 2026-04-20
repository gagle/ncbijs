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
  removeAllBlocks,
  stripTags,
} from './xml-reader.js';

describe('readTag', () => {
  it('should extract text content of a simple tag', () => {
    expect(readTag('<Count>42</Count>', 'Count')).toBe('42');
  });

  it('should extract text from a tag with attributes', () => {
    expect(readTag('<Id type="int">12345</Id>', 'Id')).toBe('12345');
  });

  it('should return undefined when tag is not found', () => {
    expect(readTag('<Count>42</Count>', 'Missing')).toBeUndefined();
  });

  it('should return the first occurrence when multiple exist', () => {
    expect(readTag('<Id>111</Id><Id>222</Id>', 'Id')).toBe('111');
  });

  it('should decode XML entities in content', () => {
    expect(readTag('<Query>a &amp; b</Query>', 'Query')).toBe('a & b');
  });

  it('should decode numeric entities', () => {
    expect(readTag('<Val>&#60;tag&#62;</Val>', 'Val')).toBe('<tag>');
  });

  it('should decode hex entities', () => {
    expect(readTag('<Val>&#x3C;tag&#x3E;</Val>', 'Val')).toBe('<tag>');
  });

  it('should return empty string for tag with empty content', () => {
    expect(readTag('<Tag></Tag>', 'Tag')).toBe('');
  });

  it('should return undefined for empty input', () => {
    expect(readTag('', 'Tag')).toBeUndefined();
  });

  it('should handle tag surrounded by other tags', () => {
    const xml = '<Root><Name>first</Name><Count>42</Count><Name>second</Name></Root>';
    expect(readTag(xml, 'Count')).toBe('42');
  });

  it('should handle NCBI WebEnv format', () => {
    expect(readTag('<WebEnv>MCID_6789abcdef0123456789</WebEnv>', 'WebEnv')).toBe(
      'MCID_6789abcdef0123456789',
    );
  });

  it('should handle tag with multiple attributes', () => {
    expect(readTag('<Item Name="Title" Type="String">Hello</Item>', 'Item')).toBe('Hello');
  });

  it('should not match partial tag names', () => {
    const xml = '<CountryCode>US</CountryCode><Count>5</Count>';
    expect(readTag(xml, 'Count')).toBe('5');
  });

  it('should handle whitespace-only content', () => {
    expect(readTag('<Tag>   </Tag>', 'Tag')).toBe('   ');
  });

  it('should throw on invalid tag name', () => {
    expect(() => readTag('<x>1</x>', '"><script')).toThrow('Invalid XML tag name');
  });

  it('should throw on tag name starting with a digit', () => {
    expect(() => readTag('<1tag>x</1tag>', '1tag')).toThrow('Invalid XML tag name');
  });

  it('should throw on empty tag name', () => {
    expect(() => readTag('<x>1</x>', '')).toThrow('Invalid XML tag name');
  });

  it('should handle tag name with dots', () => {
    expect(readTag('<ns.Tag>value</ns.Tag>', 'ns.Tag')).toBe('value');
  });

  it('should handle tag name with hyphens', () => {
    expect(readTag('<my-tag>value</my-tag>', 'my-tag')).toBe('value');
  });

  it('should handle tag name starting with underscore', () => {
    expect(readTag('<_private>secret</_private>', '_private')).toBe('secret');
  });
});

describe('readAllTags', () => {
  it('should extract all occurrences', () => {
    expect(readAllTags('<Id>1</Id><Id>2</Id><Id>3</Id>', 'Id')).toEqual(['1', '2', '3']);
  });

  it('should return empty array when no matches', () => {
    expect(readAllTags('<Other>1</Other>', 'Id')).toEqual([]);
  });

  it('should return single-element array for one match', () => {
    expect(readAllTags('<Id>42</Id>', 'Id')).toEqual(['42']);
  });

  it('should decode entities in each result', () => {
    const xml = '<Q>a &amp; b</Q><Q>c &lt; d</Q>';
    expect(readAllTags(xml, 'Q')).toEqual(['a & b', 'c < d']);
  });

  it('should handle tags with attributes', () => {
    const xml = '<Id type="a">1</Id><Id type="b">2</Id>';
    expect(readAllTags(xml, 'Id')).toEqual(['1', '2']);
  });

  it('should handle tags at different nesting levels', () => {
    const xml = '<Root><List><Id>1</Id></List><Id>2</Id></Root>';
    expect(readAllTags(xml, 'Id')).toEqual(['1', '2']);
  });

  it('should handle empty input', () => {
    expect(readAllTags('', 'Id')).toEqual([]);
  });

  it('should handle large number of tags', () => {
    const xml = Array.from({ length: 100 }, (_, index) => `<Id>${index}</Id>`).join('');
    const result = readAllTags(xml, 'Id');
    expect(result).toHaveLength(100);
    expect(result[0]).toBe('0');
    expect(result[99]).toBe('99');
  });

  it('should handle NCBI IdList pattern', () => {
    const xml = `
      <IdList>
        <Id>38000001</Id>
        <Id>38000002</Id>
        <Id>38000003</Id>
      </IdList>`;
    expect(readAllTags(xml, 'Id')).toEqual(['38000001', '38000002', '38000003']);
  });
});

describe('readBlock', () => {
  it('should extract inner XML of a block', () => {
    expect(readBlock('<Outer><Inner>text</Inner></Outer>', 'Outer')).toBe('<Inner>text</Inner>');
  });

  it('should return undefined for missing tag', () => {
    expect(readBlock('<Other>x</Other>', 'Missing')).toBeUndefined();
  });

  it('should handle nested same-name tags', () => {
    const xml = '<A>before<A>inner</A>after</A>';
    expect(readBlock(xml, 'A')).toBe('before<A>inner</A>after');
  });

  it('should handle deeply nested same-name tags', () => {
    const xml = '<A><A><A>deep</A></A></A>';
    expect(readBlock(xml, 'A')).toBe('<A><A>deep</A></A>');
  });

  it('should handle self-closing tag', () => {
    expect(readBlock('<Tag />', 'Tag')).toBe('');
  });

  it('should not match self-closing tag without space', () => {
    expect(readBlock('<Tag/>', 'Tag')).toBeUndefined();
  });

  it('should handle block with attributes on opening tag', () => {
    const xml = '<Item Name="Title" Type="String">content</Item>';
    expect(readBlock(xml, 'Item')).toBe('content');
  });

  it('should handle block with multiple child elements', () => {
    const xml = '<Parent><A>1</A><B>2</B><C>3</C></Parent>';
    expect(readBlock(xml, 'Parent')).toBe('<A>1</A><B>2</B><C>3</C>');
  });

  it('should handle mixed content', () => {
    const xml = '<SpelledQuery><Replaced>asthma</Replaced> treatment</SpelledQuery>';
    expect(readBlock(xml, 'SpelledQuery')).toBe('<Replaced>asthma</Replaced> treatment');
  });

  it('should return only the first block', () => {
    const xml = '<B>first</B><B>second</B>';
    expect(readBlock(xml, 'B')).toBe('first');
  });

  it('should handle empty block', () => {
    expect(readBlock('<B></B>', 'B')).toBe('');
  });

  it('should handle block with newlines', () => {
    const xml = '<B>\n  <C>child</C>\n</B>';
    expect(readBlock(xml, 'B')).toBe('\n  <C>child</C>\n');
  });

  it('should return undefined for unclosed tag', () => {
    expect(readBlock('<B>unclosed', 'B')).toBeUndefined();
  });

  it('should throw on invalid tag name', () => {
    expect(() => readBlock('<x>1</x>', '"><script')).toThrow('Invalid XML tag name');
  });

  it('should handle self-closing tags inside a block without affecting depth', () => {
    const xml = '<Parent><Self /><Child>text</Child></Parent>';
    expect(readBlock(xml, 'Parent')).toBe('<Self /><Child>text</Child>');
  });

  it('should handle NCBI LinkSet block', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>123</Id></IdList>
      </LinkSet>
    </eLinkResult>`;
    const block = readBlock(xml, 'LinkSet');
    expect(block).toContain('<DbFrom>pubmed</DbFrom>');
    expect(block).toContain('<Id>123</Id>');
  });

  it('should handle NCBI DocSum block with nested Items', () => {
    const xml = `<eSummaryResult>
      <DocSum>
        <Id>12345</Id>
        <Item Name="AuthorList" Type="List">
          <Item Name="Author" Type="String">Smith J</Item>
        </Item>
      </DocSum>
    </eSummaryResult>`;
    const block = readBlock(xml, 'DocSum');
    expect(block).toContain('<Id>12345</Id>');
    expect(block).toContain('Smith J');
  });
});

describe('readAllBlocks', () => {
  it('should extract all blocks at the same level', () => {
    const xml = '<A>first</A><A>second</A><A>third</A>';
    expect(readAllBlocks(xml, 'A')).toEqual(['first', 'second', 'third']);
  });

  it('should return empty array when no matches', () => {
    expect(readAllBlocks('<Other>x</Other>', 'Missing')).toEqual([]);
  });

  it('should handle single block', () => {
    expect(readAllBlocks('<A>only</A>', 'A')).toEqual(['only']);
  });

  it('should handle nested same-name blocks correctly', () => {
    const xml = '<A>outer<A>inner</A></A><A>second</A>';
    const result = readAllBlocks(xml, 'A');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('outer<A>inner</A>');
    expect(result[1]).toBe('second');
  });

  it('should handle blocks with different content types', () => {
    const xml = '<B><C>child</C></B><B>text only</B><B><D/></B>';
    const result = readAllBlocks(xml, 'B');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('<C>child</C>');
    expect(result[1]).toBe('text only');
    expect(result[2]).toBe('<D/>');
  });

  it('should handle large number of blocks', () => {
    const xml = Array.from({ length: 50 }, (_, index) => `<Item>${index}</Item>`).join('');
    const result = readAllBlocks(xml, 'Item');
    expect(result).toHaveLength(50);
    expect(result[0]).toBe('0');
    expect(result[49]).toBe('49');
  });

  it('should handle NCBI multiple DocSum blocks', () => {
    const xml = `<eSummaryResult>
      <DocSum><Id>1</Id></DocSum>
      <DocSum><Id>2</Id></DocSum>
      <DocSum><Id>3</Id></DocSum>
    </eSummaryResult>`;
    const blocks = readAllBlocks(xml, 'DocSum');
    expect(blocks).toHaveLength(3);
    expect(readTag(blocks[0]!, 'Id')).toBe('1');
    expect(readTag(blocks[2]!, 'Id')).toBe('3');
  });

  it('should handle NCBI ResultItem blocks', () => {
    const xml = `<eGQueryResult>
      <ResultItem><DbName>pubmed</DbName><Count>250</Count><Status>Ok</Status></ResultItem>
      <ResultItem><DbName>pmc</DbName><Count>85</Count><Status>Ok</Status></ResultItem>
    </eGQueryResult>`;
    const blocks = readAllBlocks(xml, 'ResultItem');
    expect(blocks).toHaveLength(2);
  });

  it('should handle empty input', () => {
    expect(readAllBlocks('', 'Tag')).toEqual([]);
  });

  it('should handle self-closing blocks', () => {
    const xml = '<A /><A>content</A><A />';
    const result = readAllBlocks(xml, 'A');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('');
    expect(result[1]).toBe('content');
    expect(result[2]).toBe('');
  });

  it('should extract Grant blocks', () => {
    const xml = '<Grant><GrantID>1</GrantID></Grant><Grant><GrantID>2</GrantID></Grant>';
    expect(readAllBlocks(xml, 'Grant')).toEqual(['<GrantID>1</GrantID>', '<GrantID>2</GrantID>']);
  });
});

describe('readAttribute', () => {
  it('should extract an attribute value', () => {
    expect(readAttribute('<Item Name="Title">x</Item>', 'Item', 'Name')).toBe('Title');
  });

  it('should extract the correct attribute when multiple exist', () => {
    const xml = '<Item Name="Title" Type="String">x</Item>';
    expect(readAttribute(xml, 'Item', 'Type')).toBe('String');
    expect(readAttribute(xml, 'Item', 'Name')).toBe('Title');
  });

  it('should return undefined for missing attribute', () => {
    expect(readAttribute('<Item Name="Title">x</Item>', 'Item', 'Type')).toBeUndefined();
  });

  it('should return undefined for missing tag', () => {
    expect(readAttribute('<Other>x</Other>', 'Item', 'Name')).toBeUndefined();
  });

  it('should decode entities in attribute values', () => {
    expect(readAttribute('<Tag Name="a&amp;b">x</Tag>', 'Tag', 'Name')).toBe('a&b');
  });

  it('should handle empty attribute value', () => {
    expect(readAttribute('<Tag Name="">x</Tag>', 'Tag', 'Name')).toBe('');
  });

  it('should handle NCBI HasLinkOut attribute', () => {
    expect(readAttribute('<Id HasLinkOut="Y" HasNeighbor="N">123</Id>', 'Id', 'HasLinkOut')).toBe(
      'Y',
    );
    expect(readAttribute('<Id HasLinkOut="Y" HasNeighbor="N">123</Id>', 'Id', 'HasNeighbor')).toBe(
      'N',
    );
  });

  it('should handle NCBI Item Name and Type pattern', () => {
    const xml = '<Item Name="PubDate" Type="Date">2024 Jan</Item>';
    expect(readAttribute(xml, 'Item', 'Name')).toBe('PubDate');
    expect(readAttribute(xml, 'Item', 'Type')).toBe('Date');
  });

  it('should not match when attribute name is a suffix of another attribute', () => {
    const xml = '<Tag FooType="wrong" Type="right">text</Tag>';
    expect(readAttribute(xml, 'Tag', 'Type')).toBe('right');
  });
});

describe('decodeEntities', () => {
  it('should return text unchanged when no entities present', () => {
    expect(decodeEntities('hello world')).toBe('hello world');
  });

  it('should decode &amp;', () => {
    expect(decodeEntities('a &amp; b')).toBe('a & b');
  });

  it('should decode &lt;', () => {
    expect(decodeEntities('a &lt; b')).toBe('a < b');
  });

  it('should decode &gt;', () => {
    expect(decodeEntities('a &gt; b')).toBe('a > b');
  });

  it('should decode &quot;', () => {
    expect(decodeEntities('&quot;hello&quot;')).toBe('"hello"');
  });

  it('should decode &apos;', () => {
    expect(decodeEntities('it&apos;s')).toBe("it's");
  });

  it('should decode all named entities in one string', () => {
    expect(decodeEntities('&amp;&lt;&gt;&quot;&apos;')).toBe('&<>"\'');
  });

  it('should decode decimal numeric entities', () => {
    expect(decodeEntities('&#60;')).toBe('<');
    expect(decodeEntities('&#62;')).toBe('>');
    expect(decodeEntities('&#38;')).toBe('&');
    expect(decodeEntities('&#65;')).toBe('A');
  });

  it('should decode hex numeric entities', () => {
    expect(decodeEntities('&#x3C;')).toBe('<');
    expect(decodeEntities('&#x3E;')).toBe('>');
    expect(decodeEntities('&#x26;')).toBe('&');
    expect(decodeEntities('&#x41;')).toBe('A');
  });

  it('should decode mixed entities in one string', () => {
    expect(decodeEntities('a &amp; b &lt; c &#60; d')).toBe('a & b < c < d');
  });

  it('should handle multiple occurrences of the same entity', () => {
    expect(decodeEntities('&amp;&amp;&amp;')).toBe('&&&');
  });

  it('should handle entity at start of string', () => {
    expect(decodeEntities('&lt;start')).toBe('<start');
  });

  it('should handle entity at end of string', () => {
    expect(decodeEntities('end&gt;')).toBe('end>');
  });

  it('should handle high unicode code points via hex', () => {
    expect(decodeEntities('&#x2019;')).toBe('\u2019');
  });

  it('should handle high unicode code points via decimal', () => {
    expect(decodeEntities('&#8217;')).toBe('\u2019');
  });

  it('should handle adjacent entities', () => {
    expect(decodeEntities('&amp;&lt;&gt;')).toBe('&<>');
  });

  it('should return empty string for empty input', () => {
    expect(decodeEntities('')).toBe('');
  });

  it('should handle string with only entities', () => {
    expect(decodeEntities('&amp;')).toBe('&');
  });

  it('should handle uppercase hex digits', () => {
    expect(decodeEntities('&#x3C;')).toBe('<');
    expect(decodeEntities('&#x3c;')).toBe('<');
  });

  it('should handle case-sensitive hex', () => {
    expect(decodeEntities('&#xAB;')).toBe('\u00AB');
    expect(decodeEntities('&#xab;')).toBe('\u00AB');
  });

  it('should not double-decode &amp;lt; (single-pass)', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });
});

describe('stripTags', () => {
  it('should remove tags and keep text content', () => {
    expect(stripTags('<b>bold</b>')).toBe('bold');
  });

  it('should remove self-closing tags', () => {
    expect(stripTags('before<br />after')).toBe('beforeafter');
  });

  it('should handle nested tags', () => {
    expect(stripTags('<a><b>text</b></a>')).toBe('text');
  });

  it('should handle mixed content', () => {
    expect(stripTags('hello <b>world</b> foo')).toBe('hello world foo');
  });

  it('should return text unchanged when no tags', () => {
    expect(stripTags('no tags here')).toBe('no tags here');
  });

  it('should return empty string for empty input', () => {
    expect(stripTags('')).toBe('');
  });

  it('should handle tags with attributes', () => {
    expect(stripTags('<Replaced>asthma</Replaced>a treatment')).toBe('asthmaa treatment');
  });

  it('should handle NCBI SpelledQuery mixed content', () => {
    expect(stripTags('<Replaced>asthma</Replaced> treatment')).toBe('asthma treatment');
  });

  it('should handle multiple tags in sequence', () => {
    expect(stripTags('<a>1</a><b>2</b><c>3</c>')).toBe('123');
  });

  it('should handle self-closing tags without space', () => {
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

  it('should handle namespaced attributes', () => {
    const xml = '<link xlink:href="http://example.com" xlink:type="simple">text</link>';
    const result = readTagWithAttributes(xml, 'link');
    expect(result?.attributes['xlink:href']).toBe('http://example.com');
    expect(result?.attributes['xlink:type']).toBe('simple');
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

  it('should handle namespaced attributes on blocks', () => {
    const xml = '<ext-link xlink:href="http://doi.org/10.1" xlink:type="simple">DOI</ext-link>';
    const results = readAllBlocksWithAttributes(xml, 'ext-link');
    expect(results).toHaveLength(1);
    expect(results[0]?.attributes['xlink:href']).toBe('http://doi.org/10.1');
    expect(results[0]?.attributes['xlink:type']).toBe('simple');
  });
});

describe('removeAllBlocks', () => {
  it('should remove a single block', () => {
    const xml = 'before<xref>link</xref>after';
    expect(removeAllBlocks(xml, 'xref')).toBe('beforeafter');
  });

  it('should remove multiple blocks', () => {
    const xml = 'a<xref>1</xref>b<xref>2</xref>c';
    expect(removeAllBlocks(xml, 'xref')).toBe('abc');
  });

  it('should remove nested same-name blocks', () => {
    const xml = '<A>outer<A>inner</A></A>';
    expect(removeAllBlocks(xml, 'A')).toBe('');
  });

  it('should remove self-closing blocks', () => {
    const xml = 'before<br />after';
    expect(removeAllBlocks(xml, 'br')).toBe('beforeafter');
  });

  it('should return original string when no matches', () => {
    const xml = '<p>no match</p>';
    expect(removeAllBlocks(xml, 'div')).toBe('<p>no match</p>');
  });

  it('should handle empty input', () => {
    expect(removeAllBlocks('', 'tag')).toBe('');
  });

  it('should handle blocks with attributes', () => {
    const xml = 'text<sup class="ref">1</sup>more';
    expect(removeAllBlocks(xml, 'sup')).toBe('textmore');
  });

  it('should handle blocks with nested children', () => {
    const xml = '<root><remove><child>deep</child></remove>keep</root>';
    expect(removeAllBlocks(xml, 'remove')).toBe('<root>keep</root>');
  });

  it('should handle mixed content around blocks', () => {
    const xml = 'The gene <italic>BRCA1</italic> is related to <italic>BRCA2</italic>.';
    expect(removeAllBlocks(xml, 'italic')).toBe('The gene  is related to .');
  });

  it('should handle unclosed tag gracefully', () => {
    const xml = '<A>no close';
    expect(removeAllBlocks(xml, 'A')).toBe('<A>no close');
  });
});

describe('NCBI real-world XML patterns', () => {
  it('should parse ESearch with TranslationSet', () => {
    const xml = `<eSearchResult>
      <Count>42</Count>
      <RetMax>20</RetMax>
      <RetStart>0</RetStart>
      <IdList>
        <Id>38000001</Id>
        <Id>38000002</Id>
      </IdList>
      <TranslationSet>
        <Translation>
          <From>asthma</From>
          <To>"asthma"[MeSH Terms] OR "asthma"[All Fields]</To>
        </Translation>
        <Translation>
          <From>treatment</From>
          <To>"treatment"[All Fields]</To>
        </Translation>
      </TranslationSet>
      <QueryTranslation>"asthma"[MeSH Terms] OR "asthma"[All Fields]</QueryTranslation>
    </eSearchResult>`;

    expect(readTag(xml, 'Count')).toBe('42');
    expect(readAllTags(xml, 'Id')).toEqual(['38000001', '38000002']);

    const translationBlocks = readAllBlocks(xml, 'Translation');
    expect(translationBlocks).toHaveLength(2);
    expect(readTag(translationBlocks[0]!, 'From')).toBe('asthma');
    expect(readTag(translationBlocks[1]!, 'From')).toBe('treatment');
  });

  it('should parse ESummary with nested List items', () => {
    const xml = `<eSummaryResult>
      <DocSum>
        <Id>12345</Id>
        <Item Name="PubDate" Type="Date">2024 Jan</Item>
        <Item Name="Title" Type="String">A Study on &amp; Effects</Item>
        <Item Name="AuthorList" Type="List">
          <Item Name="Author" Type="String">Smith J</Item>
          <Item Name="Author" Type="String">Doe A</Item>
        </Item>
      </DocSum>
    </eSummaryResult>`;

    const docSums = readAllBlocks(xml, 'DocSum');
    expect(docSums).toHaveLength(1);

    const docSum = docSums[0]!;
    expect(readTag(docSum, 'Id')).toBe('12345');
  });

  it('should parse ELink acheck with attributes on Id tag', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>123</Id><Id>456</Id></IdList>
        <IdCheckList>
          <Id HasLinkOut="Y" HasNeighbor="Y">123</Id>
          <Id HasLinkOut="N" HasNeighbor="Y">456</Id>
        </IdCheckList>
      </LinkSet>
    </eLinkResult>`;

    const linkSetBlock = readBlock(xml, 'LinkSet')!;
    expect(readTag(linkSetBlock, 'DbFrom')).toBe('pubmed');

    const idListBlock = readBlock(linkSetBlock, 'IdList')!;
    expect(readAllTags(idListBlock, 'Id')).toEqual(['123', '456']);
  });

  it('should parse EInfo with FieldList and LinkList', () => {
    const xml = `<eInfoResult>
      <DbInfo>
        <DbName>pubmed</DbName>
        <Description>PubMed bibliographic record</Description>
        <Count>36000000</Count>
        <FieldList>
          <Field>
            <Name>ALL</Name>
            <FullName>All Fields</FullName>
            <IsDate>N</IsDate>
          </Field>
          <Field>
            <Name>TIAB</Name>
            <FullName>Title/Abstract</FullName>
            <IsDate>N</IsDate>
          </Field>
        </FieldList>
        <LinkList>
          <Link>
            <Name>pubmed_pubmed</Name>
            <Menu>Similar articles</Menu>
          </Link>
        </LinkList>
      </DbInfo>
    </eInfoResult>`;

    const dbInfoBlock = readBlock(xml, 'DbInfo')!;
    expect(readTag(dbInfoBlock, 'DbName')).toBe('pubmed');
    expect(readTag(dbInfoBlock, 'Count')).toBe('36000000');

    const fields = readAllBlocks(dbInfoBlock, 'Field');
    expect(fields).toHaveLength(2);
    expect(readTag(fields[0]!, 'Name')).toBe('ALL');
    expect(readTag(fields[1]!, 'Name')).toBe('TIAB');

    const links = readAllBlocks(dbInfoBlock, 'Link');
    expect(links).toHaveLength(1);
    expect(readTag(links[0]!, 'Menu')).toBe('Similar articles');
  });

  it('should handle self-closing IdList', () => {
    const xml = '<eSearchResult><IdList /><Count>0</Count></eSearchResult>';
    expect(readBlock(xml, 'IdList')).toBe('');
    expect(readTag(xml, 'Count')).toBe('0');
  });

  it('should handle self-closing TranslationSet', () => {
    const xml = '<eSearchResult><TranslationSet /></eSearchResult>';
    expect(readBlock(xml, 'TranslationSet')).toBe('');
  });

  it('should parse ESpell mixed content', () => {
    const xml = `<eSpellResult>
      <Query>asthmaa</Query>
      <CorrectedQuery>asthma</CorrectedQuery>
      <SpelledQuery><Replaced>asthma</Replaced>a treatment</SpelledQuery>
    </eSpellResult>`;

    expect(readTag(xml, 'Query')).toBe('asthmaa');
    expect(readTag(xml, 'CorrectedQuery')).toBe('asthma');

    const spelledQueryBlock = readBlock(xml, 'SpelledQuery')!;
    expect(stripTags(spelledQueryBlock)).toBe('asthmaa treatment');
  });

  it('should parse ELink with ObjUrl blocks', () => {
    const xml = `<IdUrlList>
      <IdUrlSet>
        <Id>123</Id>
        <ObjUrl>
          <Url>https://example.com/article</Url>
          <Provider>
            <Name>Example Publisher</Name>
            <NameAbbr>EP</NameAbbr>
          </Provider>
        </ObjUrl>
        <ObjUrl>
          <Url>https://other.com/pdf</Url>
          <Provider>
            <Name>Other Source</Name>
          </Provider>
        </ObjUrl>
      </IdUrlSet>
    </IdUrlList>`;

    const objUrls = readAllBlocks(xml, 'ObjUrl');
    expect(objUrls).toHaveLength(2);

    expect(readTag(objUrls[0]!, 'Url')).toBe('https://example.com/article');
    const providerBlock = readBlock(objUrls[0]!, 'Provider')!;
    expect(readTag(providerBlock, 'Name')).toBe('Example Publisher');
    expect(readTag(providerBlock, 'NameAbbr')).toBe('EP');

    expect(readTag(objUrls[1]!, 'Url')).toBe('https://other.com/pdf');
  });

  it('should handle entities in NCBI query translations', () => {
    const xml = '<To>&quot;asthma&quot;[MeSH Terms] OR &quot;asthma&quot;[All Fields]</To>';
    expect(readTag(xml, 'To')).toBe('"asthma"[MeSH Terms] OR "asthma"[All Fields]');
  });
});

describe('namespaced attributes', () => {
  it('should parse xlink:href in attribute extraction', () => {
    const xml = '<ext-link xlink:href="http://doi.org/10.1" xlink:type="simple">DOI</ext-link>';
    const results = readAllBlocksWithAttributes(xml, 'ext-link');
    expect(results[0]?.attributes['xlink:href']).toBe('http://doi.org/10.1');
  });

  it('should parse xml:lang attribute', () => {
    const xml = '<title xml:lang="en">English Title</title>';
    const result = readTagWithAttributes(xml, 'title');
    expect(result?.attributes['xml:lang']).toBe('en');
    expect(result?.text).toBe('English Title');
  });

  it('should handle mixed namespaced and plain attributes', () => {
    const xml = '<element id="e1" xml:id="x1" class="main">content</element>';
    const result = readTagWithAttributes(xml, 'element');
    expect(result?.attributes).toEqual({ id: 'e1', 'xml:id': 'x1', class: 'main' });
  });

  it('should reject namespaced tag names (colons not allowed in tag names)', () => {
    expect(() => readAllBlocksWithAttributes('<mml:math>x</mml:math>', 'mml:math')).toThrow(
      'Invalid XML tag name',
    );
  });
});

describe('performance', () => {
  it('should handle 1000 Id tags efficiently', () => {
    const xml = Array.from({ length: 1000 }, (_, index) => `<Id>${index}</Id>`).join('');
    const start = performance.now();
    const result = readAllTags(xml, 'Id');
    const elapsed = performance.now() - start;

    expect(result).toHaveLength(1000);
    expect(elapsed).toBeLessThan(100);
  });

  it('should handle 100 DocSum blocks with nested items', () => {
    const docSums = Array.from(
      { length: 100 },
      (_, index) => `
      <DocSum>
        <Id>${index}</Id>
        <Item Name="Title" Type="String">Article ${index}</Item>
        <Item Name="AuthorList" Type="List">
          <Item Name="Author" Type="String">Author A${index}</Item>
          <Item Name="Author" Type="String">Author B${index}</Item>
        </Item>
        <Item Name="PubDate" Type="Date">2024</Item>
        <Item Name="Source" Type="String">Journal ${index}</Item>
      </DocSum>`,
    ).join('');
    const xml = `<eSummaryResult>${docSums}</eSummaryResult>`;

    const start = performance.now();
    const blocks = readAllBlocks(xml, 'DocSum');
    const elapsed = performance.now() - start;

    expect(blocks).toHaveLength(100);
    expect(elapsed).toBeLessThan(200);
  });

  it('should handle large input for readTag', () => {
    const filler = '<Other>x</Other>'.repeat(10000);
    const xml = `${filler}<Target>found</Target>${filler}`;

    const start = performance.now();
    const result = readTag(xml, 'Target');
    const elapsed = performance.now() - start;

    expect(result).toBe('found');
    expect(elapsed).toBeLessThan(100);
  });

  it('should handle decodeEntities with many substitutions', () => {
    const text = 'a &amp; b &lt; c &gt; d '.repeat(1000);

    const start = performance.now();
    const result = decodeEntities(text);
    const elapsed = performance.now() - start;

    expect(result).toContain('a & b < c > d');
    expect(elapsed).toBeLessThan(50);
  });
});
