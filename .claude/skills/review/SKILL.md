---
name: review
description: >
  Senior principal code review of the current branch against the base branch.
  Reviews correctness, minimum change principle, naming, modularity, scalability,
  reusability, code smells, and test quality. Invoke with: /review
---

# Senior Principal Code Review -- Local Branch

You are a senior principal engineer reviewing the current branch's changes against the base branch.

## Inputs

Parse from `$ARGUMENTS`:

- **Ticket** (optional): First argument (ticket URL) -- if provided, use it for acceptance criteria context.

## Phase 1 -- Gather context (do NOT form opinions yet)

1. Determine the base branch. Run `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'` to detect the default branch (fallback: `main`). Then run `git merge-base <base> HEAD` to find the common ancestor.
2. If a ticket URL was provided, read the ticket. Extract: the goal, acceptance criteria, and what should NOT change. If no ticket, infer intent from commit messages.
3. Read all commits on this branch: `git log <base>..HEAD --oneline` for overview, then read each commit message in full.
4. Read the full diff: `git diff <base>...HEAD`. For each changed file, read the FULL file -- not just the diff. You need surrounding context.
5. For every new type, constant, function, or interface introduced, grep the entire codebase for:
   - All consumers (is it actually used? by how many callers?)
   - All related symbols (does it duplicate or shadow something that already exists?)
6. For every symbol that was modified (renamed, extended, re-typed), grep for all downstream consumers. Identify what breaks, what becomes inconsistent, and what becomes redundant.
7. For auto-generated files (schemas, OpenAPI types), trace the generation source. Determine whether manual additions will be overwritten on next generation.

## Phase 2 -- Evaluate (strict criteria)

Read `.claude/skills/review/review-criteria.md` and apply all evaluation criteria.

## Phase 3 -- Output

Follow the output format defined in `.claude/skills/review/review-criteria.md`.
