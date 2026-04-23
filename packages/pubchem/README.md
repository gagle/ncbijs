# @ncbijs/pubchem

Typed client for the PubChem PUG REST API. Look up compounds, substances, and bioassays by ID or name with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/pubchem
```

## Usage

```ts
import { PubChem } from '@ncbijs/pubchem';

const pubchem = new PubChem();

const aspirin = await pubchem.compoundByCid(2244);
console.log(aspirin.molecularFormula); // 'C9H8O4'
console.log(aspirin.iupacName); // '2-acetyloxybenzoic acid'
console.log(aspirin.molecularWeight); // 180.16

const byName = await pubchem.compoundByName('caffeine');
console.log(byName.cid); // 2519

const synonyms = await pubchem.synonyms(2244);
console.log(synonyms.synonyms[0]); // 'aspirin'

const description = await pubchem.description(2244);
console.log(description.title); // 'Aspirin'
```

## API

### `new PubChem(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

PubChem is a fully public API with no API key required. Rate limit: 5 requests/second.

### Compound

#### `compoundByCid(cid: number): Promise<CompoundProperty>`

Fetch compound properties by PubChem CID.

#### `compoundByName(name: string): Promise<CompoundProperty>`

Fetch compound properties by compound name.

#### `compoundByCidBatch(cids: Array<number>): Promise<Array<CompoundProperty>>`

Fetch properties for multiple compounds by CID in a single request.

#### `compoundBySmiles(smiles: string): Promise<CompoundProperty>`

Fetch compound properties by SMILES string.

#### `compoundByInchiKey(inchiKey: string): Promise<CompoundProperty>`

Fetch compound properties by InChIKey.

#### `cidsByName(name: string): Promise<Array<number>>`

Look up PubChem CIDs matching a compound name.

### Synonyms

#### `synonyms(cid: number): Promise<CompoundSynonyms>`

Fetch all known synonyms for a compound by CID.

### Description

#### `description(cid: number): Promise<CompoundDescription>`

Fetch the title and description for a compound by CID.

### Substance

#### `substanceBySid(sid: number): Promise<SubstanceRecord>`

Fetch substance details by PubChem SID.

#### `substanceBySidBatch(sids: Array<number>): Promise<Array<SubstanceRecord>>`

Fetch details for multiple substances by SID in a single request.

#### `substanceByName(name: string): Promise<SubstanceRecord>`

Fetch substance details by substance name.

#### `substanceSynonyms(sid: number): Promise<SubstanceSynonyms>`

Fetch all known synonyms for a substance by SID.

#### `sidsByName(name: string): Promise<Array<number>>`

Look up PubChem SIDs matching a substance name.

### BioAssay

#### `assayByAid(aid: number): Promise<AssayRecord>`

Fetch bioassay details by PubChem AID.

#### `assayByAidBatch(aids: Array<number>): Promise<Array<AssayRecord>>`

Fetch details for multiple bioassays by AID in a single request.

#### `assaySummary(aid: number): Promise<AssaySummary>`

Fetch a summary of substance and compound counts for a bioassay.

### Gene

#### `geneByGeneId(geneId: number): Promise<GeneRecord>`

Fetch a gene summary by NCBI Gene ID.

```ts
const gene = await pubchem.geneByGeneId(1956);
console.log(gene.symbol); // 'EGFR'
console.log(gene.name); // 'epidermal growth factor receptor'
```

#### `geneByCid(cid: number): Promise<Array<number>>`

Get NCBI Gene IDs linked to a compound by CID.

```ts
const geneIds = await pubchem.geneByCid(2244);
console.log(geneIds); // [5742, 5743]
```

### Protein

#### `proteinByAccession(accession: string): Promise<ProteinRecord>`

Fetch a protein summary by accession.

```ts
const protein = await pubchem.proteinByAccession('P00533');
console.log(protein.name); // 'Epidermal growth factor receptor'
console.log(protein.organism); // 'Homo sapiens'
```

### Classification

#### `compoundClassification(cid: number): Promise<Array<ClassificationNode>>`

Fetch the classification hierarchy for a compound from PUG View.

```ts
const nodes = await pubchem.compoundClassification(2244);
console.log(nodes[0].name); // 'MeSH Tree'
console.log(nodes[0].childNodes.length);
```

### Patents

#### `compoundPatents(cid: number): Promise<Array<PatentRecord>>`

Fetch patents associated with a compound from PUG View.

```ts
const patents = await pubchem.compoundPatents(2244);
console.log(patents[0].patentId); // 'US-1234567-A'
console.log(patents[0].title);
```

### PUG View Annotations

#### `compoundAnnotations(cid: number, heading?: string): Promise<AnnotationRecord>`

Fetch full compound annotations (GHS classification, patents, pharmacology). Pass `heading` to filter to a specific section.

#### `substanceAnnotations(sid: number, heading?: string): Promise<AnnotationRecord>`

Fetch full substance annotations.

#### `assayAnnotations(aid: number, heading?: string): Promise<AnnotationRecord>`

Fetch full bioassay annotations.

```ts
const annotations = await pubchem.compoundAnnotations(2244);
console.log(annotations.recordTitle); // 'Aspirin'
console.log(annotations.sections.length);

const ghs = await pubchem.compoundAnnotations(2244, 'GHS Classification');
console.log(ghs.sections[0].tocHeading);
```

## Bulk parsers

### `parsePubchemLiteratureTsv(tsv: string): ReadonlyArray<CompoundLiteratureLink>`

Parses a PubChem compound-to-literature link TSV file from the NCBI FTP release (`/pubchem/Compound/Extras/CID-PMID.gz`). Each non-comment, non-empty line is decoded into a `CompoundLiteratureLink` record with `cid`, `pmid`, and `type`.

```ts
import { parsePubchemLiteratureTsv } from '@ncbijs/pubchem';
const links = parsePubchemLiteratureTsv(fs.readFileSync('CID-PMID', 'utf-8'));
```

## Error handling

```ts
import { PubChem, PubChemHttpError } from '@ncbijs/pubchem';

try {
  await pubchem.compoundByName('notarealcompound');
} catch (err) {
  if (err instanceof PubChemHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter. PubChem is rate-limited to 5 requests/second.

## Response types

### `CompoundProperty`

```ts
interface CompoundProperty {
  cid: number;
  molecularFormula: string;
  molecularWeight: number;
  iupacName: string;
  canonicalSmiles: string;
  isomericSmiles: string;
  inchi: string;
  inchiKey: string;
  xLogP: number;
  exactMass: number;
  monoisotopicMass: number;
  tpsa: number;
  complexity: number;
  hBondDonorCount: number;
  hBondAcceptorCount: number;
  rotatableBondCount: number;
  heavyAtomCount: number;
}
```

### `CompoundSynonyms`

```ts
interface CompoundSynonyms {
  cid: number;
  synonyms: Array<string>;
}
```

### `CompoundDescription`

```ts
interface CompoundDescription {
  cid: number;
  title: string;
  description: string;
}
```

### `SubstanceRecord`

```ts
interface SubstanceRecord {
  sid: number;
  sourceName: string;
  sourceId: string;
  description: string;
}
```

### `SubstanceSynonyms`

```ts
interface SubstanceSynonyms {
  sid: number;
  synonyms: Array<string>;
}
```

### `AssayRecord`

```ts
interface AssayRecord {
  aid: number;
  name: string;
  description: string;
  protocol: string;
  sourceName: string;
  sourceId: string;
}
```

### `AssaySummary`

```ts
interface AssaySummary {
  aid: number;
  name: string;
  sidCount: number;
  cidCount: number;
}
```

### `AnnotationRecord`

```ts
interface AnnotationRecord {
  recordType: string;
  recordNumber: number;
  recordTitle: string;
  sections: Array<AnnotationSection>;
}
```

### `AnnotationSection`

```ts
interface AnnotationSection {
  tocHeading: string;
  description: string;
  sections: Array<AnnotationSection>;
  information: Array<AnnotationData>;
}
```

### `AnnotationData`

```ts
interface AnnotationData {
  referenceNumber: number;
  name: string;
  value: string;
  url: string;
}
```

### `GeneRecord`

```ts
interface GeneRecord {
  geneId: number;
  symbol: string;
  name: string;
  taxId: number;
  description: string;
}
```

### `ProteinRecord`

```ts
interface ProteinRecord {
  accession: string;
  name: string;
  organism: string;
  taxId: number;
}
```

### `ClassificationNode`

```ts
interface ClassificationNode {
  name: string;
  description: string;
  childNodes: Array<ClassificationNode>;
}
```

### `PatentRecord`

```ts
interface PatentRecord {
  patentId: string;
  title: string;
  inventorNames: Array<string>;
  assigneeNames: Array<string>;
}
```

### `CompoundLiteratureLink`

```ts
interface CompoundLiteratureLink {
  cid: number;
  pmid: number;
  type: string;
}
```
