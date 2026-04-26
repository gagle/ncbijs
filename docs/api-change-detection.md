# API Change Detection

How NCBI communicates changes, how to detect them, and how ncbijs stays in sync.

## Versioning by API

NCBI has no unified versioning strategy. Each API family follows its own conventions:

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

## HTTP headers

### Sunset header (RFC 8594)

Only **Datasets v2** returns `Sunset` headers on deprecated endpoints. The process: endpoints are deprecated with 6+ months notice, Sunset headers added to responses, then removed at sunset date.

Documented deprecated endpoints: `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/api/deprecated-apis/`

### Rate limit headers

E-utilities returns `X-RateLimit-Remaining` and `X-RateLimit-Reset`. Other APIs do not return rate limit headers.

### No other deprecation signals in headers

No other NCBI API returns `Deprecation`, `Warning`, or `X-API-Warn` headers.

## Version endpoints

| API                | Endpoint                                          | Returns                                               |
| ------------------ | ------------------------------------------------- | ----------------------------------------------------- |
| ClinicalTrials.gov | `GET https://clinicaltrials.gov/api/v2/version`   | `{"apiVersion": "2.0.5", "dataTimestamp": "..."}`     |
| RxNorm             | `GET https://rxnav.nlm.nih.gov/REST/version.json` | `{"version": "06-Apr-2026", "apiVersion": "3.1.351"}` |

## Changelogs

| API                | Changelog URL                                                 |
| ------------------ | ------------------------------------------------------------- |
| Datasets           | GitHub releases: `https://github.com/ncbi/datasets/releases`  |
| RxNorm             | `https://lhncbc.nlm.nih.gov/RxNav/news/RxNormAPIChanges.html` |
| MeSH RDF           | `https://hhs.github.io/meshrdf/release-notes`                 |
| ClinicalTrials.gov | `https://clinicaltrials.gov/about-site/release-notes`         |

APIs without changelogs: E-utilities, PubChem, PubTator, LitVar, iCite, BLAST, PMC ID Converter, Clinical Tables.

## Announcement channels

### NCBI Insights blog (primary)

URL: `https://ncbiinsights.ncbi.nlm.nih.gov/`
RSS: `https://ncbiinsights.ncbi.nlm.nih.gov/feed/`
Tag-filtered: `https://ncbiinsights.ncbi.nlm.nih.gov/tag/api/`

This is the most important channel. Major API changes, deprecations, and new features are announced here.

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

## Automated change detection strategy

The `ncbi-check-updates` skill implements automated monitoring. Here are all the signals it should check:

### Tier 1: Machine-readable (check weekly)

These have deterministic diffs:

1. **OpenAPI spec hashing** -- fetch Datasets and Variation specs, SHA-256 hash, compare to stored baseline
2. **Version endpoints** -- poll ClinicalTrials.gov and RxNorm version endpoints, compare to stored values
3. **Datasets Sunset headers** -- on every Datasets request, check for `Sunset` header
4. **GitHub releases** -- fetch Datasets releases Atom feed, compare to last-seen tag

### Tier 2: Semi-structured (check weekly)

These require parsing:

5. **NCBI Insights RSS** -- fetch blog feed, filter for API/E-utilities/deprecated keywords
6. **EInfo database metadata** -- fetch EInfo for key databases, compare `lastupdate` and `dbbuild`

### Tier 3: Response schema fingerprinting (check monthly)

For unversioned APIs with no specs (E-utilities, PubChem, iCite, PubTator):

7. **Response shape diffing** -- fetch a known record from each API, extract the set of JSON keys (or XML tags) at each nesting level, compare to stored baseline. This detects added/removed/renamed fields without relying on the API to announce changes.

Example: fetch ESummary for PubMed PMID 33533846, extract all keys from the JSON response, hash the key set. If the hash changes, a field was added, removed, or renamed.

### Implementation

Detection is automated by `scripts/ncbi-api-monitor/detect.ts` — a pure TypeScript script (zero external dependencies) that runs all 7 check categories in parallel, compares against stored baselines, and outputs a JSON report. The `/ncbi-check-updates` skill invokes this script and acts on findings.

State is stored in `.ncbi-check-updates/` (committed to git). Run periodically with:

```
/ncbi-check-updates
```

Or run the detection script directly:

```bash
npx tsx scripts/ncbi-api-monitor/detect.ts
```

## Risk assessment

| Risk level | APIs                                     | Why                                                                                              |
| ---------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| High       | E-utilities, PubChem PUG-REST            | No versioning, no OpenAPI spec, no Sunset headers. Changes announced via blog/mailing list only. |
| Medium     | iCite, PubTator, LitVar, Clinical Tables | No versioning, but narrower surface area.                                                        |
| Low        | Datasets v2, ClinicalTrials.gov, RxNorm  | Versioned, changelog, and/or Sunset headers.                                                     |
| Very low   | Variation Services                       | Versioned, OpenAPI spec, still in beta (v0).                                                     |
