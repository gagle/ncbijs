---
name: ncbi-check-updates
description: Check for NCBI API changes, deprecations, and new releases that affect ncbijs packages
---

## NCBI API Change Monitor

Detects API changes across all NCBI/NLM services that ncbijs wraps. Reports what changed, which packages are affected, and what action to take.

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

### Steps

Run these in order. For each step, classify findings by severity:

- **HIGH**: OpenAPI spec changed, deprecation/sunset header found, schema keys removed — requires code changes
- **MEDIUM**: Version endpoint bumped, RSS announcement about breaking changes — investigate and possibly update
- **LOW**: EInfo database update, new GitHub release, schema keys added, general RSS — informational, update state only

---

#### Step 1: OpenAPI spec hashes (HIGH if changed)

Fetch each spec, compute SHA-256 hash, compare against `.ncbi-check-updates/spec-hashes.json`.

| API                | Spec URL                                                                    | State key        |
| ------------------ | --------------------------------------------------------------------------- | ---------------- |
| Datasets v2        | `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/openapi3/openapi3.docs.yaml` | `datasets`       |
| Variation Services | `https://api.ncbi.nlm.nih.gov/variation/v0/var_service.yaml`                | `variation`      |
| MeSH RDF           | `https://id.nlm.nih.gov/mesh/swagger/swagger.json`                          | `mesh`           |
| ClinicalTrials.gov | `https://clinicaltrials.gov/data-api/api`                                   | `clinicaltrials` |

If a hash changed:

1. Diff the `info.version` field (old vs new)
2. Summarize structural differences (new/removed endpoints, changed parameters)
3. Check which interfaces in the affected package need updating
4. Update `spec-hashes.json` with the new hash

#### Step 2: Version endpoints (MEDIUM if bumped)

Fetch version JSON, compare against `.ncbi-check-updates/version-endpoints.json`.

| API                | URL                                           | Fields to compare             |
| ------------------ | --------------------------------------------- | ----------------------------- |
| ClinicalTrials.gov | `https://clinicaltrials.gov/api/v2/version`   | `apiVersion`, `dataTimestamp` |
| RxNorm             | `https://rxnav.nlm.nih.gov/REST/version.json` | `version`, `apiVersion`       |

If version bumped: check the API's changelog for breaking changes, update state file.

#### Step 3: Deprecation headers (HIGH if found)

Send HEAD requests (via `curl -sI`) to each endpoint. Check for: `Sunset`, `Deprecation`, `Warning`, `X-API-Warn`.

```
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi
https://api.ncbi.nlm.nih.gov/datasets/v2/gene/id/1
https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/334
https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids=PMC3531190&format=json
https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula/JSON
https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/pubtator?pmids=33533846
https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi?CMD=Info
https://id.nlm.nih.gov/mesh/lookup/descriptor?label=Neoplasms&match=exact&limit=1
https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/?id=33533846&format=csl
https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=diabetes&maxList=1
https://icite.od.nih.gov/api/pubs/33533846
https://rxnav.nlm.nih.gov/REST/rxcui.json?name=aspirin
https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/autocomplete/?query=rs328
https://clinicaltrials.gov/api/v2/studies?query.term=aspirin&pageSize=1
https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name=aspirin
https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json/33533846/unicode
https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/?verb=Identify
```

If a deprecation header is found:

1. Record the endpoint, header name, header value, and date
2. Add to `docs/ncbi-api-catalog.md` "Deprecated and discontinued APIs" section
3. Check the sunset date — if imminent, plan code migration
4. Add to the deprecated list at the top of this skill

#### Step 4: Schema fingerprinting (HIGH if keys removed, LOW if keys added)

Fetch a known record from each unversioned API. Extract JSON key sets at each nesting level. Compare against `.ncbi-check-updates/schema-fingerprints.json`.

| API                   | Fetch URL                                                                                                              | State key         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------- |
| E-utilities (PubMed)  | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=33533846&retmode=json`                       | `eutils-pubmed`   |
| E-utilities (ClinVar) | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=7105&retmode=json`                          | `eutils-clinvar`  |
| E-utilities (CDD)     | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=cdd&id=223044&retmode=json`                            | `eutils-cdd`      |
| PubChem               | `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula,MolecularWeight,IUPACName/JSON` | `pubchem`         |
| iCite                 | `https://icite.od.nih.gov/api/pubs/33533846`                                                                           | `icite`           |
| PubTator3             | `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/biocjson?pmids=33533846`                      | `pubtator`        |
| RxNorm                | `https://rxnav.nlm.nih.gov/REST/rxcui/1191/properties.json`                                                            | `rxnorm`          |
| DailyMed              | `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=aspirin&pagesize=1`                             | `dailymed`        |
| Clinical Tables       | `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=diabetes&maxList=1`                                    | `clinical-tables` |

**How to fingerprint:** Parse JSON response, recursively collect all key names at each depth level. Store as `{ "depth0": ["key1", "key2"], "depth1": ["nested1", "nested2"] }`. Compare old vs new — report added and removed keys.

If keys removed: this likely means a field was dropped. Check if the affected package's interface references that field. If so, mark it optional or remove it.

If keys added: informational only. Consider adding to the interface if useful.

#### Step 5: NCBI Insights RSS (MEDIUM for breaking, LOW otherwise)

Fetch `https://ncbiinsights.ncbi.nlm.nih.gov/feed/`. Filter entries newer than `lastRssEntry` in `.ncbi-check-updates/last-check.json`.

Filter keywords: `API`, `E-utilities`, `deprecated`, `sunset`, `breaking`, `update`, `change`, `new`, `PMC`, `PubMed`, `Datasets`, `PubChem`, `BLAST`, `ClinVar`, `dbSNP`, `RxNorm`, `DailyMed`, `RxClass`, `LitVar`, `MeSH`, `iCite`.

Report matching entries with: title, date, link. Escalate to MEDIUM if title contains "deprecated", "sunset", "breaking", or "removed".

#### Step 6: GitHub releases (LOW)

Fetch `https://github.com/ncbi/datasets/releases.atom`. Report releases newer than `lastGitHubRelease` in `.ncbi-check-updates/last-check.json`.

#### Step 7: EInfo database metadata (LOW)

Fetch EInfo JSON for each database. Compare `lastupdate` and `dbbuild` against `.ncbi-check-updates/einfo-state.json`.

Databases: `pubmed`, `pmc`, `snp`, `clinvar`, `gene`, `protein`, `nucleotide`, `cdd`, `medgen`, `gtr`, `geo`, `sra`, `structure`, `omim`, `dbvar`, `books`, `nlmcatalog`.

URL pattern: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi?db={name}&retmode=json`

This is informational — database data updates don't change the API contract. Just update the state file.

---

### Step 8: Update state files

After all checks complete, update ALL state files in `.ncbi-check-updates/`:

| File                       | Contents                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `spec-hashes.json`         | `{ "datasets": { "hash": "...", "version": "..." }, ... }`                                                                   |
| `version-endpoints.json`   | `{ "clinicaltrials": { "apiVersion": "...", "dataTimestamp": "..." }, "rxnorm": { "version": "...", "apiVersion": "..." } }` |
| `einfo-state.json`         | `{ "pubmed": { "lastupdate": "...", "dbbuild": "..." }, ... }`                                                               |
| `schema-fingerprints.json` | `{ "eutils-pubmed": { "depth0": [...], "depth1": [...] }, ... }`                                                             |
| `last-check.json`          | `{ "date": "...", "lastRssEntry": "...", "lastGitHubRelease": "..." }`                                                       |

If a state file doesn't exist yet, create it with the current values (first-run initialization — don't report these as "changes").

### Step 9: Output report

Format the report grouped by severity:

```
## NCBI API Change Report — {date}

### HIGH (action required)
- [spec] Datasets v2 OpenAPI spec changed (hash: abc→def). Affects: @ncbijs/datasets
- [header] Sunset header found on icite endpoint: "2026-09-01". Affects: @ncbijs/icite

### MEDIUM (investigate)
- [version] ClinicalTrials.gov version bumped 2.0.5 → 2.1.0. Affects: @ncbijs/clinical-trials
- [rss] "PubMed API changes coming in Q3 2026" (2026-04-25). Link: ...

### LOW (informational)
- [einfo] pubmed database updated (Build-2026.04.21 → Build-2026.04.28)
- [release] ncbi/datasets v16.38.0 released (2026-04-22)
- [schema] PubChem: 2 keys added at depth 1 (newField1, newField2)

### No changes
- OpenAPI specs: unchanged
- Deprecation headers: none found
- Schema fingerprints: unchanged (except PubChem noted above)
```

If nothing changed at all: `No changes detected. All 35 API signals match stored baselines.`

### Action playbook

When HIGH findings exist, take action immediately:

| Finding                       | Action                                                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAPI spec hash changed     | Diff the spec. Update interfaces in the affected package. Update tests. Run verification.                                                            |
| Deprecation header found      | Record in `docs/ncbi-api-catalog.md`. If sunset date < 6 months away, create a migration plan. If sunset date passed, remove the endpoint from code. |
| Schema keys removed           | Check if the affected interface has that field. If so, make it optional (add `?`). Update tests.                                                     |
| Schema keys added             | Consider adding to the interface. No rush — existing code won't break.                                                                               |
| Version bumped (major)        | Check changelog for breaking changes. Update code if needed.                                                                                         |
| RSS: "deprecated" or "sunset" | Read the full announcement. Plan migration if needed.                                                                                                |

### Important

- Run checks in the order listed (HIGH-severity first so you see critical issues early)
- Always update state files after reporting, so the next run only shows new changes
- If this is the first run for a state file (file missing or empty), populate baselines without reporting "changes"
- Use WebFetch for HTTP GET requests (specs, RSS, JSON endpoints)
- Use Bash with `curl -sI` for HEAD requests (deprecation header probing)
- Tolerate network errors gracefully — if one endpoint times out, skip it and note in the report, don't abort the entire check
- The full API catalog is at `docs/ncbi-api-catalog.md` — if a new API endpoint is discovered, add it there
- After fixing any HIGH issues, run `pnpm lint && pnpm build && pnpm typecheck && pnpm test`
