# Contributing to ncbijs

This project is developed and maintained entirely through AI-assisted development using [Claude Code](https://docs.anthropic.com/en/docs/claude-code). All code changes -- features, bug fixes, refactoring, tests, and documentation -- are generated, reviewed, and verified by Claude.

**No human-written code is accepted.** Pull requests containing manually written code will be closed.

## Why

This is an intentional design decision, not a gimmick. AI-generated code with strict conventions, 100% test coverage, and automated review produces more consistent, maintainable output than ad-hoc human contributions. Every change follows the same process, every time.

## How to contribute

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI, desktop app, or IDE extension)
- Node.js >= 20
- pnpm >= 10.15

### Workflow

1. **Fork and clone** the repository
2. **Open Claude Code** in the repo root -- it will automatically read `CLAUDE.md` and `.claude/` conventions
3. **Describe what you want** -- tell Claude the feature, bug fix, or improvement
4. **Claude implements** -- it writes the code, tests, and follows all conventions
5. **Claude self-reviews** -- the mandatory self-review loop runs:
   - `/agent-skills:review` (five-axis code review)
   - `/agent-skills:code-simplify` (simplify without changing behavior)
   - Loop until both produce no issues
6. **Claude verifies** -- `pnpm lint && pnpm build && pnpm test` must all pass
7. **Submit a PR** -- conventional commit format, description of what changed and why

### What Claude enforces automatically

- **100% test coverage** (statements, branches, functions, lines)
- **Zero lint warnings** (ESLint flat config with strict rules)
- **Conventional commits** (`feat(scope):`, `fix(scope):`, etc.)
- **TypeScript strict mode** (no `any`, `readonly` everywhere, explicit return types)
- **Semantic naming** (no `data`, `result`, `item` -- domain-specific names only)
- **ESM-only** with `.js` extensions in relative imports
- **Zero external dependencies** philosophy

### Configuration files Claude reads

| File                                 | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `CLAUDE.md`                          | Project commands, architecture, conventions, verification steps |
| `.claude/rules/typescript.md`        | TypeScript coding conventions                                   |
| `.claude/skills/testing/`            | Testing conventions (18 enforced rules)                         |
| `.claude/skills/review/`             | Code review criteria and process                                |
| `.claude/skills/explore-codebase.md` | Knowledge graph navigation                                      |
| `.claude/skills/review-changes.md`   | Risk-aware change review                                        |
| `.claude/skills/debug-issue.md`      | Systematic debugging                                            |
| `.claude/skills/refactor-safely.md`  | Safe refactoring with dependency analysis                       |

## Reporting issues

Issues can be reported by humans. Describe the problem, expected behavior, and steps to reproduce. A Claude session will pick up the issue and implement the fix.

## Questions

Open a [GitHub Discussion](https://github.com/gagle/ncbijs/discussions) for questions about the project, its architecture, or this contribution model.
