---
name: ncbi-watch
description: Check for NCBI API changes, deprecations, and new releases that affect ncbijs
---

## NCBI API Change Monitor

Checks all known NCBI change signals and reports what's new or different since the last check. State is stored in `.ncbi-watch/` (committed to git) so the baseline survives clone/pull.

### Steps

1. **Fetch OpenAPI specs and compare hashes**
   - Fetch `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/openapi3/openapi3.docs.yaml`
   - Fetch `https://api.ncbi.nlm.nih.gov/variation/v0/var_service.yaml`
   - Compute SHA-256 hashes of the response bodies
   - Compare against stored values in `.ncbi-watch/spec-hashes.json`
   - Report any changes (new hash != stored hash)
   - If a spec changed, diff the `info.version` field and summarize key structural differences

2. **Check EInfo for database changes**
   - Fetch EInfo (JSON) for key databases: pubmed, pmc, snp, clinvar, gene, protein, nucleotide
   - URL pattern: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi?db=<name>&retmode=json`
   - Compare `lastupdate` and `dbbuild` against stored values in `.ncbi-watch/einfo-state.json`
   - Report databases that have updated since last check

3. **Check NCBI Insights RSS for API announcements**
   - Fetch `https://ncbiinsights.ncbi.nlm.nih.gov/feed/`
   - Filter entries newer than the last check date stored in `.ncbi-watch/last-check.json`
   - Filter for keywords: "API", "E-utilities", "deprecated", "sunset", "breaking", "update", "change", "new", "PMC", "PubMed", "Datasets"
   - Report matching entries with title, date, and link

4. **Check GitHub releases**
   - Fetch `https://github.com/ncbi/datasets/releases.atom`
   - Report releases newer than last check date

5. **Probe key endpoints for Sunset/Deprecation headers**
   - Send HEAD requests to each endpoint below
   - Check response headers for: `Sunset`, `Deprecation`, `Warning`, `X-API-Warn`
   - Endpoints to probe:
     - `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi`
     - `https://api.ncbi.nlm.nih.gov/datasets/v2/gene/id/1`
     - `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/334`
     - `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC1`
     - `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?ids=PMC3531190&format=json`
     - `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula/JSON`
     - `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/pubtator?pmids=33533846`
     - `https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi?CMD=Info`
     - `https://id.nlm.nih.gov/mesh/lookup/descriptor?label=Neoplasms&match=exact&limit=1`
     - `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?id=33533846&format=csl`
   - Report any deprecation/sunset headers found

6. **Update stored state** in `.ncbi-watch/` with new hashes, timestamps, and last-check date

7. **Output report** summarizing:
   - Spec changes (if any) with hash diff
   - Database updates (if any) with old/new timestamps
   - New announcements (if any) with title, date, link
   - New GitHub releases (if any)
   - Deprecation headers found (if any)
   - "No changes detected" if everything is the same

### Important

- Always update the state files after reporting, so the next run only shows new changes
- If this is the first run (empty state files), populate all baselines without reporting "changes"
- Use WebFetch for HTTP requests to specs and RSS feeds
- Use Bash with `curl -sI` for HEAD requests to check headers
