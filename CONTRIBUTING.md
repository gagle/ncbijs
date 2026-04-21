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
   - `/review` (graph structural analysis + project-specific criteria + five-axis enrichment)
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

| File                               | Purpose                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| `CLAUDE.md`                        | Project commands, architecture, conventions, verification steps |
| `.claude/rules/typescript.md`      | TypeScript coding conventions                                   |
| `.claude/skills/testing/`          | Testing conventions (18 enforced rules)                         |
| `.claude/skills/review/`           | Code review criteria and process                                |
| `.claude/skills/explore-codebase/` | Knowledge graph navigation                                      |
| `.claude/skills/debug-issue/`      | Systematic debugging                                            |
| `.claude/skills/refactor-safely/`  | Safe refactoring with dependency analysis                       |

## Setup (macOS)

### Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI, desktop app, or IDE extension)
- Node.js >= 20, pnpm >= 10.15
- macOS with Homebrew

### 1. Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### 2. Install RTK (Rust Token Killer)

RTK is a CLI proxy that reduces Claude Code token consumption by 60-90%.

```bash
brew install rtk
```

Add the RTK hook to your **global** Claude settings (`~/.claude/settings.json`), not the repo's `.claude/settings.json`. This way RTK is active across all your projects, not just this one:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/rtk-rewrite.sh"
          }
        ]
      }
    ]
  }
}
```

Create the hook script at `~/.claude/hooks/rtk-rewrite.sh` (run `rtk hook install` to generate it automatically).

### 3. Configure MCP servers

MCP servers give Claude access to external tools. Create a single `.mcp.json` in the **parent directory** of your repos (e.g., `~/projects/.mcp.json`) so all projects inherit the same servers:

```bash
brew install uv  # required for code-review-graph
```

```json
{
  "mcpServers": {
    "code-review-graph": {
      "command": "uvx",
      "args": ["code-review-graph", "serve"],
      "type": "stdio"
    }
  }
}
```

| Server                | Purpose                                                     | Auth         |
| --------------------- | ----------------------------------------------------------- | ------------ |
| **code-review-graph** | Structural codebase analysis, impact detection, code review | None (local) |

**code-review-graph** builds automatically on first use and updates via PostToolUse hooks after file changes.

### 4. Enable agent-skills plugin

```bash
claude plugins add --marketplace https://github.com/addyosmani/agent-skills agent-skills
```

### 5. Verify

Open Claude Code in the repo root. It should automatically read `CLAUDE.md`, `.claude/` conventions, and connect to the MCP servers.

## Reporting issues

Issues can be reported by humans. Describe the problem, expected behavior, and steps to reproduce. A Claude session will pick up the issue and implement the fix.

## Questions

Open a [GitHub Discussion](https://github.com/gagle/ncbijs/discussions) for questions about the project, its architecture, or this contribution model.
