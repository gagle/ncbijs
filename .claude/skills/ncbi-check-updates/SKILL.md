---
name: ncbi-check-updates
description: Check for NCBI API changes, deprecations, and new releases that affect ncbijs
---

## NCBI API Change Monitor

Checks all known NCBI change signals and reports what's new or different since the last check. State is stored in `.ncbi-check-updates/` (committed to git) so the baseline survives clone/pull.

For the full reference of all APIs, endpoints, versioning, and monitoring channels, see [docs/api-change-detection.md](../../docs/api-change-detection.md) and [docs/ncbi-api-catalog.md](../../docs/ncbi-api-catalog.md).

### Steps

1. **Fetch OpenAPI specs and compare hashes**
   - Fetch `https://www.ncbi.nlm.nih.gov/datasets/docs/v2/openapi3/openapi3.docs.yaml`
   - Fetch `https://api.ncbi.nlm.nih.gov/variation/v0/var_service.yaml`
   - Fetch `https://id.nlm.nih.gov/mesh/swagger/swagger.json`
   - Compute SHA-256 hashes of the response bodies
   - Compare against stored values in `.ncbi-check-updates/spec-hashes.json`
   - Report any changes (new hash != stored hash)
   - If a spec changed, diff the `info.version` field and summarize key structural differences

2. **Poll version endpoints**
   - Fetch `https://clinicaltrials.gov/api/v2/version` and compare `apiVersion` to stored value
   - Fetch `https://rxnav.nlm.nih.gov/REST/version.json` and compare `apiVersion` to stored value
   - Store both in `.ncbi-check-updates/version-endpoints.json`
   - Report version bumps

3. **Check EInfo for database changes**
   - Fetch EInfo (JSON) for key databases: pubmed, pmc, snp, clinvar, gene, protein, nucleotide, cdd, medgen, gtr, geo, sra, structure, omim, dbvar, books, nlmcatalog
   - URL pattern: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi?db=<name>&retmode=json`
   - Compare `lastupdate` and `dbbuild` against stored values in `.ncbi-check-updates/einfo-state.json`
   - Report databases that have updated since last check

4. **Check NCBI Insights RSS for API announcements**
   - Fetch `https://ncbiinsights.ncbi.nlm.nih.gov/feed/`
   - Filter entries newer than the last check date stored in `.ncbi-check-updates/last-check.json`
   - Filter for keywords: "API", "E-utilities", "deprecated", "sunset", "breaking", "update", "change", "new", "PMC", "PubMed", "Datasets", "PubChem", "BLAST", "ClinVar", "dbSNP", "RxNorm"
   - Report matching entries with title, date, and link

5. **Check GitHub releases**
   - Fetch `https://github.com/ncbi/datasets/releases.atom`
   - Report releases newer than last check date

6. **Probe key endpoints for Sunset/Deprecation headers**
   - Send HEAD requests to each endpoint below
   - Check response headers for: `Sunset`, `Deprecation`, `Warning`, `X-API-Warn`, `X-RateLimit-*`
   - Endpoints to probe:
     - `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi`
     - `https://api.ncbi.nlm.nih.gov/datasets/v2/gene/id/1`
     - `https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/334`
     - `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi?id=PMC1`
     - `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids=PMC3531190&format=json`
     - `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/MolecularFormula/JSON`
     - `https://www.ncbi.nlm.nih.gov/research/pubtator3-api/publications/export/pubtator?pmids=33533846`
     - `https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi?CMD=Info`
     - `https://id.nlm.nih.gov/mesh/lookup/descriptor?label=Neoplasms&match=exact&limit=1`
     - `https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/?id=33533846&format=csl`
     - `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?terms=diabetes&maxList=1`
     - `https://icite.od.nih.gov/api/pubs/33533846`
     - `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=aspirin`
     - `https://www.ncbi.nlm.nih.gov/research/litvar2-api/variant/autocomplete/?query=rs328`
     - `https://clinicaltrials.gov/api/v2/studies?query.term=aspirin&pageSize=1`
     - `https://dailymed.nlm.nih.gov/dailymed/services/v2/drugnames.json?drug_name=aspirin`
   - Report any deprecation/sunset headers found

7. **Response schema fingerprinting** (for unversioned APIs)
   - Fetch a known record from each API, extract the set of JSON keys at each nesting level
   - Compare key sets against stored baselines in `.ncbi-check-updates/schema-fingerprints.json`
   - APIs to fingerprint:
     - E-utilities ESummary for PubMed PMID 33533846
     - E-utilities ESummary for ClinVar UID 7105 (variant)
     - E-utilities ESummary for CDD UID 223044
     - PubChem PUG-REST compound CID 2244 (aspirin)
     - iCite publication PMID 33533846
     - PubTator3 export for PMID 33533846
     - RxNorm properties for aspirin (rxcui 1191)
   - Report added/removed/renamed keys

8. **Update stored state** in `.ncbi-check-updates/` with new hashes, timestamps, fingerprints, and last-check date

9. **Output report** summarizing:
   - Spec changes (if any) with hash diff
   - Version endpoint bumps (if any)
   - Database updates (if any) with old/new timestamps
   - New announcements (if any) with title, date, link
   - New GitHub releases (if any)
   - Deprecation headers found (if any)
   - Schema fingerprint changes (if any) with key diff
   - "No changes detected" if everything is the same

### Important

- Always update the state files after reporting, so the next run only shows new changes
- If this is the first run (empty state files), populate all baselines without reporting "changes"
- Use WebFetch for HTTP requests to specs and RSS feeds
- Use Bash with `curl -sI` for HEAD requests to check headers
- The full API catalog is at `docs/ncbi-api-catalog.md` -- if a new API is discovered, add it there
