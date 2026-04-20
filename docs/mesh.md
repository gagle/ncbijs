# @ncbijs/mesh — MeSH Vocabulary Utilities Spec Reference

## Overview

MeSH tree traversal, query expansion, and descriptor lookup. Zero dependencies. Ships compact serialized MeSH tree (~2MB).

**Spec:** https://www.nlm.nih.gov/mesh/
**SPARQL:** https://id.nlm.nih.gov/mesh/query
**REST Lookup:** https://id.nlm.nih.gov/mesh/lookup
**Swagger:** https://id.nlm.nih.gov/mesh/swagger/ui

## MeSH Data

### Format: XML-derived JSON (shipped with package)

ASCII format **discontinued January 2026**. Current formats: XML and RDF (N-Triples).
We ship a pre-processed JSON file derived from the annual XML release.

### Record Types

1. **Descriptors** — Main controlled vocabulary (~30,000 terms)
   - 16 top-level categories (A-N, Z): Anatomy, Organisms, Diseases, Chemicals, etc.
   - Hierarchical tree numbers: `C12.050.078` (nested digits separated by periods)
   - A descriptor can have MULTIPLE tree numbers (appear in multiple hierarchies)

2. **Qualifiers** — 78 topical subheadings
   - Only allowed with specific descriptors (constrained pairing)
   - Examples: /drug therapy, /physiopathology, /genetics

3. **Supplementary Concept Records (SCRs)**
   - New chemicals, drugs, rare diseases added outside annual review
   - Updated daily (vs annual for descriptors)
   - Mapped to one or more descriptors

### Tree Number Format

```
C         — Diseases (top category)
C12       — Urogenital Diseases
C12.050   — ... > Genital Diseases
C12.050.078 — ... > > Bartholin's Glands Disease

Multiple tree numbers for one descriptor:
  Asthma: C08.127.108, C08.381.495.108
```

## Public API

```
MeSH()

.lookup(descriptorIdOrName) → MeshDescriptor | null
.expand(term) → ReadonlyArray<string>          // all narrower terms (recursive)
.ancestors(term) → ReadonlyArray<string>       // all broader terms to root
.children(term) → ReadonlyArray<string>        // direct children only
.treePath(term) → ReadonlyArray<string>        // full path from root
.toQuery(term) → string                        // expanded PubMed query with [MeSH] tags

// Optional: live SPARQL queries
.sparql(query: string) → Promise<SparqlResult>

// Optional: REST Lookup
.lookupOnline(query: string) → Promise<ReadonlyArray<MeshDescriptor>>
```

## Domain Types

```
MeshDescriptor:
  id: string                    // e.g., 'D011598'
  name: string                  // e.g., 'Psychoneuroimmunology'
  treeNumbers: ReadonlyArray<string>
  qualifiers: ReadonlyArray<{ name: string; abbreviation: string }>
  pharmacologicalActions: ReadonlyArray<string>
  supplementaryConcepts: ReadonlyArray<string>

SparqlResult:
  head: { vars: ReadonlyArray<string> }
  results: { bindings: ReadonlyArray<Record<string, SparqlBinding>> }

SparqlBinding:
  type: 'uri' | 'literal'
  value: string
  'xml:lang'?: string
```

## toQuery() Algorithm

Given a term like "Stress, Psychological":

1. Look up the descriptor → get tree number(s)
2. Find all descendants in the tree
3. Build PubMed query: `"Stress, Psychological"[MeSH] OR "Burnout, Psychological"[MeSH] OR ...`
4. Include the original term + all narrower terms
5. This is what PubMed does internally when you search `[MeSH Terms]` — but we make it explicit for customization

## SPARQL Endpoint

**URL:** `https://id.nlm.nih.gov/mesh/query`
**Format:** Standard SPARQL 1.1
**Response:** JSON (application/sparql-results+json)

Example query (find all narrower terms):

```sparql
PREFIX mesh: <http://id.nlm.nih.gov/mesh/>
PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
SELECT ?descriptor ?label WHERE {
  ?descriptor meshv:broaderDescriptor mesh:D013315 .
  ?descriptor rdfs:label ?label .
}
```

## REST Lookup Endpoint

**URL:** `https://id.nlm.nih.gov/mesh/lookup`
**Response:** JSON

Capabilities:

- Autocomplete by descriptor label (partial match)
- Descriptor ID → label resolution
- Descriptor → allowable qualifiers
- Related descriptors, term variants

## Data File Strategy

The ~2MB JSON file contains:

- All descriptors with their tree numbers, names, and qualifier lists
- Tree structure (parent-child relationships)
- Pre-computed for fast traversal (no XML parsing at runtime)

Stored in `packages/mesh/data/mesh-tree.json`.
Marked as `linguist-generated=true binary` in `.gitattributes`.
Published with the package via `files: ["dist", "data", ...]`.
