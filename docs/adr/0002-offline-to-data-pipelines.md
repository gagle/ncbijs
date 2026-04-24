# ADR 0002: Rename "Offline Mode" to "Data Pipelines"

## Status

Accepted

## Context

The ncbijs monorepo originally described its bulk-data processing feature as "offline mode" — reflecting the ability to operate without internet access by using locally stored NCBI data. However, as the architecture evolved, the terminology became misleading:

1. **"Offline" implies a degraded state.** Users read "offline mode" as "what you do when your connection is down." In reality, local data processing is a first-class feature — it provides higher throughput (no API rate limits), deterministic results, and privacy.

2. **"Offline" doesn't describe the composable architecture.** The feature is really a data pipeline: Source → Parse → Sink. Calling it "offline" obscures the design pattern.

3. **"Offline parsers" is inaccurate.** The parsers are "bulk parsers" — they process NCBI FTP bulk data files. They work regardless of network status.

4. **"Target" was inconsistent.** The data destination was sometimes called "Target" and sometimes "storage." The streams ecosystem uses "Sink" consistently.

## Decision

Rename all "offline" terminology to "data pipeline" equivalents:

| Old term         | New term         |
| ---------------- | ---------------- |
| offline mode     | data pipeline    |
| offline parser   | bulk parser      |
| offline storage  | local storage    |
| offline querying | local querying   |
| fully offline    | local / zero-API |
| Target           | Sink             |

### File renames

| Old path                           | New path                        |
| ---------------------------------- | ------------------------------- |
| `docs/offline-mode.md`             | `docs/data-pipelines.md`        |
| `docs/offline-rag-architecture.md` | `docs/pipeline-architecture.md` |
| `examples/offline-data/`           | `examples/data-pipeline/`       |

### What did NOT change

- `bulk-parsers/` directories in packages — already correct terminology.
- `e2e/bulk-parsers/` directory — no offline references.
- All parser function names — unchanged.
- `@ncbijs/store` and `@ncbijs/store-mcp` package names — still accurate.

## Consequences

- **Documentation is clearer.** "Data pipeline" accurately describes Source → Parse → Sink.
- **Terminology is consistent.** "Bulk parser" matches the `bulk-parsers/` directory structure already used in packages.
- **Package descriptions updated.** `@ncbijs/store` description changed from "offline NCBI data" to "local NCBI data."
- **Keywords updated.** "offline" replaced with "local" and "pipeline" in package.json files.
- **Internal links updated.** All cross-references between docs, READMEs, and examples point to the new paths.
