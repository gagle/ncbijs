# Agent discoverability smoke test

Manual test plan for verifying that agents can route to the right package using only auto-loaded CLAUDE.md context — no source scanning, no README fetching.

## When to run

- After P1 + P2 ship (root CLAUDE.md restructure + pilot per-package CLAUDE.md). Establishes the baseline.
- After every P3 batch (5 packages). Catches regressions where a CLAUDE.md change breaks routing.
- After P7 ships (sync-docs generator). Verifies the generated tables haven't drifted from per-package frontmatter.
- Periodically (quarterly) as a sanity check.

## How to run

1. Open a fresh Claude Code session at the repo root.
2. **Do NOT pre-load README** — agent should auto-load only `CLAUDE.md` + `.claude/rules/*.md`.
3. Paste each prompt below verbatim.
4. Verify the agent reaches the expected target within the expected hops, fetching at most the noted token budget.
5. Record outcome in the test log.

## Test cases

| # | Prompt | Expected target package | Max hops | Max tokens loaded |
|---|---|---|---|---|
| 1 | Search PubMed for articles on CRISPR | `@ncbijs/pubmed` | 1 (root CLAUDE.md → packages/pubmed/CLAUDE.md) | < 10K |
| 2 | Look up SNP rs7903146 with HGVS notation | `@ncbijs/snp` | 1 | < 10K |
| 3 | Run BLAST on a protein sequence | `@ncbijs/blast` | 1 | < 10K |
| 4 | Convert PMIDs to DOIs in batch | `@ncbijs/id-converter` | 1 | < 10K |
| 5 | Build a RAG pipeline over PMC full text | `@ncbijs/pmc` + `@ncbijs/jats` | 2 | < 20K |
| 6 | Stream a multi-GB FTP archive into DuckDB | `@ncbijs/etl` + `@ncbijs/pipeline` (+ `@ncbijs/store`) | 2-3 | < 25K |
| 7 | Format a citation as RIS | `@ncbijs/cite` | 1 | < 10K |
| 8 | Get clinical significance for a ClinVar variant | `@ncbijs/clinvar` | 1 | < 10K |
| 9 | Look up an ICD-10 code | `@ncbijs/clinical-tables` | 1 | < 10K |
| 10 | Expand a MeSH term to all narrower descriptors | `@ncbijs/mesh` | 1 | < 10K |
| 11 | Normalize a brand-name drug to RxCUI | `@ncbijs/rxnorm` | 1 | < 10K |
| 12 | Query NCBI APIs from a browser app | `apps/demo` (or note browser-safe packages from root CLAUDE.md) | 1 | < 10K |
| 13 | What rate limit does my E-utilities client use? | `@ncbijs/eutils` (rate limiting section) + `@ncbijs/rate-limiter` | 1-2 | < 12K |
| 14 | Find which packages support storage mode | Root CLAUDE.md packages table → frontmatter scan | 0 (root only) | < 8K |

## Pass criteria

- Agent reaches the expected target without reading source code.
- Agent does not load `README.md` for routing (it's a human surface).
- Agent does not load the entire `docs/ncbi-api-catalog.md` (must use `Grep`).
- Total tokens consumed for routing + loading the package's CLAUDE.md stays under the budget.

## Fail mode → fix path

| Symptom                                                | Likely cause                                    | Fix                                                     |
|--------------------------------------------------------|-------------------------------------------------|---------------------------------------------------------|
| Agent searches source instead of CLAUDE.md             | Missing or stale `## When to use` section       | Update the package's CLAUDE.md                          |
| Agent picks the wrong package                          | Workflow table missing the intent               | Add row to root CLAUDE.md `## What can you do…` table   |
| Agent loads ncbi-api-catalog.md whole                  | Documentation index missing "use grep" callout  | Reaffirm in root CLAUDE.md `## Documentation index`     |
| Agent can't disambiguate two similar packages          | `## When NOT to use` table is incomplete        | Add the cross-reference                                 |
| Agent misses a package entirely                        | Package not in root packages table              | Add row + workflow + decision tree                      |

## Test log

Record outcomes here (or a separate issue tracker):

```
Date          Prompt #    Outcome    Notes
----------    --------    -------    ----------------------------------------
2026-05-10    P0–P1 only — no per-package CLAUDE.md yet; tests deferred until P2.
```

## Notes

This is a **manual** test — agent behaviour is non-deterministic and the test is "does this feel right" rather than "does this exact string appear." Don't try to automate via assertions on transcripts. Re-run if any test fails after a CLAUDE.md change to confirm the issue is real.
