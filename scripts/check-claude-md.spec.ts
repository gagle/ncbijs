import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  approxTokens,
  classify,
  extractExportsFromClaudeMd,
  extractExportsFromIndex,
  extractLinksFromContent,
  monthsBetween,
  parseDepsFromFrontmatter,
  parseFrontmatter,
  walkSpecFiles,
} from './check-claude-md';

describe('parseFrontmatter', () => {
  describe('when input has no frontmatter', () => {
    it('should return an empty object', () => {
      expect(parseFrontmatter('# heading')).toEqual({});
    });
  });

  describe('when input has known scalar fields', () => {
    it('should parse package, purpose, last_audited', () => {
      const fm = parseFrontmatter(
        "---\npackage: '@ncbijs/x'\npurpose: 'a'\nlast_audited: '2026-05-10'\n---\n",
      );
      expect(fm).toEqual({ package: '@ncbijs/x', purpose: 'a', last_audited: '2026-05-10' });
    });
  });

  describe('when a value contains both quoted and unquoted forms', () => {
    it('should strip the quotes', () => {
      const fm = parseFrontmatter('---\npurpose: bare\n---\n');
      expect(fm).toEqual({ purpose: 'bare' });
    });
  });
});

describe('approxTokens', () => {
  describe('when input is empty', () => {
    it('should return zero', () => {
      expect(approxTokens('')).toBe(0);
    });
  });

  describe('when input is a single word', () => {
    it('should return roughly 1.3 rounded', () => {
      expect(approxTokens('one')).toBe(1);
    });
  });

  describe('when input has multiple words', () => {
    it('should multiply word count by 1.3', () => {
      expect(approxTokens('one two three four five six seven eight nine ten')).toBe(13);
    });
  });

  describe('when input has runs of whitespace', () => {
    it('should treat them as one separator', () => {
      expect(approxTokens('a   b\n\nc')).toBe(approxTokens('a b c'));
    });
  });
});

describe('classify', () => {
  describe('when path is the repo root CLAUDE.md', () => {
    it('should return root', () => {
      expect(classify('CLAUDE.md')).toBe('root');
    });
  });

  describe('when path is a per-package CLAUDE.md', () => {
    it('should return package', () => {
      expect(classify('packages/eutils/CLAUDE.md')).toBe('package');
    });
  });

  describe('when path is a per-script CLAUDE.md', () => {
    it('should return package (treated as a project)', () => {
      expect(classify('scripts/ncbi-api-monitor/CLAUDE.md')).toBe('package');
    });
  });

  describe('when path is in .claude/rules/', () => {
    it('should return rule', () => {
      expect(classify('.claude/rules/typescript.md')).toBe('rule');
    });
  });

  describe('when path is a recognised subtree CLAUDE.md', () => {
    it('should return subtree for apps/demo, e2e, docs', () => {
      expect(classify('apps/demo/CLAUDE.md')).toBe('subtree');
      expect(classify('e2e/CLAUDE.md')).toBe('subtree');
      expect(classify('docs/CLAUDE.md')).toBe('subtree');
    });
  });

  describe('when path is unknown', () => {
    it('should return null', () => {
      expect(classify('random/path.md')).toBeNull();
    });
  });
});

describe('monthsBetween', () => {
  describe('when both dates are the same', () => {
    it('should return zero', () => {
      const d = new Date('2026-05-10');
      expect(monthsBetween(d, d)).toBe(0);
    });
  });

  describe('when end is after start', () => {
    it('should return a positive month count', () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-07-01');
      const months = monthsBetween(start, end);
      expect(months).toBeGreaterThan(5.5);
      expect(months).toBeLessThan(6.5);
    });
  });

  describe('when end is before start', () => {
    it('should return a negative month count', () => {
      const start = new Date('2026-07-01');
      const end = new Date('2026-01-01');
      expect(monthsBetween(start, end)).toBeLessThan(0);
    });
  });
});

describe('extractExportsFromIndex', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'check-claude-md-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('when the file does not exist', () => {
    it('should return an empty set', () => {
      const exports = extractExportsFromIndex(join(tmpDir, 'missing.ts'));
      expect(exports.size).toBe(0);
    });
  });

  describe('when the file has named export blocks', () => {
    it('should collect each name', () => {
      const path = join(tmpDir, 'index.ts');
      writeFileSync(path, "export { Foo, Bar } from './a';\nexport type { Baz } from './b';\n");
      const exports = extractExportsFromIndex(path);
      expect([...exports].sort()).toEqual(['Bar', 'Baz', 'Foo']);
    });
  });

  describe('when an export uses an `as` alias', () => {
    it('should collect the original name without the alias', () => {
      const path = join(tmpDir, 'index.ts');
      writeFileSync(path, "export { Foo as Renamed } from './a';\n");
      const exports = extractExportsFromIndex(path);
      expect([...exports]).toEqual(['Foo']);
    });
  });

  describe('when the file has top-level declarations', () => {
    it('should collect const, function, class, interface, type names', () => {
      const path = join(tmpDir, 'index.ts');
      writeFileSync(
        path,
        [
          'export const VERSION = 1;',
          'export function run() {}',
          'export class Client {}',
          'export interface Config {}',
          'export type Mode = "a" | "b";',
        ].join('\n'),
      );
      const exports = extractExportsFromIndex(path);
      expect([...exports].sort()).toEqual(['Client', 'Config', 'Mode', 'VERSION', 'run']);
    });
  });
});

describe('extractExportsFromClaudeMd', () => {
  describe('when the markdown has an exports frontmatter list', () => {
    it('should collect each entry', () => {
      const md = "---\nexports:\n  - 'EUtils'\n  - 'EUtilsHttpError'\n---\nbody";
      const exports = extractExportsFromClaudeMd(md);
      expect([...exports].sort()).toEqual(['EUtils', 'EUtilsHttpError']);
    });
  });

  describe('when the markdown has no exports block', () => {
    it('should return an empty set', () => {
      const md = "---\npackage: '@ncbijs/x'\n---\nbody";
      expect(extractExportsFromClaudeMd(md).size).toBe(0);
    });
  });

  describe('when the markdown has no frontmatter at all', () => {
    it('should return an empty set', () => {
      expect(extractExportsFromClaudeMd('# heading').size).toBe(0);
    });
  });
});

describe('walkSpecFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'walk-specs-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('when given a flat directory', () => {
    it('should find every .spec.ts at top level', () => {
      writeFileSync(join(tmpDir, 'a.spec.ts'), '');
      writeFileSync(join(tmpDir, 'b.ts'), '');
      writeFileSync(join(tmpDir, 'c.spec.ts'), '');
      const files = walkSpecFiles(tmpDir)
        .map((f) => f.split('/').pop())
        .sort();
      expect(files).toEqual(['a.spec.ts', 'c.spec.ts']);
    });
  });

  describe('when given nested directories', () => {
    it('should recurse into subdirectories', () => {
      mkdirSync(join(tmpDir, 'sub'));
      writeFileSync(join(tmpDir, 'sub', 'nested.spec.ts'), '');
      const files = walkSpecFiles(tmpDir).map((f) => f.split('/').pop());
      expect(files).toContain('nested.spec.ts');
    });
  });

  describe('when a directory contains __fixtures__', () => {
    it('should skip fixture specs', () => {
      mkdirSync(join(tmpDir, '__fixtures__'));
      writeFileSync(join(tmpDir, '__fixtures__', 'should-not-find.spec.ts'), '');
      writeFileSync(join(tmpDir, 'should-find.spec.ts'), '');
      const files = walkSpecFiles(tmpDir).map((f) => f.split('/').pop());
      expect(files).toEqual(['should-find.spec.ts']);
    });
  });
});

describe('extractLinksFromContent', () => {
  describe('when input has a related_docs frontmatter array', () => {
    it('should collect each entry as a relatedDoc', () => {
      const md = "---\nrelated_docs:\n  - 'docs/a.md'\n  - 'docs/b.md'\n---\nbody";
      const { relatedDocs, inlineLinks } = extractLinksFromContent(md);
      expect(relatedDocs).toEqual(['docs/a.md', 'docs/b.md']);
      expect(inlineLinks).toEqual([]);
    });
  });

  describe('when body has inline markdown links', () => {
    it('should collect relative paths as inlineLinks', () => {
      const md = '# heading\n\nSee [doc](./foo.md) and [other](../bar/baz.md).';
      const { relatedDocs, inlineLinks } = extractLinksFromContent(md);
      expect(relatedDocs).toEqual([]);
      expect(inlineLinks).toEqual(['./foo.md', '../bar/baz.md']);
    });
  });

  describe('when inline link is an http URL', () => {
    it('should be skipped', () => {
      const md = 'See [npm](https://example.com/foo).';
      expect(extractLinksFromContent(md).inlineLinks).toEqual([]);
    });
  });

  describe('when inline link is an anchor', () => {
    it('should be skipped', () => {
      const md = 'See [section](#anchor).';
      expect(extractLinksFromContent(md).inlineLinks).toEqual([]);
    });
  });

  describe('when inline link has an anchor fragment', () => {
    it('should strip the fragment and keep the path', () => {
      const md = 'See [s](./foo.md#section).';
      expect(extractLinksFromContent(md).inlineLinks).toEqual(['./foo.md']);
    });
  });

  describe('when frontmatter has inline links inside', () => {
    it('should not double-count them as inline body links', () => {
      const md =
        "---\npurpose: 'has [a link](http://x) in front'\nrelated_docs:\n  - 'docs/r.md'\n---\nbody [b](./b.md)";
      const { relatedDocs, inlineLinks } = extractLinksFromContent(md);
      expect(relatedDocs).toEqual(['docs/r.md']);
      expect(inlineLinks).toEqual(['./b.md']);
    });
  });
});

describe('parseDepsFromFrontmatter', () => {
  describe('when input has multi-line depends_on and used_by', () => {
    it('should parse both arrays plus the package name', () => {
      const md = [
        '---',
        "package: '@ncbijs/example'",
        'depends_on:',
        "  - '@ncbijs/eutils'",
        "  - '@ncbijs/rate-limiter'",
        'used_by:',
        "  - '@ncbijs/etl'",
        '---',
      ].join('\n');
      const result = parseDepsFromFrontmatter(md);
      expect(result.package).toBe('@ncbijs/example');
      expect(result.depends_on).toEqual(['@ncbijs/eutils', '@ncbijs/rate-limiter']);
      expect(result.used_by).toEqual(['@ncbijs/etl']);
    });
  });

  describe('when arrays are inline empty', () => {
    it('should return empty arrays', () => {
      const md = "---\npackage: '@ncbijs/x'\ndepends_on: []\nused_by: []\n---";
      const result = parseDepsFromFrontmatter(md);
      expect(result.depends_on).toEqual([]);
      expect(result.used_by).toEqual([]);
    });
  });

  describe('when arrays are inline non-empty', () => {
    it('should split comma-separated entries and strip quotes', () => {
      const md = "---\npackage: '@ncbijs/x'\nused_by: ['@ncbijs/a', '@ncbijs/b']\n---";
      const result = parseDepsFromFrontmatter(md);
      expect(result.used_by).toEqual(['@ncbijs/a', '@ncbijs/b']);
    });
  });

  describe('when input has no frontmatter', () => {
    it('should return empty arrays and undefined package', () => {
      const result = parseDepsFromFrontmatter('# heading');
      expect(result.package).toBeUndefined();
      expect(result.depends_on).toEqual([]);
      expect(result.used_by).toEqual([]);
    });
  });
});
