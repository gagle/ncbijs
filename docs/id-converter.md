# @ncbijs/id-converter — Article ID Conversion Guide

## Overview

Batch conversion between the different article identifier systems used in biomedical publishing: PMID (PubMed), PMCID (PubMed Central), DOI, and Manuscript ID. Zero dependencies.

**Base URL:** `https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/`
**Docs:** https://pmc.ncbi.nlm.nih.gov/tools/id-converter-api/

## Endpoint

```
GET /api/v1/articles/?ids={ids}&format={format}&idtype={idtype}&versions={yes|no}&showaiid={yes|no}&tool={tool}&email={email}
```

## Parameters

| Param    | Type                                | Required | Notes                          |
| -------- | ----------------------------------- | -------- | ------------------------------ |
| ids      | string                              | yes      | Comma-separated, up to 200 IDs |
| idtype   | 'pmid' \| 'pmcid' \| 'doi' \| 'mid' | no       | Auto-detect by default         |
| format   | 'json' \| 'xml' \| 'csv' \| 'html'  | no       | Default varies                 |
| versions | 'yes' \| 'no'                       | no       | Show versioned PMCIDs          |
| showaiid | 'yes' \| 'no'                       | no       | Show Article Instance IDs      |
| tool     | string                              | no       | App name                       |
| email    | string                              | no       | Developer email                |

## Response (JSON)

```json
{
  "status": "ok",
  "responseDate": "2024-01-15 12:00:00",
  "request": "ids=12345678;format=json",
  "records": [
    {
      "pmid": "12345678",
      "pmcid": "PMC1234567",
      "doi": "10.1000/example",
      "mid": null,
      "live": true,
      "release-date": null,
      "versions": [
        { "pmcid": "PMC1234567.1", "current": true },
        { "pmcid": "PMC1234567.2", "current": false }
      ],
      "aiid": "1234567"
    }
  ]
}
```

## Domain Types

```
ConvertedId:
  pmid: string | null
  pmcid: string | null
  doi: string | null
  mid: string | null              // Author Manuscript ID (e.g., NIHMS1677310)
  live: boolean                   // true if not under embargo
  releaseDate: string | null      // ISO date if under embargo
  versions?: ReadonlyArray<VersionedId>
  aiid?: string                   // Article Instance ID

VersionedId:
  pmcid: string                   // e.g., PMC2808187.2
  current: boolean

ConvertParams:
  ids: ReadonlyArray<string>
  idtype?: 'pmid' | 'pmcid' | 'doi' | 'mid'
  versions?: boolean
  showaiid?: boolean
  format?: 'json' | 'xml' | 'csv' | 'html'
  tool?: string
  email?: string
```

## Public API

```
convert(ids, options?) → Promise<ReadonlyArray<ConvertedId>>

// Validation utilities
isPMID(value: string) → boolean     // /^\d{1,8}$/
isPMCID(value: string) → boolean    // /^PMC\d+(\.\d+)?$/
isDOI(value: string) → boolean      // /^10\.\d{4,9}\/[^\s]+$/
isMID(value: string) → boolean      // /^(NIHMS|EMS)\d+$/
```

## Notes

- PMCIDs must include "PMC" prefix unless `idtype=pmcid` is set
- Versioned PMCIDs (e.g., PMC2808187.2) only returned with `versions=yes`
- `live=false` indicates article under embargo; `release-date` has expected date
- No documented rate limit (use tool/email for identification)
- Bulk alternative: download `PMC-ids.csv.gz` from FTP
