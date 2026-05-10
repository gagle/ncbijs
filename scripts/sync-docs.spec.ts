import { describe, expect, it } from 'vitest';
import {
  applyAllRegions,
  type DocInfo,
  escapeRegExp,
  parseFrontmatter,
  type PackageInfo,
  renderDecisionTree,
  renderDocIndexTable,
  renderPackagesClaudeTable,
  renderPackagesReadmeTable,
  renderWorkflowsTable,
  replaceRegion,
  truncatePurpose,
} from './sync-docs';

describe('parseFrontmatter', () => {
  describe('when input has no frontmatter', () => {
    it('should return null', () => {
      expect(parseFrontmatter('# heading\n\nbody')).toBeNull();
    });
  });

  describe('when input has scalar string fields', () => {
    it('should parse single-quoted values', () => {
      const fm = parseFrontmatter("---\npackage: '@ncbijs/x'\npurpose: 'a thing'\n---\nbody");
      expect(fm).toEqual({ package: '@ncbijs/x', purpose: 'a thing' });
    });
  });

  describe('when input has boolean fields', () => {
    it('should parse true and false as booleans', () => {
      const fm = parseFrontmatter('---\nstorage_mode: false\nzero_dep: true\n---\n');
      expect(fm).toEqual({ storage_mode: false, zero_dep: true });
    });
  });

  describe('when input has multi-line array fields', () => {
    it('should parse the array of strings', () => {
      const fm = parseFrontmatter(
        "---\ndepends_on:\n  - '@ncbijs/rate-limiter'\n  - 'openapi-fetch'\n---\n",
      );
      expect(fm).toEqual({ depends_on: ['@ncbijs/rate-limiter', 'openapi-fetch'] });
    });
  });

  describe('when input has inline empty array', () => {
    it('should return an empty array', () => {
      const fm = parseFrontmatter('---\ndepends_on: []\n---\n');
      expect(fm).toEqual({ depends_on: [] });
    });
  });

  describe('when input has inline non-empty array', () => {
    it('should parse the comma-separated values', () => {
      const fm = parseFrontmatter("---\nused_by: ['@ncbijs/a', '@ncbijs/b']\n---\n");
      expect(fm).toEqual({ used_by: ['@ncbijs/a', '@ncbijs/b'] });
    });
  });

  describe('when array values have surrounding quotes mixed', () => {
    it('should strip both single and double quotes', () => {
      const fm = parseFrontmatter('---\nexports:\n  - "Foo"\n  - \'Bar\'\n---\n');
      expect(fm).toEqual({ exports: ['Foo', 'Bar'] });
    });
  });

  describe('when key has no kv separator', () => {
    it('should skip non-matching lines', () => {
      const fm = parseFrontmatter("---\n# a comment\npackage: 'x'\n---\n");
      expect(fm).toEqual({ package: 'x' });
    });
  });
});

describe('truncatePurpose', () => {
  describe('when purpose is shorter than max', () => {
    it('should return the purpose unchanged', () => {
      expect(truncatePurpose('short', 100)).toBe('short');
    });
  });

  describe('when purpose equals max length', () => {
    it('should return the purpose unchanged', () => {
      expect(truncatePurpose('abcdef', 6)).toBe('abcdef');
    });
  });

  describe('when purpose exceeds max length', () => {
    it('should append a horizontal ellipsis', () => {
      expect(truncatePurpose('abcdefghij', 6)).toBe('abcde…');
    });
  });

  describe('when purpose contains repeated whitespace', () => {
    it('should normalise to single spaces', () => {
      expect(truncatePurpose('a   b\n\nc', 100)).toBe('a b c');
    });
  });
});

describe('renderWorkflowsTable', () => {
  describe('when called with default flag', () => {
    it('should produce a markdown table with a header row', () => {
      const out = renderWorkflowsTable(false);
      expect(out.split('\n')[0]).toMatch(/^\| Workflow/);
      expect(out).toContain('| -');
    });

    it('should include the manifest workflows', () => {
      const out = renderWorkflowsTable(false);
      expect(out).toContain('Search PubMed');
      expect(out).toContain('@ncbijs/pubmed');
    });
  });

  describe('when called with the alternate flag', () => {
    it('should produce equivalent output (current behaviour)', () => {
      const a = renderWorkflowsTable(false);
      const b = renderWorkflowsTable(true);
      expect(a).toBe(b);
    });
  });
});

describe('renderPackagesReadmeTable', () => {
  describe('when given a single package', () => {
    it('should emit a row with npm badge link', () => {
      const pkg: PackageInfo = {
        name: '@ncbijs/example',
        dirName: 'example',
        path: 'packages/example',
        purpose: 'Demo package',
        depends_on: [],
      };
      const out = renderPackagesReadmeTable([pkg]);
      expect(out).toContain('@ncbijs/example');
      expect(out).toContain('img.shields.io/npm/v/@ncbijs/example');
      expect(out).toContain('npmjs.com/package/@ncbijs/example');
    });
  });
});

describe('renderPackagesClaudeTable', () => {
  describe('when given a zero-dep package', () => {
    it('should mark depends-on column as zero-dep', () => {
      const pkg: PackageInfo = {
        name: '@ncbijs/leaf',
        dirName: 'leaf',
        path: 'packages/leaf',
        purpose: 'Leaf package',
        depends_on: [],
      };
      const out = renderPackagesClaudeTable([pkg]);
      expect(out).toContain('(zero-dep)');
    });
  });

  describe('when given a package with deps', () => {
    it('should list each dep as inline code', () => {
      const pkg: PackageInfo = {
        name: '@ncbijs/with-deps',
        dirName: 'with-deps',
        path: 'packages/with-deps',
        purpose: 'Has deps',
        depends_on: ['@ncbijs/rate-limiter', '@ncbijs/eutils'],
      };
      const out = renderPackagesClaudeTable([pkg]);
      expect(out).toContain('`@ncbijs/rate-limiter`');
      expect(out).toContain('`@ncbijs/eutils`');
    });
  });
});

describe('renderDecisionTree', () => {
  describe('when called', () => {
    it('should be wrapped in a code fence', () => {
      const out = renderDecisionTree();
      expect(out.startsWith('```')).toBe(true);
      expect(out.endsWith('```')).toBe(true);
    });

    it('should contain the root intent line', () => {
      expect(renderDecisionTree()).toContain('I want to...');
    });

    it('should contain group and leaf branches', () => {
      const out = renderDecisionTree();
      expect(out).toMatch(/├──/);
      expect(out).toMatch(/└──/);
      expect(out).toContain('@ncbijs/pubmed');
    });
  });
});

describe('escapeRegExp', () => {
  describe('when input contains regex metacharacters', () => {
    it('should escape each one', () => {
      expect(escapeRegExp('a.b*c+d?e')).toBe('a\\.b\\*c\\+d\\?e');
      expect(escapeRegExp('(x)|[y]')).toBe('\\(x\\)\\|\\[y\\]');
    });
  });

  describe('when input is plain text', () => {
    it('should return the text unchanged', () => {
      expect(escapeRegExp('plain text')).toBe('plain text');
    });
  });
});

describe('replaceRegion', () => {
  describe('when both markers are present', () => {
    it('should replace the marker block with new content', () => {
      const source = 'before\n<!-- sync-docs:foo:start -->\nold\n<!-- sync-docs:foo:end -->\nafter';
      const out = replaceRegion(source, { name: 'foo', content: 'NEW' });
      expect(out).toContain('<!-- sync-docs:foo:start -->\nNEW\n<!-- sync-docs:foo:end -->');
      expect(out).not.toContain('old');
    });
  });

  describe('when markers are missing', () => {
    it('should throw with a helpful message', () => {
      expect(() => replaceRegion('no markers here', { name: 'foo', content: 'X' })).toThrow(
        /Markers for region "foo" not found/,
      );
    });
  });
});

describe('applyAllRegions', () => {
  describe('when source has all named regions', () => {
    it('should replace each in turn without interfering', () => {
      const source = [
        'header',
        '<!-- sync-docs:a:start -->',
        'old-a',
        '<!-- sync-docs:a:end -->',
        '<!-- sync-docs:b:start -->',
        'old-b',
        '<!-- sync-docs:b:end -->',
      ].join('\n');
      const out = applyAllRegions(source, [
        { name: 'a', content: 'NEW-A' },
        { name: 'b', content: 'NEW-B' },
      ]);
      expect(out).toContain('NEW-A');
      expect(out).toContain('NEW-B');
      expect(out).not.toContain('old-a');
      expect(out).not.toContain('old-b');
    });
  });

  describe('when given no regions', () => {
    it('should return the source unchanged', () => {
      expect(applyAllRegions('untouched', [])).toBe('untouched');
    });
  });
});

describe('renderDocIndexTable', () => {
  describe('when given a small doc and a reference doc', () => {
    it('should annotate small as "small (read whole)"', () => {
      const docs: ReadonlyArray<DocInfo> = [
        {
          file: 'docs/architecture.md',
          title: 'Architecture',
          purpose: 'High-level design',
          size: 'small',
        },
      ];
      const out = renderDocIndexTable(docs);
      expect(out).toContain('docs/architecture.md');
      expect(out).toContain('small (read whole)');
    });

    it('should annotate reference as "use grep, not Read"', () => {
      const docs: ReadonlyArray<DocInfo> = [
        {
          file: 'docs/ncbi-api-catalog.md',
          title: 'NCBI API Catalog',
          purpose: 'Endpoint reference',
          size: 'reference',
        },
      ];
      expect(renderDocIndexTable(docs)).toContain('use grep, not Read');
    });

    it('should annotate large as "read sections"', () => {
      const docs: ReadonlyArray<DocInfo> = [
        {
          file: 'docs/pipeline-architecture.md',
          title: 'Pipeline architecture',
          purpose: 'Storage strategy',
          size: 'large',
        },
      ];
      expect(renderDocIndexTable(docs)).toContain('read sections');
    });
  });

  describe('when given an empty docs list', () => {
    it('should still emit a header and the manual rows for ncbi-api-monitor and adr/', () => {
      const out = renderDocIndexTable([]);
      expect(out).toContain('| Doc');
      expect(out).toContain('scripts/ncbi-api-monitor/CLAUDE.md');
      expect(out).toContain('docs/adr/');
    });
  });
});
