/**
 * sync-docs — regenerate routing tables in root README.md and root CLAUDE.md
 * from per-package CLAUDE.md frontmatter + cross-cutting manifests.
 *
 * Usage:
 *   pnpm sync-docs --check    # exit non-zero on drift, no writes
 *   pnpm sync-docs --write    # regenerate marked regions (default if no flag)
 *
 * Marked regions in source files:
 *   <!-- sync-docs:<region>:start -->
 *   ...generated content...
 *   <!-- sync-docs:<region>:end -->
 *
 * Regions:
 *   - workflows-readme    : root README.md "What can you do with ncbijs?" table
 *   - workflows-claude    : root CLAUDE.md "What can you do with ncbijs?" table
 *   - packages-readme     : root README.md "Packages" table (with npm badges)
 *   - packages-claude     : root CLAUDE.md "Packages" table (path + depends_on)
 *   - decision-tree-readme: root README.md "Which package do I need?" tree
 *   - decision-tree-claude: root CLAUDE.md "Which package do I need?" tree
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { workflows } from '../docs-manifest/workflows';
import { decisionTree } from '../docs-manifest/decision-tree';
import type { DecisionNode, PackageFrontmatter } from '../docs-manifest/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

const ROOT_README = join(REPO_ROOT, 'README.md');
const ROOT_CLAUDE = join(REPO_ROOT, 'CLAUDE.md');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

export function parseFrontmatter(content: string): Partial<PackageFrontmatter> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return null;
  }
  const yaml = match[1] ?? '';
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const key = kv[1] as string;
    const valueStr = (kv[2] ?? '').trim();
    if (valueStr === '') {
      const items: Array<string> = [];
      i++;
      while (i < lines.length && (lines[i] ?? '').startsWith('  - ')) {
        const raw = (lines[i] ?? '').slice(4).trim();
        items.push(raw.replace(/^['"]|['"]$/g, ''));
        i++;
      }
      result[key] = items;
    } else if (valueStr === '[]') {
      result[key] = [];
      i++;
    } else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      const inner = valueStr.slice(1, -1).trim();
      const items =
        inner === '' ? [] : inner.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      result[key] = items;
      i++;
    } else {
      const stripped = valueStr.replace(/^['"]|['"]$/g, '');
      let v: unknown = stripped;
      if (stripped === 'true') {
        v = true;
      } else if (stripped === 'false') {
        v = false;
      }
      result[key] = v;
      i++;
    }
  }
  return result as Partial<PackageFrontmatter>;
}

export interface PackageInfo {
  readonly name: string;
  readonly dirName: string;
  readonly path: string;
  readonly purpose: string;
  readonly depends_on: ReadonlyArray<string>;
}

export function readAllPackages(): ReadonlyArray<PackageInfo> {
  const entries = readdirSync(PACKAGES_DIR, { withFileTypes: true });
  const result: Array<PackageInfo> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const claudePath = join(PACKAGES_DIR, entry.name, 'CLAUDE.md');
    if (!existsSync(claudePath)) {
      continue;
    }
    const content = readFileSync(claudePath, 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm || typeof fm.package !== 'string') {
      continue;
    }
    result.push({
      name: fm.package,
      dirName: entry.name,
      path: `packages/${entry.name}`,
      purpose: fm.purpose ?? '',
      depends_on: fm.depends_on ?? [],
    });
  }
  result.sort((a, b) => a.name.localeCompare(b.name));
  return result;
}

export function renderWorkflowsTable(includeClaudeMdLink: boolean): string {
  const lines: Array<string> = [];
  if (includeClaudeMdLink) {
    lines.push(
      '| Workflow                                              | Packages                            |',
    );
    lines.push(
      '| ----------------------------------------------------- | ----------------------------------- |',
    );
    for (const w of workflows) {
      const pkgs = w.packages.map((p) => `\`${p}\``).join(' + ');
      lines.push(`| ${w.workflow.padEnd(53)} | ${pkgs.padEnd(35)} |`);
    }
  } else {
    lines.push(
      '| Workflow                                              | Packages                            |',
    );
    lines.push(
      '| ----------------------------------------------------- | ----------------------------------- |',
    );
    for (const w of workflows) {
      const pkgs = w.packages.map((p) => `\`${p}\``).join(' + ');
      lines.push(`| ${w.workflow.padEnd(53)} | ${pkgs.padEnd(35)} |`);
    }
  }
  return lines.join('\n');
}

export function renderPackagesReadmeTable(packages: ReadonlyArray<PackageInfo>): string {
  const lines: Array<string> = [];
  lines.push(
    '| Package                                                 | Description                                                         | Version                                                                                                               |',
  );
  lines.push(
    '| ------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |',
  );
  for (const pkg of packages) {
    const npmName = pkg.name;
    const versionBadge = `[![npm](https://img.shields.io/npm/v/${npmName})](https://www.npmjs.com/package/${npmName})`;
    lines.push(
      `| [\`${pkg.name}\`](./${pkg.path}) | ${truncatePurpose(pkg.purpose, 67)} | ${versionBadge} |`,
    );
  }
  return lines.join('\n');
}

export interface DocInfo {
  readonly file: string;
  readonly title: string;
  readonly purpose: string;
  readonly size: 'small' | 'medium' | 'large' | 'reference';
}

export function readAllDocs(): ReadonlyArray<DocInfo> {
  const docsDir = join(REPO_ROOT, 'docs');
  if (!existsSync(docsDir)) {
    return [];
  }
  const result: Array<DocInfo> = [];
  for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }
    if (entry.name === 'README.md' || entry.name === 'CLAUDE.md') {
      continue;
    }
    const abs = join(docsDir, entry.name);
    const content = readFileSync(abs, 'utf8');
    const fm = parseFrontmatter(content) as Record<string, unknown> | null;
    if (fm === null) {
      continue;
    }
    const title = typeof fm['title'] === 'string' ? (fm['title'] as string) : entry.name;
    const purpose = typeof fm['purpose'] === 'string' ? (fm['purpose'] as string) : '';
    const sizeRaw = typeof fm['size'] === 'string' ? (fm['size'] as string) : 'small';
    const size: DocInfo['size'] =
      sizeRaw === 'small' || sizeRaw === 'medium' || sizeRaw === 'large' || sizeRaw === 'reference'
        ? sizeRaw
        : 'small';
    result.push({ file: `docs/${entry.name}`, title, purpose, size });
  }
  result.sort((a, b) => a.file.localeCompare(b.file));
  return result;
}

const SIZE_NOTE: Record<DocInfo['size'], string> = {
  small: 'small (read whole)',
  medium: 'medium',
  large: '**large — read sections**',
  reference: '**reference — use grep, not Read**',
};

export function renderDocIndexTable(docs: ReadonlyArray<DocInfo>): string {
  const lines: Array<string> = [];
  lines.push(
    '| Doc                                                          | Topic                                                                                                  | Notes                                              |',
  );
  lines.push(
    '| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |',
  );
  for (const d of docs) {
    const link = `[\`${d.file}\`](./${d.file})`;
    const purpose = truncatePurpose(d.purpose, 100);
    lines.push(`| ${link} | ${purpose} | ${SIZE_NOTE[d.size]} |`);
  }
  // Always-present manual rows that don't have frontmatter.
  lines.push(
    `| [\`scripts/ncbi-api-monitor/CLAUDE.md\`](./scripts/ncbi-api-monitor/CLAUDE.md) | NCBI API drift detection strategy + script reference; auto-loads when working in that subtree | Read when triaging \`/ncbi-check-updates\` findings |`,
  );
  lines.push(
    `| [\`docs/adr/\`](./docs/adr/) | Architecture decision records | Read when changing architectural decisions |`,
  );
  return lines.join('\n');
}

export function renderPackagesClaudeTable(packages: ReadonlyArray<PackageInfo>): string {
  const lines: Array<string> = [];
  lines.push(
    '| Package                  | Path                          | Purpose                                                            | Depends on                                                |',
  );
  lines.push(
    '| ------------------------ | ----------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |',
  );
  for (const pkg of packages) {
    const deps =
      pkg.depends_on.length === 0 ? '(zero-dep)' : pkg.depends_on.map((d) => `\`${d}\``).join(', ');
    lines.push(
      `| \`${pkg.name}\` | \`${pkg.path}\` | ${truncatePurpose(pkg.purpose, 67)} | ${deps} |`,
    );
  }
  return lines.join('\n');
}

export function truncatePurpose(purpose: string, max: number): string {
  const cleaned = purpose.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

export function renderDecisionTree(): string {
  const lines: Array<string> = [];
  lines.push(decisionTree.intent);
  lines.push('│');
  const childCount = decisionTree.children.length;
  decisionTree.children.forEach((child, i) => {
    const isLast = i === childCount - 1;
    renderDecisionNode(child, '', isLast, lines);
    if (!isLast) {
      lines.push('│');
    }
  });
  return ['```', ...lines, '```'].join('\n');
}

export function renderDecisionNode(
  node: DecisionNode,
  prefix: string,
  isLast: boolean,
  lines: Array<string>,
): void {
  const branch = isLast ? '└── ' : '├── ';
  if (node.kind === 'leaf') {
    const dotsLen = Math.max(2, 40 - node.intent.length);
    const dots = '─'.repeat(dotsLen);
    lines.push(`${prefix}${branch}${node.intent} ${dots}→ ${node.target}`);
  } else {
    lines.push(`${prefix}${branch}${node.intent}`);
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    const childCount = node.children.length;
    node.children.forEach((child, i) => {
      const childIsLast = i === childCount - 1;
      renderDecisionNode(child, childPrefix, childIsLast, lines);
    });
  }
}

export interface Region {
  readonly name: string;
  readonly content: string;
}

export function replaceRegion(source: string, region: Region): string {
  const startMarker = `<!-- sync-docs:${region.name}:start -->`;
  const endMarker = `<!-- sync-docs:${region.name}:end -->`;
  const pattern = new RegExp(`${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`);
  if (!pattern.test(source)) {
    throw new Error(
      `Markers for region "${region.name}" not found. Insert ${startMarker} ... ${endMarker} into the source file first.`,
    );
  }
  const replacement = `${startMarker}\n${region.content}\n${endMarker}`;
  return source.replace(pattern, replacement);
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyAllRegions(source: string, regions: ReadonlyArray<Region>): string {
  return regions.reduce((acc, r) => replaceRegion(acc, r), source);
}

interface RunResult {
  readonly readmeChanged: boolean;
  readonly claudeChanged: boolean;
  readonly diffs: ReadonlyArray<string>;
}

function run(mode: 'check' | 'write'): RunResult {
  const packages = readAllPackages();
  const docs = readAllDocs();
  const workflowsTable = renderWorkflowsTable(false);
  const packagesReadmeTable = renderPackagesReadmeTable(packages);
  const packagesClaudeTable = renderPackagesClaudeTable(packages);
  const decisionTreeBlock = renderDecisionTree();
  const docIndexTable = renderDocIndexTable(docs);

  const readmeRegions: ReadonlyArray<Region> = [
    { name: 'workflows', content: workflowsTable },
    { name: 'packages', content: packagesReadmeTable },
    { name: 'decision-tree', content: decisionTreeBlock },
  ];
  const claudeRegions: ReadonlyArray<Region> = [
    { name: 'workflows', content: workflowsTable },
    { name: 'packages', content: packagesClaudeTable },
    { name: 'decision-tree', content: decisionTreeBlock },
    { name: 'doc-index', content: docIndexTable },
  ];

  const readmeBefore = readFileSync(ROOT_README, 'utf8');
  const claudeBefore = readFileSync(ROOT_CLAUDE, 'utf8');
  const readmeAfter = applyAllRegions(readmeBefore, readmeRegions);
  const claudeAfter = applyAllRegions(claudeBefore, claudeRegions);

  const readmeChanged = readmeAfter !== readmeBefore;
  const claudeChanged = claudeAfter !== claudeBefore;

  const diffs: Array<string> = [];
  if (readmeChanged) {
    diffs.push(`README.md drift detected (${ROOT_README})`);
  }
  if (claudeChanged) {
    diffs.push(`CLAUDE.md drift detected (${ROOT_CLAUDE})`);
  }

  if (mode === 'write') {
    if (readmeChanged) {
      writeFileSync(ROOT_README, readmeAfter, 'utf8');
    }
    if (claudeChanged) {
      writeFileSync(ROOT_CLAUDE, claudeAfter, 'utf8');
    }
  }

  return { readmeChanged, claudeChanged, diffs };
}

function main(): void {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const writeMode = args.includes('--write') || !checkMode;

  if (checkMode && writeMode && args.includes('--check') && args.includes('--write')) {
    console.error('Pass exactly one of --check or --write.');
    process.exit(2);
  }

  const mode: 'check' | 'write' = checkMode ? 'check' : 'write';
  const result = run(mode);

  if (mode === 'check') {
    if (result.diffs.length > 0) {
      console.error('sync-docs: drift detected');
      for (const d of result.diffs) {
        console.error(`  - ${d}`);
      }
      console.error('Run `pnpm sync-docs` (without --check) to regenerate.');
      process.exit(1);
    }
    console.log('sync-docs: clean — routing tables match manifest + frontmatter.');
    return;
  }

  if (result.readmeChanged) {
    console.log(`sync-docs: wrote ${ROOT_README}`);
  }
  if (result.claudeChanged) {
    console.log(`sync-docs: wrote ${ROOT_CLAUDE}`);
  }
  if (!result.readmeChanged && !result.claudeChanged) {
    console.log('sync-docs: no changes.');
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === `file://${entryPath}`) {
  main();
}
