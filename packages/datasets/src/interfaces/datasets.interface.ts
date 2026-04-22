/** Configuration for the NCBI Datasets client. */
export interface DatasetsConfig {
  readonly apiKey?: string | undefined;
  readonly maxRetries?: number;
}

/** NCBI gene report with annotations, ontology, and cross-references. */
export interface GeneReport {
  readonly geneId: number;
  readonly symbol: string;
  readonly description: string;
  readonly taxId: number;
  readonly taxName: string;
  readonly commonName: string;
  readonly type: string;
  readonly chromosomes: ReadonlyArray<string>;
  readonly synonyms: ReadonlyArray<string>;
  readonly swissProtAccessions: ReadonlyArray<string>;
  readonly ensemblGeneIds: ReadonlyArray<string>;
  readonly omimIds: ReadonlyArray<string>;
  readonly summary: string;
  readonly transcriptCount: number;
  readonly proteinCount: number;
  readonly geneOntology: GeneOntology;
}

/** Gene Ontology annotations grouped by category. */
export interface GeneOntology {
  readonly molecularFunctions: ReadonlyArray<GoTerm>;
  readonly biologicalProcesses: ReadonlyArray<GoTerm>;
  readonly cellularComponents: ReadonlyArray<GoTerm>;
}

/** A single Gene Ontology term with its identifier. */
export interface GoTerm {
  readonly name: string;
  readonly goId: string;
}

/** NCBI taxonomy node with lineage, children, and dataset counts. */
export interface TaxonomyReport {
  readonly taxId: number;
  readonly organismName: string;
  readonly commonName: string;
  readonly rank: string;
  readonly lineage: ReadonlyArray<number>;
  readonly children: ReadonlyArray<number>;
  readonly counts: ReadonlyArray<TaxonomyCount>;
}

/** Count of datasets of a given type for a taxonomy node. */
export interface TaxonomyCount {
  readonly type: string;
  readonly count: number;
}

/** Genome assembly report with organism info and assembly statistics. */
export interface GenomeReport {
  readonly accession: string;
  readonly currentAccession: string;
  readonly sourceDatabase: string;
  readonly organism: GenomeOrganism;
  readonly assemblyInfo: AssemblyInfo;
  readonly assemblyStats: AssemblyStats;
}

/** Organism metadata associated with a genome assembly. */
export interface GenomeOrganism {
  readonly taxId: number;
  readonly organismName: string;
  readonly commonName: string;
}

/** Metadata about a genome assembly submission and release. */
export interface AssemblyInfo {
  readonly assemblyLevel: string;
  readonly assemblyStatus: string;
  readonly assemblyName: string;
  readonly assemblyType: string;
  readonly bioprojectAccession: string;
  readonly releaseDate: string;
  readonly submitter: string;
  readonly refseqCategory: string;
  readonly description: string;
}

/** Assembly-level statistics including contig/scaffold metrics and GC content. */
export interface AssemblyStats {
  readonly totalNumberOfChromosomes: number;
  readonly totalSequenceLength: string;
  readonly totalUngappedLength: string;
  readonly numberOfContigs: number;
  readonly contigN50: number;
  readonly contigL50: number;
  readonly numberOfScaffolds: number;
  readonly scaffoldN50: number;
  readonly scaffoldL50: number;
  readonly gcPercent: number;
}

/** Virus genome report with host, collection, and completeness metadata. */
export interface VirusReport {
  readonly accession: string;
  readonly taxId: number;
  readonly organismName: string;
  readonly isolateName: string;
  readonly host: string;
  readonly collectionDate: string;
  readonly geoLocation: string;
  readonly completeness: string;
  readonly length: number;
  readonly bioprojectAccession: string;
  readonly biosampleAccession: string;
}

/** NCBI BioProject report with project metadata. */
export interface BioProjectReport {
  readonly accession: string;
  readonly title: string;
  readonly description: string;
  readonly organismName: string;
  readonly taxId: number;
  readonly projectType: string;
  readonly registrationDate: string;
}

/** NCBI BioSample report with sample attributes. */
export interface BioSampleReport {
  readonly accession: string;
  readonly title: string;
  readonly description: string;
  readonly organismName: string;
  readonly taxId: number;
  readonly ownerName: string;
  readonly submissionDate: string;
  readonly publicationDate: string;
  readonly attributes: ReadonlyArray<BioSampleAttribute>;
}

/** A single key-value attribute from a BioSample record. */
export interface BioSampleAttribute {
  readonly name: string;
  readonly value: string;
}

/** Lightweight assembly descriptor with core metadata. */
export interface AssemblyDescriptor {
  readonly accession: string;
  readonly assemblyName: string;
  readonly assemblyLevel: string;
  readonly organism: string;
  readonly taxId: number;
  readonly submitter: string;
  readonly releaseDate: string;
}

/** External database link associated with a gene. */
export interface GeneLink {
  readonly geneId: number;
  readonly links: ReadonlyArray<ExternalLink>;
}

/** A single link to an external resource. */
export interface ExternalLink {
  readonly resourceName: string;
  readonly url: string;
}

/** Metadata about an available NCBI dataset. */
export interface DatasetInfo {
  readonly name: string;
  readonly description: string;
  readonly version: string;
}
