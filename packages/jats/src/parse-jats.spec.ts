import { describe, expect, it } from 'vitest';
import { parseJATS } from './parse-jats.js';

function wrap(front = '', body = '', back = ''): string {
  return `<article>${front}${body}${back}</article>`;
}

function wrapFront(journalMeta = '', articleMeta = ''): string {
  return `<front><journal-meta>${journalMeta}</journal-meta><article-meta>${articleMeta}</article-meta></front>`;
}

const MINIMAL_FRONT = wrapFront(
  '<journal-title>Nature</journal-title>',
  '<title-group><article-title>Test</article-title></title-group>',
);

const FULL_REF = `<ref id="ref1"><label>1</label><element-citation>
  <person-group><name><surname>Smith</surname><given-names>John</given-names></name></person-group>
  <article-title>A Study</article-title><source>Nature</source>
  <year>2024</year><volume>625</volume><fpage>100</fpage><lpage>105</lpage>
  <pub-id pub-id-type="doi">10.1038/test</pub-id>
  <pub-id pub-id-type="pmid">12345</pub-id>
</element-citation></ref>`;

describe('parseJATS', () => {
  describe('front matter', () => {
    describe('journal metadata', () => {
      it('should extract journal title', () => {
        const xml = wrap(
          wrapFront(
            '<journal-title>Nature Medicine</journal-title>',
            '<title-group><article-title>T</article-title></title-group>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.journal.title).toBe('Nature Medicine');
      });

      it('should extract ISO abbreviation', () => {
        const xml = wrap(
          wrapFront(
            '<journal-id journal-id-type="iso-abbrev">Nat Med</journal-id><journal-title>Nature Medicine</journal-title>',
            '<title-group><article-title>T</article-title></title-group>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.journal.isoAbbrev).toBe('Nat Med');
      });

      it('should extract publisher', () => {
        const xml = wrap(
          wrapFront(
            '<journal-title>Nature</journal-title><publisher><publisher-name>Springer</publisher-name></publisher>',
            '<title-group><article-title>T</article-title></title-group>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.journal.publisher).toBe('Springer');
      });

      it('should extract ISSN', () => {
        const xml = wrap(
          wrapFront(
            '<journal-title>Nature</journal-title><issn>1078-8956</issn>',
            '<title-group><article-title>T</article-title></title-group>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.journal.issn).toBe('1078-8956');
      });

      it('should handle missing optional journal fields', () => {
        const xml = wrap(
          wrapFront(
            '<journal-title>Nature</journal-title>',
            '<title-group><article-title>T</article-title></title-group>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.journal.title).toBe('Nature');
        expect(result.front.journal.isoAbbrev).toBeUndefined();
        expect(result.front.journal.publisher).toBeUndefined();
        expect(result.front.journal.issn).toBeUndefined();
      });
    });

    describe('article metadata', () => {
      it('should extract article title', () => {
        const xml = wrap(
          wrapFront('', '<title-group><article-title>My Title</article-title></title-group>'),
        );
        const result = parseJATS(xml);
        expect(result.front.article.title).toBe('My Title');
      });

      it('should extract authors with names', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
          <contrib-group><contrib contrib-type="author"><name><surname>Smith</surname><given-names>John</given-names></name></contrib></contrib-group>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.authors).toHaveLength(1);
        expect(result.front.article.authors[0]!.lastName).toBe('Smith');
        expect(result.front.article.authors[0]!.foreName).toBe('John');
      });

      it('should extract author affiliations', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
          <contrib-group><contrib contrib-type="author"><name><surname>Smith</surname></name><aff>MIT</aff></contrib></contrib-group>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.authors[0]!.affiliations).toEqual(['MIT']);
      });

      it('should extract multiple affiliations per author', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
          <contrib-group><contrib contrib-type="author"><name><surname>Smith</surname></name><aff>MIT</aff><aff>Harvard</aff></contrib></contrib-group>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.authors[0]!.affiliations).toEqual(['MIT', 'Harvard']);
      });

      it('should extract author ORCID', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
          <contrib-group><contrib contrib-type="author"><contrib-id contrib-id-type="orcid">0000-0001-2345-6789</contrib-id><name><surname>Smith</surname></name></contrib></contrib-group>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.authors[0]!.orcid).toBe('0000-0001-2345-6789');
      });

      it('should extract collective name authors', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
          <contrib-group><contrib contrib-type="author"><collab>WHO Consortium</collab></contrib></contrib-group>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.authors[0]!.collectiveName).toBe('WHO Consortium');
        expect(result.front.article.authors[0]!.affiliations).toEqual([]);
      });

      it('should extract abstract text', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><abstract><p>This is the abstract.</p></abstract>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.abstract).toBe('This is the abstract.');
      });

      it('should extract keywords from kwd-group', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><kwd-group><kwd>cancer</kwd><kwd>treatment</kwd></kwd-group>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.keywords).toEqual(['cancer', 'treatment']);
      });

      it('should omit keywords when no kwd-group present', () => {
        const xml = wrap(
          wrapFront('', '<title-group><article-title>T</article-title></title-group>'),
        );
        const result = parseJATS(xml);
        expect(result.front.article.keywords).toBeUndefined();
      });

      it('should extract DOI', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><article-id pub-id-type="doi">10.1038/test</article-id>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.doi).toBe('10.1038/test');
      });

      it('should extract PMID', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><article-id pub-id-type="pmid">12345</article-id>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.pmid).toBe('12345');
      });

      it('should extract PMCID', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><article-id pub-id-type="pmc">PMC99999</article-id>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.pmcid).toBe('PMC99999');
      });

      it('should extract publication date', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><pub-date><year>2024</year><month>03</month><day>15</day></pub-date>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.publicationDate).toEqual({ year: 2024, month: 3, day: 15 });
      });

      it('should handle partial dates', () => {
        const xml = wrap(
          wrapFront(
            '',
            '<title-group><article-title>T</article-title></title-group><pub-date><year>2024</year></pub-date>',
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.publicationDate).toEqual({ year: 2024 });
      });

      it('should prefer epub pub-date over ppub', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
            <pub-date pub-type="ppub"><year>2024</year><month>06</month></pub-date>
            <pub-date pub-type="epub"><year>2024</year><month>03</month><day>15</day></pub-date>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.publicationDate).toEqual({ year: 2024, month: 3, day: 15 });
      });

      it('should use date-type="pub" when no epub available', () => {
        const xml = wrap(
          wrapFront(
            '',
            `<title-group><article-title>T</article-title></title-group>
            <pub-date date-type="collection"><year>2024</year></pub-date>
            <pub-date date-type="pub"><year>2024</year><month>05</month></pub-date>`,
          ),
        );
        const result = parseJATS(xml);
        expect(result.front.article.publicationDate).toEqual({ year: 2024, month: 5 });
      });

      it('should handle missing optional article fields', () => {
        const xml = wrap(
          wrapFront('', '<title-group><article-title>T</article-title></title-group>'),
        );
        const result = parseJATS(xml);
        expect(result.front.article.abstract).toBeUndefined();
        expect(result.front.article.doi).toBeUndefined();
        expect(result.front.article.pmid).toBeUndefined();
        expect(result.front.article.pmcid).toBeUndefined();
        expect(result.front.article.publicationDate).toBeUndefined();
      });
    });
  });

  describe('body sections', () => {
    it('should parse single-level sections', () => {
      const xml = wrap(MINIMAL_FRONT, '<body><sec><title>Intro</title><p>Text.</p></sec></body>');
      const result = parseJATS(xml);
      expect(result.body).toHaveLength(1);
    });

    it('should parse nested sections to depth 2', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>Methods</title><sec><title>Design</title><p>Details.</p></sec></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.subsections).toHaveLength(1);
      expect(result.body[0]!.subsections[0]!.title).toBe('Design');
    });

    it('should parse nested sections to depth 3', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>A</title><sec><title>B</title><sec><title>C</title><p>Deep.</p></sec></sec></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.subsections[0]!.subsections[0]!.title).toBe('C');
    });

    it('should parse arbitrarily deep nested sections', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>L1</title><sec><title>L2</title><sec><title>L3</title><sec><title>L4</title><p>Deep.</p></sec></sec></sec></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.subsections[0]!.subsections[0]!.subsections[0]!.title).toBe('L4');
    });

    it('should extract section titles', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>Introduction</title><p>Text.</p></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.title).toBe('Introduction');
    });

    it('should extract section depth', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>A</title><sec><title>B</title><p>X.</p></sec></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.depth).toBe(1);
      expect(result.body[0]!.subsections[0]!.depth).toBe(2);
    });

    it('should extract paragraphs within sections', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>Intro</title><p>First.</p><p>Second.</p></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs).toEqual(['First.', 'Second.']);
    });

    it('should strip inline xref elements from text', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>Results</title><p>As shown in <xref ref-type="fig" rid="fig1">Figure 1</xref>, the data confirms.</p></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('As shown in Figure 1 , the data confirms.');
    });

    it('should handle sections with no paragraphs', () => {
      const xml = wrap(MINIMAL_FRONT, '<body><sec><title>Empty</title></sec></body>');
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs).toHaveLength(0);
    });

    it('should handle empty body', () => {
      const xml = wrap(MINIMAL_FRONT, '<body></body>');
      const result = parseJATS(xml);
      expect(result.body).toHaveLength(0);
    });
  });

  describe('table extraction', () => {
    const TABLE_XML = `<table-wrap><caption><p>Demographics</p></caption>
      <table><thead><tr><th>Name</th><th>Age</th></tr></thead>
      <tbody><tr><td>Alice</td><td>30</td></tr><tr><td>Bob</td><td>25</td></tr></tbody></table></table-wrap>`;

    it('should extract table caption', () => {
      const xml = wrap(MINIMAL_FRONT, `<body><sec><title>R</title>${TABLE_XML}</sec></body>`);
      const result = parseJATS(xml);
      expect(result.body[0]!.tables[0]!.caption).toBe('Demographics');
    });

    it('should extract table headers', () => {
      const xml = wrap(MINIMAL_FRONT, `<body><sec><title>R</title>${TABLE_XML}</sec></body>`);
      const result = parseJATS(xml);
      expect(result.body[0]!.tables[0]!.headers).toEqual(['Name', 'Age']);
    });

    it('should extract table rows', () => {
      const xml = wrap(MINIMAL_FRONT, `<body><sec><title>R</title>${TABLE_XML}</sec></body>`);
      const result = parseJATS(xml);
      expect(result.body[0]!.tables[0]!.rows).toEqual([
        ['Alice', '30'],
        ['Bob', '25'],
      ]);
    });

    it('should handle complex table markup', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        `<body><sec><title>R</title><table-wrap>
        <table><thead><tr><th><bold>Header</bold></th></tr></thead>
        <tbody><tr><td><italic>Cell</italic></td></tr></tbody></table></table-wrap></sec></body>`,
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.tables[0]!.headers).toEqual(['Header']);
      expect(result.body[0]!.tables[0]!.rows[0]).toEqual(['Cell']);
    });

    it('should handle table with colspan', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        `<body><sec><title>R</title><table-wrap>
        <table><thead><tr><th>A</th><th colspan="2">B</th></tr></thead>
        <tbody><tr><td>1</td><td>2</td><td>3</td></tr></tbody></table></table-wrap></sec></body>`,
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.tables[0]!.headers).toEqual(['A', 'B', '']);
    });

    it('should handle table with rowspan', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        `<body><sec><title>R</title><table-wrap>
        <table><tbody><tr><td rowspan="2">Span</td><td>A</td></tr><tr><td>B</td></tr></tbody></table></table-wrap></sec></body>`,
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.tables[0]!.rows[0]).toContain('Span');
    });

    it('should handle table within section', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        `<body><sec><title>Results</title><p>Data below.</p>${TABLE_XML}</sec></body>`,
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.tables).toHaveLength(1);
      expect(result.body[0]!.paragraphs).toContain('Data below.');
    });

    it('should handle multiple tables in one section', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        `<body><sec><title>R</title>${TABLE_XML}${TABLE_XML}</sec></body>`,
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.tables).toHaveLength(2);
    });
  });

  describe('figure extraction', () => {
    it('should extract figure id', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>R</title><fig id="fig1"><label>Figure 1</label><caption><p>Cap</p></caption></fig></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.figures[0]!.id).toBe('fig1');
    });

    it('should extract figure label', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>R</title><fig id="fig1"><label>Figure 1</label><caption><p>Cap</p></caption></fig></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.figures[0]!.label).toBe('Figure 1');
    });

    it('should extract figure caption', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>R</title><fig id="fig1"><label>Figure 1</label><caption><p>A nice chart</p></caption></fig></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.figures[0]!.caption).toBe('A nice chart');
    });

    it('should handle multiple figures', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        `<body><sec><title>R</title>
        <fig id="fig1"><label>Figure 1</label><caption><p>Cap 1</p></caption></fig>
        <fig id="fig2"><label>Figure 2</label><caption><p>Cap 2</p></caption></fig></sec></body>`,
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.figures).toHaveLength(2);
    });

    it('should handle figure within section', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>R</title><p>Text.</p><fig id="fig1"><label>Fig 1</label><caption><p>Cap</p></caption></fig></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.figures).toHaveLength(1);
      expect(result.body[0]!.paragraphs).toContain('Text.');
    });
  });

  describe('MathML handling', () => {
    it('should convert simple MathML to text fallback', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>M</title><p><mml:math><mml:mi>x</mml:mi><mml:mo>=</mml:mo><mml:mn>5</mml:mn></mml:math></p></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toContain('x');
      expect(result.body[0]!.paragraphs[0]).toContain('5');
    });

    it('should handle inline math elements', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>M</title><p>The value <inline-formula><mml:math><mml:mi>n</mml:mi></mml:math></inline-formula> is 10.</p></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toContain('n');
      expect(result.body[0]!.paragraphs[0]).toContain('10');
    });

    it('should handle display math elements', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>M</title><p><disp-formula><mml:math><mml:mi>E</mml:mi><mml:mo>=</mml:mo><mml:mi>m</mml:mi><mml:msup><mml:mi>c</mml:mi><mml:mn>2</mml:mn></mml:msup></mml:math></disp-formula></p></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toContain('E');
      expect(result.body[0]!.paragraphs[0]).toContain('m');
    });
  });

  describe('back matter', () => {
    describe('references', () => {
      it('should extract reference id', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.id).toBe('ref1');
      });

      it('should extract reference label', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.label).toBe('1');
      });

      it('should extract reference authors', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.authors).toEqual(['Smith John']);
      });

      it('should extract reference title', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.title).toBe('A Study');
      });

      it('should extract reference source', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.source).toBe('Nature');
      });

      it('should extract reference year', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.year).toBe(2024);
      });

      it('should extract reference volume', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.volume).toBe('625');
      });

      it('should extract reference pages', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.pages).toBe('100-105');
      });

      it('should extract reference DOI', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.doi).toBe('10.1038/test');
      });

      it('should extract reference PMID', () => {
        const xml = wrap(MINIMAL_FRONT, '', `<back><ref-list>${FULL_REF}</ref-list></back>`);
        const result = parseJATS(xml);
        expect(result.back.references[0]!.pmid).toBe('12345');
      });

      it('should handle references with missing fields', () => {
        const xml = wrap(
          MINIMAL_FRONT,
          '',
          '<back><ref-list><ref id="ref1"><element-citation><article-title>Only Title</article-title><source>Src</source></element-citation></ref></ref-list></back>',
        );
        const result = parseJATS(xml);
        const ref = result.back.references[0]!;
        expect(ref.title).toBe('Only Title');
        expect(ref.year).toBeUndefined();
        expect(ref.volume).toBeUndefined();
        expect(ref.doi).toBeUndefined();
      });

      it('should handle empty reference list', () => {
        const xml = wrap(MINIMAL_FRONT, '', '<back><ref-list></ref-list></back>');
        const result = parseJATS(xml);
        expect(result.back.references).toHaveLength(0);
      });
    });

    describe('acknowledgements', () => {
      it('should extract acknowledgements text', () => {
        const xml = wrap(
          MINIMAL_FRONT,
          '',
          '<back><ack><p>Thanks to our funders.</p></ack></back>',
        );
        const result = parseJATS(xml);
        expect(result.back.acknowledgements).toBe('Thanks to our funders.');
      });

      it('should handle missing acknowledgements', () => {
        const xml = wrap(MINIMAL_FRONT, '', '<back></back>');
        const result = parseJATS(xml);
        expect(result.back.acknowledgements).toBeUndefined();
      });
    });

    describe('appendices', () => {
      it('should extract appendix sections', () => {
        const xml = wrap(
          MINIMAL_FRONT,
          '',
          '<back><app-group><app><title>Appendix A</title><p>Extra data.</p></app></app-group></back>',
        );
        const result = parseJATS(xml);
        expect(result.back.appendices).toHaveLength(1);
        expect(result.back.appendices![0]!.title).toBe('Appendix A');
        expect(result.back.appendices![0]!.paragraphs).toEqual(['Extra data.']);
      });

      it('should handle missing appendices', () => {
        const xml = wrap(MINIMAL_FRONT, '', '<back></back>');
        const result = parseJATS(xml);
        expect(result.back.appendices).toBeUndefined();
      });
    });
  });

  describe('supplementary materials', () => {
    it('should handle supplementary material elements', () => {
      const xml = wrap(
        MINIMAL_FRONT,
        '<body><sec><title>S</title><p>Text.</p><supplementary-material id="supp1"><label>S1</label></supplementary-material></sec></body>',
      );
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs).toContain('Text.');
    });
  });

  describe('JATS version compatibility', () => {
    const JATS_BODY = '<body><sec><title>Intro</title><p>Hello.</p></sec></body>';

    it('should parse JATS 1.0 documents', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS 1.0//EN" "JATS-journalpublishing1.dtd">${wrap(MINIMAL_FRONT, JATS_BODY)}`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });

    it('should parse JATS 1.1 documents', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS 1.1//EN" "JATS-journalpublishing1-1.dtd">${wrap(MINIMAL_FRONT, JATS_BODY)}`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });

    it('should parse JATS 1.2 documents', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS 1.2//EN" "JATS-journalpublishing1-2.dtd">${wrap(MINIMAL_FRONT, JATS_BODY)}`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });

    it('should parse JATS 1.3 documents', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS 1.3//EN" "JATS-journalpublishing1-3.dtd">${wrap(MINIMAL_FRONT, JATS_BODY)}`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });

    it('should parse JATS 1.4 documents', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS 1.4//EN" "JATS-journalpublishing1-4.dtd">${wrap(MINIMAL_FRONT, JATS_BODY)}`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });

    it('should parse Archiving tag set', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS Archiving 1.3//EN" "JATS-archivearticle1-3.dtd"><article article-type="research-article">${MINIMAL_FRONT}${JATS_BODY}</article>`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });

    it('should parse Publishing tag set', () => {
      const xml = `<?xml version="1.0"?><!DOCTYPE article PUBLIC "-//NLM//DTD JATS Publishing 1.3//EN" "JATS-journalpublishing1-3.dtd"><article article-type="research-article">${MINIMAL_FRONT}${JATS_BODY}</article>`;
      const result = parseJATS(xml);
      expect(result.body[0]!.paragraphs[0]).toBe('Hello.');
    });
  });

  describe('error handling', () => {
    it('should throw on invalid XML', () => {
      expect(() => parseJATS('not xml at all')).toThrow();
    });

    it('should throw on empty input', () => {
      expect(() => parseJATS('')).toThrow('Empty input');
    });

    it('should handle missing front element', () => {
      const xml = '<article><body><sec><title>X</title><p>Y.</p></sec></body></article>';
      const result = parseJATS(xml);
      expect(result.front.journal.title).toBe('');
      expect(result.front.article.title).toBe('');
    });

    it('should handle missing body element', () => {
      const xml = `<article>${MINIMAL_FRONT}</article>`;
      const result = parseJATS(xml);
      expect(result.body).toHaveLength(0);
    });

    it('should handle missing back element', () => {
      const xml = `<article>${MINIMAL_FRONT}</article>`;
      const result = parseJATS(xml);
      expect(result.back.references).toHaveLength(0);
      expect(result.back.acknowledgements).toBeUndefined();
    });
  });
});
