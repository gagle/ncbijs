# Contributing to ncbijs

This project is developed and maintained entirely through AI-assisted development using [Claude Code](https://docs.anthropic.com/en/docs/claude-code). All code changes -- features, bug fixes, refactoring, tests, and documentation -- are generated, reviewed, and verified by Claude.

**Pull requests are disabled.** Contributors cannot submit code directly. To request a change, [open an issue](https://github.com/gagle/ncbijs/issues) or start a [discussion](https://github.com/gagle/ncbijs/discussions); the maintainer picks it up and implements it through Claude Code following the conventions in `CLAUDE.md` and `.claude/`.

## Why

This is an intentional design decision, not a gimmick. AI-generated code with strict conventions, 100% test coverage, and automated review produces more consistent, maintainable output than ad-hoc human contributions. Every change follows the same process, every time.

## How to request a change

1. **[Open an issue](https://github.com/gagle/ncbijs/issues)** for bugs, concrete features, or specific improvements -- include expected behavior and reproduction steps where relevant.
2. **[Open a discussion](https://github.com/gagle/ncbijs/discussions)** for open-ended requests, design input, or trade-off questions.
3. The maintainer triages the request and, when accepted, implements it via Claude Code. The resulting commits are linked back to your issue or discussion.

## What Claude enforces automatically

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

## Maintainer setup (macOS)

The setup below is the maintainer's local development environment, kept here for transparency and as a reference for anyone running their own fork. Contributors don't need any of it -- file an issue or discussion instead.

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

## Questions

Open a [GitHub Discussion](https://github.com/gagle/ncbijs/discussions) for questions about the project, its architecture, or this contribution model.
