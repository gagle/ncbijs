# Changelog

## [v0.1.1](https://github.com/gagle/ncbijs/releases/tag/v0.1.1) (2026-05-04)

### Fixes

- **release workflow**: drop `gagle/prepare-dist@v1` and publish `pnpm` from each package root with `--ignore-scripts`. The previous flow couldn't resolve `workspace:*` references from inside `packages/X/dist/`, leaving 36 of 43 packages unpublished at v0.1.0. `pnpm publish` from a workspace package root substitutes `workspace:*` automatically. The 7 zero-dep packages that succeeded at v0.1.0 (`rate-limiter`, `xml`, `fasta`, `pipeline`, `sync`, `genbank`, `store`) re-publish at v0.1.1 to keep the unified version line aligned.

## [v0.1.0](https://github.com/gagle/ncbijs/releases/tag/v0.1.0) (2026-05-04)

Initial public release of the ncbijs ecosystem — 43 packages providing TypeScript clients for NCBI/NLM biomedical APIs (E-utilities, PubMed, PMC, MeSH, ClinVar, Datasets, BLAST, dbSNP, PubChem, ClinicalTrials.gov, RxNorm, iCite, LitVar, PubTator3, BioC, DailyMed, Clinical Tables) plus storage/sync/ETL utilities and an MCP server.

See [README.md](https://github.com/gagle/ncbijs/blob/main/README.md) for the full package catalog and architecture.
