/**
 * Shared types for the documentation manifest.
 *
 * The manifest is the single source of truth for cross-cutting routing data
 * (workflows + decision tree). Per-package metadata (depends_on, used_by,
 * purpose, etc.) lives in each package's CLAUDE.md frontmatter and is read
 * directly by `scripts/sync-docs.ts`.
 */

export interface WorkflowEntry {
  readonly workflow: string;
  readonly packages: ReadonlyArray<string>;
}

export interface DecisionLeaf {
  readonly kind: 'leaf';
  readonly intent: string;
  readonly target: string;
}

export interface DecisionGroup {
  readonly kind: 'group';
  readonly intent: string;
  readonly children: ReadonlyArray<DecisionNode>;
}

export type DecisionNode = DecisionLeaf | DecisionGroup;

export interface DecisionTree {
  readonly intent: string;
  readonly children: ReadonlyArray<DecisionNode>;
}

export interface PackageFrontmatter {
  readonly package: string;
  readonly purpose: string;
  readonly layout: 'flat' | 'split';
  readonly storage_mode: boolean;
  readonly zero_dep: boolean;
  readonly depends_on: ReadonlyArray<string>;
  readonly used_by: ReadonlyArray<string>;
  readonly exports: ReadonlyArray<string>;
  readonly related_docs: ReadonlyArray<string>;
  readonly last_audited: string;
}
