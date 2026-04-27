---
name: ncbi-check-updates
description: Check for NCBI API changes, deprecations, and new releases that affect ncbijs packages
---

## NCBI API Change Monitor

Detects API changes across all NCBI/NLM services that ncbijs wraps. Reports what changed, which packages are affected, and what action to take.

### Architecture

Detection is **automated by a TypeScript script** that handles all HTTP fetching, hash computation, and state comparison. Claude only gets involved for analysis and code changes — no manual HTTP requests needed.

```
┌─────────────────────────────────────────┐
│  scripts/ncbi-api-monitor/detect.ts     │
│  Pure TS, zero external deps            │
│  7 checks × parallel HTTP fetches       │
│  Outputs JSON report to stdout          │
│  Updates .ncbi-check-updates/ baselines │
└──────────────────┬──────────────────────┘
                   │ JSON report
                   ▼
┌─────────────────────────────────────────┐
│  Claude Code (this skill)               │
│  Reads report → acts on findings        │
│  HIGH: update interfaces, tests, docs   │
│  MEDIUM: investigate, decide action     │
│  LOW: informational, no action needed   │
└─────────────────────────────────────────┘
```

State is stored in `.ncbi-check-updates/` (committed to git) so baselines persist across sessions.

Reference docs: [docs/api-change-detection.md](../../../docs/api-change-detection.md) and [docs/ncbi-api-catalog.md](../../../docs/ncbi-api-catalog.md).

### Deprecated APIs — DO NOT check these

These APIs are dead. Do not probe, implement, or re-add them:

| API                                                               | Status              | Removed from             |
| ----------------------------------------------------------------- | ------------------- | ------------------------ |
| Drug Interaction (`rxnav.nlm.nih.gov/REST/interaction/`)          | 404 since Jan 2024  | `@ncbijs/rxnorm`         |
| PMC OAI-PMH old endpoint (`www.ncbi.nlm.nih.gov/pmc/oai/oai.cgi`) | Redirects           | Updated in `@ncbijs/pmc` |
| NCBI HTTP (non-HTTPS)                                             | Rejected since 2023 | N/A                      |

If you encounter a new deprecated API during checks, add it to this list AND to `docs/ncbi-api-catalog.md` "Deprecated and discontinued APIs" section.

### Package mapping

When a change is detected, this tells you which package to update:

| API / Signal                              | Package(s) affected                          |
| ----------------------------------------- | -------------------------------------------- |
| Datasets v2 OpenAPI spec                  | `@ncbijs/datasets`                           |
| Variation Services OpenAPI spec           | `@ncbijs/snp`                                |
| MeSH Swagger spec                         | `@ncbijs/mesh`                               |
| ClinicalTrials.gov version/spec           | `@ncbijs/clinical-trials`                    |
| RxNorm version                            | `@ncbijs/rxnorm`                             |
| E-utilities EInfo (any database)          | `@ncbijs/eutils` + database-specific package |
| PubChem schema                            | `@ncbijs/pubchem`                            |
| iCite schema                              | `@ncbijs/icite`                              |
| PubTator3 schema                          | `@ncbijs/pubtator`                           |
| ClinVar schema                            | `@ncbijs/clinvar`                            |
| LitVar schema                             | `@ncbijs/litvar`                             |
| DailyMed schema                           | `@ncbijs/dailymed`                           |
| Clinical Tables schema                    | `@ncbijs/clinical-tables`                    |
| BioC schema                               | `@ncbijs/bioc`                               |
| Cite/ID Converter schema                  | `@ncbijs/cite`, `@ncbijs/id-converter`       |
| BLAST endpoint                            | `@ncbijs/blast`                              |
| Sunset/Deprecation header on any endpoint | Depends on endpoint — see probe list         |

---

### Step 1: Run the detection script

```bash
pnpm tsx scripts/ncbi-api-monitor/detect.ts
```

Set `NCBI_API_KEY` env var for higher rate limits (10 req/sec vs 3 req/sec without). Without it, some E-utilities checks may get 429 rate-limited on the first run.

This runs all 7 check categories in parallel:

| Check               | Signal                                         | Severity                          |
| ------------------- | ---------------------------------------------- | --------------------------------- |
| OpenAPI spec hashes | SHA-256 of 4 spec URLs                         | HIGH if changed                   |
| Version endpoints   | ClinicalTrials.gov + RxNorm versions           | MEDIUM if bumped                  |
| Deprecation headers | Sunset/Deprecation/Warning on 17 endpoints     | HIGH if found                     |
| Schema fingerprints | JSON key sets from 9 sample endpoints          | HIGH if removed, LOW if added     |
| NCBI Insights RSS   | Keyword-filtered entries newer than last check | MEDIUM if breaking, LOW otherwise |
| GitHub releases     | ncbi/datasets releases newer than last check   | LOW                               |
| EInfo databases     | `lastupdate`/`dbbuild` for 17 databases        | LOW                               |

The script outputs a JSON report to stdout and updates `.ncbi-check-updates/` state files automatically.

### Step 2: Read the report

The JSON report has this structure:

```json
{
  "date": "2026-04-26T...",
  "hasChanges": true,
  "summary": "3 changes detected: 1 HIGH, 1 MEDIUM, 1 LOW",
  "changes": [
    {
      "category": "spec",
      "severity": "high",
      "description": "datasets OpenAPI spec changed (version: v2 -> v2.1)",
      "affectedPackages": ["@ncbijs/datasets"]
    }
  ],
  "errors": []
}
```

If `hasChanges` is `false`: report "No changes detected" and stop.

If there are errors: report them but continue processing any successful changes.

### Step 3: Act on findings by severity

#### HIGH (action required)

| Finding                   | Action                                                                                                                                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI spec hash changed | Fetch the new spec with WebFetch. Diff key structural differences (new/removed endpoints, changed parameters). Update interfaces in the affected package. Update tests. Run verification.                                                    |
| Deprecation header found  | Record in `docs/ncbi-api-catalog.md` "Deprecated and discontinued APIs". If sunset date < 6 months away, create a migration plan. If sunset date passed, remove the endpoint from code. Add to the deprecated list at the top of this skill. |
| Schema keys removed       | Check if the affected package's interface references that field. If so, make it optional (add `?`). Update tests.                                                                                                                            |

#### MEDIUM (investigate)

| Finding                       | Action                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| Version bumped                | Check the API's changelog for breaking changes. Update code if needed. |
| RSS: "deprecated" or "sunset" | Read the full announcement via the link. Plan migration if needed.     |

#### LOW (informational)

No action required. The detection script already updated the baselines.

- EInfo database updates: data changes, not API contract changes
- GitHub releases: track for awareness
- Schema keys added: consider adding to the interface if useful, no urgency
- RSS (non-breaking): awareness only

### Step 4: Verify (if code was changed)

After fixing any HIGH issues, run:

```bash
pnpm lint && pnpm build && pnpm typecheck && pnpm test
```

### Step 5: Commit state files

The detection script updates `.ncbi-check-updates/` state files. These must be committed so the next run only shows new changes:

```bash
git add .ncbi-check-updates/
git commit -m "chore(workspace): update NCBI API monitor baselines"
```

If code was also changed (HIGH findings), include the state file updates in the same commit as the code changes.

---

### Automated monitoring

A GitHub Actions workflow (`.github/workflows/ncbi-api-monitor.yml`) runs the detection script weekly (Monday 9am UTC). If HIGH or MEDIUM changes are found, it opens a GitHub issue with the `ncbi-api-monitor` label. This skill is for ad-hoc checks and for acting on those issues.

---

### Important

- Always run the detection script first — never manually fetch APIs or compute hashes
- The script handles first-run initialization: if a state file is missing, it populates baselines without reporting "changes"
- The script tolerates network errors gracefully: if one endpoint times out, it skips that check and includes the error in the report
- The full API catalog is at `docs/ncbi-api-catalog.md` — if a new API endpoint is discovered, add it there
- Source code for the detection script: `scripts/ncbi-api-monitor/detect.ts`
- Tests: `scripts/ncbi-api-monitor/detect.spec.ts` (run with `pnpm nx run ncbijs-api-monitor:test`)
