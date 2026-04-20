export interface DatasetsConfig {
  readonly apiKey?: string | undefined;
  readonly maxRetries?: number;
}

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

export interface GeneOntology {
  readonly molecularFunctions: ReadonlyArray<GoTerm>;
  readonly biologicalProcesses: ReadonlyArray<GoTerm>;
  readonly cellularComponents: ReadonlyArray<GoTerm>;
}

export interface GoTerm {
  readonly name: string;
  readonly goId: string;
}

export interface TaxonomyReport {
  readonly taxId: number;
  readonly organismName: string;
  readonly commonName: string;
  readonly rank: string;
  readonly lineage: ReadonlyArray<number>;
  readonly children: ReadonlyArray<number>;
  readonly counts: ReadonlyArray<TaxonomyCount>;
}

export interface TaxonomyCount {
  readonly type: string;
  readonly count: number;
}

export interface GenomeReport {
  readonly accession: string;
  readonly currentAccession: string;
  readonly sourceDatabase: string;
  readonly organism: GenomeOrganism;
  readonly assemblyInfo: AssemblyInfo;
  readonly assemblyStats: AssemblyStats;
}

export interface GenomeOrganism {
  readonly taxId: number;
  readonly organismName: string;
  readonly commonName: string;
}

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
