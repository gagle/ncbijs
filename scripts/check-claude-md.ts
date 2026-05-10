/**
 * check-claude-md — sustainability checks for CLAUDE.md files.
 *
 * Subcommands:
 *   pnpm check-claude-md budget               # token budgets per tier
 *   pnpm check-claude-md freshness            # last_audited >= 6 months -> warn
 *   pnpm check-claude-md exports [package]    # src/index.ts ↔ CLAUDE.md ## Exports drift
 *   pnpm check-claude-md pitfalls <package>   # surface candidate sources for pitfalls
 *
 * `budget` and `freshness` are wired into /verify (deterministic, low false-positive).
 * `exports` and `pitfalls` are run manually or quarterly.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

interface Budget {
  readonly target: number;
  readonly hard: number;
}

const BUDGETS: Record<'root' | 'package' | 'subtree' | 'rule', Budget> = {
  root: { target: 6000, hard: 8000 },
  package: { target: 3000, hard: 5000 },
  subtree: { target: 1500, hard: 2000 },
  rule: { target: 1000, hard: 1500 },
};

const FRESHNESS_WARN_MONTHS = 6;

interface Frontmatter {
  readonly last_audited?: string;
  readonly package?: string;
  readonly purpose?: string;
}

export function parseFrontmatter(content: string): Frontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }
  const yaml = match[1] ?? '';
  const fm: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*['"]?([^'"]*)['"]?\s*$/);
    if (kv && kv[1] !== undefined && kv[2] !== undefined) {
      fm[kv[1]] = kv[2].trim();
    }
  }
  return fm;
}

export function approxTokens(text: string): number {
  // Heuristic: word count * 1.3 (rough match to GPT/Claude tokenization).
  const words = text.split(/\s+/).filter((s) => s.length > 0).length;
  return Math.round(words * 1.3);
}

interface ClaudeMdFile {
  readonly path: string;
  readonly relativePath: string;
  readonly tier: 'root' | 'package' | 'subtree' | 'rule';
  readonly tokens: number;
  readonly content: string;
}

export function classify(relativePath: string): ClaudeMdFile['tier'] | null {
  if (relativePath === 'CLAUDE.md') {
    return 'root';
  }
  if (relativePath.startsWith('packages/') && relativePath.endsWith('/CLAUDE.md')) {
    return 'package';
  }
  if (relativePath.startsWith('scripts/') && relativePath.endsWith('/CLAUDE.md')) {
    return 'package';
  }
  if (relativePath.startsWith('.claude/rules/') && relativePath.endsWith('.md')) {
    return 'rule';
  }
  if (
    relativePath === 'apps/demo/CLAUDE.md' ||
    relativePath === 'e2e/CLAUDE.md' ||
    relativePath === 'docs/CLAUDE.md' ||
    relativePath === 'scripts/CLAUDE.md' ||
    relativePath === 'examples/CLAUDE.md'
  ) {
    return 'subtree';
  }
  return null;
}

export function walkClaudeMdFiles(): ReadonlyArray<ClaudeMdFile> {
  const result: Array<ClaudeMdFile> = [];
  const candidates: Array<string> = [
    'CLAUDE.md',
    'apps/demo/CLAUDE.md',
    'e2e/CLAUDE.md',
    'docs/CLAUDE.md',
    'scripts/CLAUDE.md',
    'examples/CLAUDE.md',
  ];
  for (const dir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue;
    }
    candidates.push(`packages/${dir.name}/CLAUDE.md`);
  }
  const scriptsDir = join(REPO_ROOT, 'scripts');
  if (existsSync(scriptsDir)) {
    for (const dir of readdirSync(scriptsDir, { withFileTypes: true })) {
      if (dir.isDirectory()) {
        const candidate = `scripts/${dir.name}/CLAUDE.md`;
        if (existsSync(join(REPO_ROOT, candidate))) {
          candidates.push(candidate);
        }
      }
    }
  }
  const rulesDir = join(REPO_ROOT, '.claude', 'rules');
  if (existsSync(rulesDir)) {
    for (const f of readdirSync(rulesDir)) {
      if (f.endsWith('.md')) {
        candidates.push(`.claude/rules/${f}`);
      }
    }
  }
  for (const rel of candidates) {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) {
      continue;
    }
    const tier = classify(rel);
    if (tier === null) {
      continue;
    }
    const content = readFileSync(abs, 'utf8');
    result.push({
      path: abs,
      relativePath: rel,
      tier,
      tokens: approxTokens(content),
      content,
    });
  }
  return result;
}

function checkBudget(): number {
  const files = walkClaudeMdFiles();
  let warnings = 0;
  let failures = 0;
  for (const f of files) {
    const budget = BUDGETS[f.tier];
    if (f.tokens > budget.hard) {
      console.error(
        `FAIL  ${f.relativePath} — ${f.tokens} tokens (hard limit ${budget.hard} for tier "${f.tier}")`,
      );
      failures++;
    } else if (f.tokens > budget.target) {
      console.warn(
        `WARN  ${f.relativePath} — ${f.tokens} tokens (target ${budget.target} for tier "${f.tier}")`,
      );
      warnings++;
    }
  }
  console.log(
    `\nbudget: ${files.length} files checked. ${failures} failures, ${warnings} warnings.`,
  );
  return failures > 0 ? 1 : 0;
}

export function monthsBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.44);
}

function checkFreshness(): number {
  const files = walkClaudeMdFiles();
  const now = new Date();
  let stale = 0;
  let unparseable = 0;
  for (const f of files) {
    if (f.tier === 'rule' || f.tier === 'root') {
      continue;
    }
    const fm = parseFrontmatter(f.content);
    if (fm.last_audited === undefined) {
      console.warn(`WARN  ${f.relativePath} — no last_audited frontmatter`);
      unparseable++;
      continue;
    }
    const audited = new Date(fm.last_audited);
    if (Number.isNaN(audited.getTime())) {
      console.warn(`WARN  ${f.relativePath} — invalid last_audited: ${fm.last_audited}`);
      unparseable++;
      continue;
    }
    const months = monthsBetween(audited, now);
    if (months > FRESHNESS_WARN_MONTHS) {
      console.warn(
        `WARN  ${f.relativePath} — last_audited ${fm.last_audited} (${months.toFixed(1)} months old)`,
      );
      stale++;
    }
  }
  console.log(
    `\nfreshness: ${files.length} files checked. ${stale} stale, ${unparseable} missing/invalid.`,
  );
  // Freshness is informational — never fails the gate.
  return 0;
}

export function extractExportsFromIndex(indexPath: string): ReadonlySet<string> {
  if (!existsSync(indexPath)) {
    return new Set();
  }
  const content = readFileSync(indexPath, 'utf8');
  const exports = new Set<string>();
  // Match: export { Foo, Bar } from '...' OR export type { Foo } from '...' OR export ... = ...
  const blockRegex = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(content)) !== null) {
    for (const raw of (m[1] ?? '').split(',')) {
      const name = raw
        .trim()
        .replace(/\s+as\s+\w+$/, '')
        .trim();
      if (name.length > 0) {
        exports.add(name);
      }
    }
  }
  // Also match: export { default } / export const X / export function X / export class X
  const declRegex = /^export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/gm;
  while ((m = declRegex.exec(content)) !== null) {
    if (m[1] !== undefined) {
      exports.add(m[1]);
    }
  }
  return exports;
}

export function extractExportsFromClaudeMd(content: string): ReadonlySet<string> {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  const result = new Set<string>();
  if (!fm) {
    return result;
  }
  const yaml = fm[1] ?? '';
  const exportsBlock = yaml.match(/^exports:\s*\n((?: {2}- .+\n?)+)/m);
  if (!exportsBlock) {
    return result;
  }
  for (const line of (exportsBlock[1] ?? '').split('\n')) {
    const m = line.match(/^ {2}- ['"]?([^'"]+)['"]?\s*$/);
    if (m && m[1] !== undefined) {
      result.add(m[1].trim());
    }
  }
  return result;
}

function checkExports(packageFilter?: string): number {
  let mismatches = 0;
  let checked = 0;
  for (const dir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue;
    }
    if (packageFilter !== undefined && dir.name !== packageFilter) {
      continue;
    }
    const claudePath = join(PACKAGES_DIR, dir.name, 'CLAUDE.md');
    const indexPath = join(PACKAGES_DIR, dir.name, 'src', 'index.ts');
    if (!existsSync(claudePath) || !existsSync(indexPath)) {
      continue;
    }
    checked++;
    const sourceExports = extractExportsFromIndex(indexPath);
    const docExports = extractExportsFromClaudeMd(readFileSync(claudePath, 'utf8'));
    const missing = [...sourceExports].filter((e) => !docExports.has(e));
    const extra = [...docExports].filter((e) => !sourceExports.has(e));
    if (missing.length > 0 || extra.length > 0) {
      console.warn(`\n${dir.name}:`);
      if (missing.length > 0) {
        console.warn(`  Missing in CLAUDE.md frontmatter: ${missing.join(', ')}`);
      }
      if (extra.length > 0) {
        console.warn(`  Extra in CLAUDE.md frontmatter:    ${extra.join(', ')}`);
      }
      mismatches++;
    }
  }
  console.log(`\nexports: ${checked} packages checked. ${mismatches} have drift.`);
  console.log(
    'Note: known false positives on barrel re-exports through subpaths (e.g. @ncbijs/eutils/config).',
  );
  return 0; // never fails — informational only
}

function surfacePitfalls(packageName: string): number {
  const dir = join(PACKAGES_DIR, packageName);
  if (!existsSync(dir)) {
    console.error(`Package not found: ${packageName}`);
    return 2;
  }
  console.log(`# Pitfall candidates for @ncbijs/${packageName}\n`);

  console.log('## Recent fix commits (last 90 days)');
  try {
    const log = execSync(
      `git log --since="90 days ago" --pretty=format:"- %h %s" --grep="^fix" -- packages/${packageName}`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    console.log(log.trim() === '' ? '(none)' : log);
  } catch {
    console.log('(git log failed)');
  }

  console.log('\n## Test names (describe + it)');
  const srcDir = join(dir, 'src');
  if (existsSync(srcDir)) {
    walkSpecFiles(srcDir).forEach((spec) => {
      const content = readFileSync(spec, 'utf8');
      const matches = content.match(/(?:describe|it)\(['"]([^'"]+)['"]/g);
      if (matches) {
        console.log(`### ${relative(REPO_ROOT, spec)}`);
        for (const m of matches) {
          const name = m.match(/['"]([^'"]+)['"]/)?.[1];
          if (name !== undefined) {
            console.log(`- ${name}`);
          }
        }
      }
    });
  }

  console.log('\n## TODO/FIXME/HACK markers');
  try {
    const grep = execSync(`grep -rn 'TODO\\|FIXME\\|HACK' packages/${packageName}/src/ || true`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    console.log(grep.trim() === '' ? '(none)' : grep);
  } catch {
    console.log('(grep failed)');
  }

  return 0;
}

export function walkSpecFiles(dir: string): Array<string> {
  const result: Array<string> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__fixtures__' || entry.name === 'node_modules') {
        continue;
      }
      result.push(...walkSpecFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      result.push(path);
    }
  }
  return result;
}

export interface ExtractedLinks {
  /** Paths from frontmatter `related_docs:` — resolved relative to REPO_ROOT. */
  readonly relatedDocs: ReadonlyArray<string>;
  /** Inline markdown links in the body — resolved relative to the file's directory. */
  readonly inlineLinks: ReadonlyArray<string>;
}

export function extractLinksFromContent(content: string): ExtractedLinks {
  const relatedDocs: Array<string> = [];
  const inlineLinks: Array<string> = [];
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  const fmBody = fm ? (fm[1] ?? '') : '';
  if (fm) {
    const block = fmBody.match(/^related_docs:\s*\n((?: {2}- .+\n?)+)/m);
    if (block) {
      for (const line of (block[1] ?? '').split('\n')) {
        const m = line.match(/^ {2}- ['"]?([^'"\s]+)['"]?\s*$/);
        if (m && m[1] !== undefined) {
          relatedDocs.push(m[1]);
        }
      }
    }
  }
  const body = fm ? content.slice(fm[0].length) : content;
  const inlineRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRegex.exec(body)) !== null) {
    const target = (m[1] ?? '').trim();
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) {
      continue;
    }
    const path = target.split('#')[0] ?? '';
    if (path.length === 0) {
      continue;
    }
    inlineLinks.push(path);
  }
  return { relatedDocs, inlineLinks };
}

function checkLinks(): number {
  const files = walkClaudeMdFiles();
  let broken = 0;
  for (const f of files) {
    const { relatedDocs, inlineLinks } = extractLinksFromContent(f.content);
    const fileDir = dirname(f.path);
    for (const link of relatedDocs) {
      const resolved = join(REPO_ROOT, link);
      if (!existsSync(resolved)) {
        console.error(`BROKEN  ${f.relativePath} → related_docs: ${link}`);
        broken++;
      }
    }
    for (const link of inlineLinks) {
      const resolved = link.startsWith('/') ? join(REPO_ROOT, link) : resolve(fileDir, link);
      if (!existsSync(resolved)) {
        console.error(`BROKEN  ${f.relativePath} → ${link}`);
        broken++;
      }
    }
  }
  console.log(
    `\nlinks: ${files.length} files checked. ${broken} broken link${broken === 1 ? '' : 's'}.`,
  );
  return broken > 0 ? 1 : 0;
}

interface PackageDeps {
  readonly name: string;
  readonly relativePath: string;
  readonly depends_on: ReadonlyArray<string>;
  readonly used_by: ReadonlyArray<string>;
}

export function parseDepsFromFrontmatter(content: string): {
  package?: string;
  depends_on: Array<string>;
  used_by: Array<string>;
} {
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  const result: { package?: string; depends_on: Array<string>; used_by: Array<string> } = {
    depends_on: [],
    used_by: [],
  };
  if (!fm) {
    return result;
  }
  const yaml = fm[1] ?? '';
  const pkgMatch = yaml.match(/^package:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  if (pkgMatch && pkgMatch[1] !== undefined) {
    result.package = pkgMatch[1].trim();
  }
  for (const field of ['depends_on', 'used_by'] as const) {
    const inline = yaml.match(new RegExp(`^${field}:\\s*\\[([^\\]]*)\\]\\s*$`, 'm'));
    if (inline) {
      const items = (inline[1] ?? '').trim();
      if (items.length > 0) {
        result[field] = items.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      }
      continue;
    }
    const block = yaml.match(new RegExp(`^${field}:\\s*\\n((?:  - .+\\n?)+)`, 'm'));
    if (block) {
      for (const line of (block[1] ?? '').split('\n')) {
        const m = line.match(/^ {2}- ['"]?([^'"\s]+)['"]?\s*$/);
        if (m && m[1] !== undefined) {
          result[field].push(m[1].trim());
        }
      }
    }
  }
  return result;
}

function checkDepGraph(): number {
  const packages: Array<PackageDeps> = [];
  for (const dir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue;
    }
    const claudePath = join(PACKAGES_DIR, dir.name, 'CLAUDE.md');
    if (!existsSync(claudePath)) {
      continue;
    }
    const content = readFileSync(claudePath, 'utf8');
    const deps = parseDepsFromFrontmatter(content);
    if (deps.package === undefined) {
      continue;
    }
    packages.push({
      name: deps.package,
      relativePath: `packages/${dir.name}/CLAUDE.md`,
      depends_on: deps.depends_on,
      used_by: deps.used_by,
    });
  }
  const byName = new Map<string, PackageDeps>();
  for (const p of packages) {
    byName.set(p.name, p);
  }

  let asymmetries = 0;
  // Forward check: for each P, every dep Q must list P in its used_by.
  for (const p of packages) {
    for (const dep of p.depends_on) {
      const q = byName.get(dep);
      if (q === undefined) {
        // External dep (not a workspace package) — skip.
        continue;
      }
      if (!q.used_by.includes(p.name)) {
        console.error(
          `ASYMMETRY  ${p.name} depends_on ${dep}, but ${dep}.used_by does not include ${p.name}`,
        );
        asymmetries++;
      }
    }
  }
  // Reverse check: for each P, every used_by R must list P in its depends_on.
  for (const p of packages) {
    for (const consumer of p.used_by) {
      const r = byName.get(consumer);
      if (r === undefined) {
        continue;
      }
      if (!r.depends_on.includes(p.name)) {
        console.error(
          `ASYMMETRY  ${p.name} lists ${consumer} in used_by, but ${consumer}.depends_on does not include ${p.name}`,
        );
        asymmetries++;
      }
    }
  }
  console.log(`\ndep-graph: ${packages.length} packages checked. ${asymmetries} asymmetries.`);
  return asymmetries > 0 ? 1 : 0;
}

function checkExamplesCoverage(): number {
  const examplesDir = join(REPO_ROOT, 'examples');
  if (!existsSync(examplesDir)) {
    console.error('examples/ directory not found.');
    return 1;
  }
  const exampleFiles: Array<string> = [];
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        exampleFiles.push(relative(REPO_ROOT, path));
      }
    }
  }
  walk(examplesDir);
  const exampleText = exampleFiles.join('\n');

  let missing = 0;
  const checked: Array<string> = [];
  for (const dir of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue;
    }
    // Skip infrastructure packages that don't typically have user-facing examples.
    if (
      dir.name === 'rate-limiter' ||
      dir.name === 'http-mcp' ||
      dir.name === 'store-mcp' ||
      dir.name === 'store' ||
      dir.name === 'sync' ||
      dir.name === 'pipeline' ||
      dir.name === 'etl' ||
      dir.name === 'xml'
    ) {
      continue;
    }
    checked.push(dir.name);
    // Heuristic: any example file mentioning the package name (in path or via import).
    const referenced =
      exampleText.includes(`/${dir.name}-`) || exampleText.includes(`/${dir.name}/`);
    if (!referenced) {
      console.warn(`MISSING  packages/${dir.name} has no matching example`);
      missing++;
    }
  }
  console.log(
    `\nexamples: ${checked.length} packages checked. ${missing} missing example${missing === 1 ? '' : 's'}.`,
  );
  // Informational — never fails the gate.
  return 0;
}

function main(): void {
  const [subcommand, ...args] = process.argv.slice(2);
  switch (subcommand) {
    case 'budget':
      process.exit(checkBudget());
      break;
    case 'freshness':
      process.exit(checkFreshness());
      break;
    case 'exports':
      process.exit(checkExports(args[0]));
      break;
    case 'pitfalls':
      if (args[0] === undefined) {
        console.error('Usage: pnpm check-claude-md pitfalls <package>');
        process.exit(2);
      }
      process.exit(surfacePitfalls(args[0]));
      break;
    case 'links':
      process.exit(checkLinks());
      break;
    case 'dep-graph':
      process.exit(checkDepGraph());
      break;
    case 'examples':
      process.exit(checkExamplesCoverage());
      break;
    default:
      console.error(`Usage: pnpm check-claude-md <subcommand>

Subcommands:
  budget      Verify token budgets per tier (root/package/subtree/rule).
  freshness   Warn on last_audited > 6 months old.
  exports     Compare src/index.ts exports with CLAUDE.md frontmatter.
  pitfalls    Surface candidate pitfall sources for a package.
  links       Validate related_docs and inline links resolve.
  dep-graph   Verify depends_on / used_by are mutual inverses.
  examples    Verify each package has at least one matching example.`);
      process.exit(2);
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === `file://${entryPath}`) {
  main();
}
