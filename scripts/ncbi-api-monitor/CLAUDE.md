---
context: 'scripts/ncbi-api-monitor'
purpose: 'Automated detection of NCBI API drift — OpenAPI hash diffs, version endpoint polling, Sunset headers, RSS feeds, EInfo metadata, response-shape fingerprinting. Runs weekly via GitHub Actions; opens issues on findings.'
runtime: 'Node.js (tsx)'
last_audited: '2026-05-10'
---

# scripts/ncbi-api-monitor — NCBI API drift detector

Auto-loaded when working in `scripts/ncbi-api-monitor/`.

## Purpose

NCBI APIs have **no unified versioning, change log, or deprecation
signal**. Detecting drift across 13 distinct APIs takes a
multi-strategy approach. This script is the implementation.

It runs on a weekly schedule (`.github/workflows/ncbi-api-monitor.yml`)
and on demand via the `/ncbi-check-updates` skill. Every detected
change opens a labeled GitHub issue; baseline state files are
committed back so subsequent runs only report new changes.

## When to use

- The weekly cron runs it automatically — no manual action needed for
  the standard cadence.
- Run on demand before cutting a release: `pnpm tsx scripts/ncbi-api-monitor/detect.ts`.
- Update the baseline state files (`.ncbi-check-updates/`) by
  re-running and committing.

## When NOT to use

| Goal                                       | Use instead                                                |
| ------------------------------------------ | ---------------------------------------------------------- |
| Add a new NCBI API client                  | `packages/<new>/` following the package architecture        |
| Wrap a single endpoint                     | A new method on the relevant `@ncbijs/<package>` class      |
| Hand-curated drift report                  | Read GitHub issues filtered by `ncbi-api-monitor` label    |

## Versioning by API

NCBI has no unified versioning strategy. Each API family follows its own conventions.

| API                | Versioned? | Mechanism                                                  | Current     |
| ------------------ | ---------- | ---------------------------------------------------------- | ----------- |
| E-utilities        | No         | Query param `version=2.0` for ESummary only                | Unversioned |
| Datasets           | Yes        | URL path `/v2/`                                            | v2          |
| Variation Services | Yes        | URL path `/v0/`                                            | v0 (beta)   |
| ClinicalTrials.gov | Yes        | URL path `/v2/` + `/version` endpoint                      | v2          |
| RxNorm             | Partial    | `/REST/version.json` endpoint                              | 3.1.x       |
| PMC ID Converter   | Yes        | URL path `/v1/`                                            | v1          |
| Clinical Tables    | Yes        | Per-table URL path `/v3/`, `/v4/`                          | varies      |
| DailyMed           | Yes        | URL path `/v2/`                                            | v2          |
| PubChem PUG-REST   | No         | None                                                       | Unversioned |
| iCite              | No         | None                                                       | Unversioned |
| MeSH               | No         | Swagger spec version                                       | 1.0.1       |
| LitVar             | Implicit   | URL changed from `litvar` to `litvar2`                     | LitVar 2    |
| PubTator           | Implicit   | Evolved through PubTator → PubTator Central → PubTator 3.0 | 3.0         |

## OpenAPI / Swagger specs

Only these APIs publish machine-readable specs:

| API                  | Spec URL                                                                                  | Format          |
| -------------------- | ----------------------------------------------------------------------------------------- | --------------- |
| Datasets v2          | `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/openapi3/openapi3.docs.yaml`               | OpenAPI 3.0     |
| Datasets v2 (GitHub) | `https://raw.githubusercontent.com/ncbi/datasets/refs/heads/master/datasets.openapi.yaml` | OpenAPI 3.0     |
| Variation Services   | `https://api.ncbi.nlm.nih.gov/variation/v0/var_service.yaml`                              | Swagger/OpenAPI |
| MeSH RDF             | `https://id.nlm.nih.gov/mesh/swagger/swagger.json`                                        | Swagger 2.0     |
| ClinicalTrials.gov   | `https://clinicaltrials.gov/data-api/api`                                                 | OpenAPI 3.0     |

All other APIs (E-utilities, PubChem, iCite, RxNorm, PubTator, LitVar, Clinical Tables) have no machine-readable spec.

## HTTP signals

- **Sunset header (RFC 8594)** — only **Datasets v2** returns `Sunset` headers on deprecated endpoints. 6+ months notice; documented at `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/api/deprecated-apis/`.
- **Rate limit headers** — E-utilities returns `X-RateLimit-Remaining` and `X-RateLimit-Reset`. Other APIs do not.
- **No other deprecation signals** — no `Deprecation`, `Warning`, or `X-API-Warn` headers anywhere.

## Version endpoints

| API                | Endpoint                                          | Returns                                               |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------- |
| ClinicalTrials.gov | `GET https://clinicaltrials.gov/api/v2/version`   | `{"apiVersion": "2.0.5", "dataTimestamp": "..."}`     |
| RxNorm             | `GET https://rxnav.nlm.nih.gov/REST/version.json` | `{"version": "06-Apr-2026", "apiVersion": "3.1.351"}` |

## Changelogs

| API                | URL                                                            |
| ------------------ | -------------------------------------------------------------- |
| Datasets           | GitHub releases — `https://github.com/ncbi/datasets/releases`  |
| RxNorm             | `https://lhncbc.nlm.nih.gov/RxNav/news/RxNormAPIChanges.html`  |
| MeSH RDF           | `https://hhs.github.io/meshrdf/release-notes`                  |
| ClinicalTrials.gov | `https://clinicaltrials.gov/about-site/release-notes`          |

APIs without changelogs: E-utilities, PubChem, PubTator, LitVar, iCite, BLAST, PMC ID Converter, Clinical Tables.

## Announcement channels

### NCBI Insights blog (primary)

- URL: `https://ncbiinsights.ncbi.nlm.nih.gov/`
- RSS: `https://ncbiinsights.ncbi.nlm.nih.gov/feed/`
- Tag-filtered: `https://ncbiinsights.ncbi.nlm.nih.gov/tag/api/`

The most important channel. Major API changes, deprecations, and new features are announced here.

### Mailing lists (low-volume, announcement-only)

| List               | Subscribe URL                                                      | Covers              |
| ------------------ | ------------------------------------------------------------------ | ------------------- |
| utilities-announce | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/utilities-announce` | E-utilities changes |
| pmc-utils-announce | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/pmc-utils-announce` | PMC tool updates    |
| blast-announce     | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/blast-announce`     | BLAST updates       |
| dbsnp-announce     | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/dbsnp-announce`     | dbSNP updates       |
| cdd-announce       | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/cdd-announce`       | CDD updates         |
| refseq-announce    | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/refseq-announce`    | RefSeq updates      |
| pmc-announce       | `https://www.ncbi.nlm.nih.gov/mailman/listinfo/pmc-announce`       | PMC news            |
| ClinVar            | `https://list.nih.gov/cgi-bin/wa.exe?SUBED1=CLINVAR&A=1`           | ClinVar updates     |

### RSS feeds

| Feed              | URL                                                             |
| ----------------- | --------------------------------------------------------------- |
| NCBI Insights     | `https://ncbiinsights.ncbi.nlm.nih.gov/feed/`                   |
| PubMed news       | `https://www.ncbi.nlm.nih.gov/feed/rss.cgi?ChanKey=pubmednews`  |
| PMC news          | `https://www.ncbi.nlm.nih.gov/pmc/about/new-in-pmc/?format=rss` |
| BLAST             | `https://www.ncbi.nlm.nih.gov/feed/rss.cgi?ChanKey=blastfeed`   |
| dbSNP             | `https://www.ncbi.nlm.nih.gov/feed/rss.cgi?ChanKey=dbsnpnews`   |
| dbVar             | `https://www.ncbi.nlm.nih.gov/feed/rss.cgi?ChanKey=dbvarnews`   |
| Gene              | `https://www.ncbi.nlm.nih.gov/feed/rss.cgi?ChanKey=genenews`    |
| GEO               | `https://www.ncbi.nlm.nih.gov/geo/feed/series`                  |
| Datasets releases | `https://github.com/ncbi/datasets/releases.atom`                |

### GitHub repositories

| Repo           | URL                                 | Relevance                           |
| -------------- | ----------------------------------- | ----------------------------------- |
| ncbi/datasets  | `https://github.com/ncbi/datasets`  | Datasets API OpenAPI spec, CLI, SDK |
| ncbi/dbsnp     | `https://github.com/ncbi/dbsnp`     | dbSNP tools and data                |
| ncbi/sra-tools | `https://github.com/ncbi/sra-tools` | SRA Toolkit                         |

## Detection strategy (3 tiers)

### Tier 1 — machine-readable (weekly)

Deterministic diffs against stored baselines.

1. **OpenAPI spec hashing** — fetch Datasets and Variation specs, SHA-256 hash, compare to stored baseline.
2. **Version endpoints** — poll ClinicalTrials.gov and RxNorm version endpoints, compare to stored values.
3. **Datasets Sunset headers** — on every Datasets request, check for `Sunset` header.
4. **GitHub releases** — fetch Datasets releases Atom feed, compare to last-seen tag.

### Tier 2 — semi-structured (weekly)

Requires parsing.

5. **NCBI Insights RSS** — fetch blog feed, filter for API/E-utilities/deprecated keywords.
6. **EInfo database metadata** — fetch EInfo for key databases, compare `lastupdate` and `dbbuild`.

### Tier 3 — response schema fingerprinting (monthly)

For unversioned APIs with no specs (E-utilities, PubChem, iCite, PubTator).

7. **Response shape diffing** — fetch a known record from each API, extract the set of JSON keys (or XML tags) at each nesting level, compare to stored baseline. Detects added/removed/renamed fields without relying on the API to announce changes.

Example: fetch ESummary for PubMed PMID 33533846, extract all keys from the JSON response, hash the key set. If the hash changes, a field was added, removed, or renamed.

## Implementation

`detect.ts` is **pure TypeScript with zero external runtime dependencies**. It runs all 7 check categories in parallel, compares against stored baselines, and outputs a JSON report.

State is stored in `.ncbi-check-updates/` (committed to git). Each detection run can update baselines so subsequent runs only report new changes.

### Running

```bash
# Via the skill — preferred
/ncbi-check-updates

# Or directly — useful when iterating on detect.ts
pnpm tsx scripts/ncbi-api-monitor/detect.ts > /tmp/report.json
```

### CI workflow

`.github/workflows/ncbi-api-monitor.yml` runs the detection script on a weekly schedule (Monday 9am UTC). When **HIGH or MEDIUM** changes are detected (LOW alone is silent), it opens a GitHub issue with the `ncbi-api-monitor` label and the title format:

```
NCBI API changes detected (DATE): N changes detected: X HIGH, Y MEDIUM, Z LOW
```

The workflow also commits updated baseline state files back to the repo so subsequent runs only report new changes. It can be triggered manually via `workflow_dispatch`.

### Email notification

When a new issue is opened, the workflow ALSO sends an email with the same title and body via [Resend](https://resend.com)'s HTTP API. The body is rendered to HTML via GitHub's own `/markdown` endpoint (GFM mode) so Gmail and other HTML-capable clients display it the same way GitHub does — headings, emoji, lists, links.

**Setup (one-time):**

1. Make the GitHub profile email public at `https://github.com/settings/profile` → "Public email". The workflow resolves the destination via `gh api /users/${{ github.actor }} --jq .email`. If the field is `null`, the email step short-circuits with a warning.
2. Sign up for Resend (free tier — 100/day, 3000/month) using the same email so test-mode sending via `onboarding@resend.dev` works without domain verification.
3. Create a Resend API key.
4. Add `RESEND_API_KEY` as a repo secret at `https://github.com/gagle/ncbijs/settings/secrets/actions`.

**Verification.** Run the dedicated `.github/workflows/notify-test.yml` workflow on demand (Actions → "Notify test" → "Run workflow"). It exercises the full path (resolve email → render markdown → POST to Resend) with a recognisable test message. Production sends 1:1 with new issues; test can be re-run any time without side effects.

**Disable.** Either delete `RESEND_API_KEY` (the email step prints "skipping" and exits 0), set the GitHub profile email back to private (resolve step warns and short-circuits), or remove the email steps from the workflow.

## Risk assessment

| Risk level | APIs                                     | Why                                                                                              |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| High       | E-utilities, PubChem PUG-REST            | No versioning, no OpenAPI spec, no Sunset headers. Changes announced via blog/mailing list only. |
| Medium     | iCite, PubTator, LitVar, Clinical Tables | No versioning, but narrower surface area.                                                        |
| Low        | Datasets v2, ClinicalTrials.gov, RxNorm  | Versioned, changelog, and/or Sunset headers.                                                     |
| Very low   | Variation Services                       | Versioned, OpenAPI spec, still in beta (v0).                                                     |

## Cross-package wiring

- **Triggered by `.github/workflows/ncbi-api-monitor.yml`** — weekly cron + manual dispatch.
- **Consumed by `.claude/skills/ncbi-check-updates/`** — the skill that triages findings and proposes fixes.
- **Gates `/verify`** — Step 0 checks for open `ncbi-api-monitor` issues with HIGH/MEDIUM severity and halts the verify gate if any are found.

## Common pitfalls

1. **Stale baselines after a missed run.** If the cron is paused and resumed weeks later, the next run may fire many issues at once for changes accumulated during the pause. Re-baseline manually if the queue is unmanageable: re-run `detect.ts` with the current state, commit, then resume normal cadence.

2. **Tier 3 fingerprint false positives.** Response shape diffing is sensitive to ordering of keys in non-deterministic responses. PubChem in particular sometimes returns keys in different orders. Sort key sets before hashing if false positives appear.

3. **NCBI rate limits during fingerprinting.** The detection script makes ~20 requests across the 7 tiers. Without an API key it can hit E-utilities' 3 req/s limit and 429 out. The CI workflow injects `NCBI_API_KEY` from secrets; local runs need it set in env.

4. **Sunset header polled only on Datasets requests.** The current implementation checks the header during a *fetch* of Datasets endpoints. If those endpoints are removed entirely (404), the detector reports the 404 as a generic error rather than a sunset event. Consider adding an explicit GET against the deprecated-APIs catalog page.

## Testing

```bash
# Lint + typecheck + unit tests for the entire scripts/ project
pnpm nx run ncbijs-scripts:test
pnpm nx run ncbijs-scripts:typecheck
pnpm nx run ncbijs-scripts:lint

# Run only this script's spec
pnpm vitest run --config scripts/vitest.config.ts scripts/ncbi-api-monitor/detect.spec.ts
```

(The Nx project name was `ncbijs-api-monitor` before the scripts unification — see the plan if a downstream reference still uses the old name.)

## Files

```
scripts/ncbi-api-monitor/
  detect.ts                         # main detection script (~28K, pure TS, zero deps)
  detect.spec.ts                    # unit tests (~16K)
  CLAUDE.md                         # this file
  .ncbi-check-updates/              # baseline state (committed)
```
