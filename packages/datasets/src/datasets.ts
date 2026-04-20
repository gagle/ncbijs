import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './datasets-client';
import type { DatasetsClientConfig } from './datasets-client';
import type {
  AssemblyInfo,
  AssemblyStats,
  BioProjectReport,
  BioSampleAttribute,
  BioSampleReport,
  DatasetsConfig,
  GeneOntology,
  GeneReport,
  GenomeOrganism,
  GenomeReport,
  GoTerm,
  TaxonomyCount,
  TaxonomyReport,
  VirusReport,
} from './interfaces/datasets.interface';

const BASE_URL = 'https://api.ncbi.nlm.nih.gov/datasets/v2';
const REQUESTS_PER_SECOND_DEFAULT = 5;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

export class Datasets {
  private readonly _config: DatasetsClientConfig;

  constructor(config?: DatasetsConfig) {
    const requestsPerSecond = config?.apiKey
      ? REQUESTS_PER_SECOND_WITH_KEY
      : REQUESTS_PER_SECOND_DEFAULT;

    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond }),
    };
  }

  public async geneById(geneIds: ReadonlyArray<number>): Promise<ReadonlyArray<GeneReport>> {
    if (geneIds.length === 0) {
      throw new Error('geneIds must not be empty');
    }

    const joined = geneIds.join(',');
    const url = `${BASE_URL}/gene/id/${encodeURIComponent(joined)}`;
    const raw = await fetchJson<RawGeneResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGeneReport);
  }

  public async geneBySymbol(
    symbols: ReadonlyArray<string>,
    taxon: number | string,
  ): Promise<ReadonlyArray<GeneReport>> {
    if (symbols.length === 0) {
      throw new Error('symbols must not be empty');
    }

    const joined = symbols.join(',');
    const url = `${BASE_URL}/gene/symbol/${encodeURIComponent(joined)}/taxon/${encodeURIComponent(String(taxon))}`;
    const raw = await fetchJson<RawGeneResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGeneReport);
  }

  public async taxonomy(
    taxons: ReadonlyArray<number | string>,
  ): Promise<ReadonlyArray<TaxonomyReport>> {
    if (taxons.length === 0) {
      throw new Error('taxons must not be empty');
    }

    const joined = taxons.join(',');
    const url = `${BASE_URL}/taxonomy/taxon/${encodeURIComponent(joined)}`;
    const raw = await fetchJson<RawTaxonomyResponse>(url, this._config);

    return (raw.taxonomy_nodes ?? []).map(mapTaxonomyReport);
  }

  public async genomeByAccession(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<GenomeReport>> {
    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/genome/accession/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawGenomeResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGenomeReport);
  }

  public async genomeByTaxon(taxon: number | string): Promise<ReadonlyArray<GenomeReport>> {
    const url = `${BASE_URL}/genome/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawGenomeResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGenomeReport);
  }

  public async virusByAccession(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<VirusReport>> {
    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/virus/accession/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawVirusResponse>(url, this._config);

    return (raw.reports ?? []).map(mapVirusReport);
  }

  public async virusByTaxon(taxon: number | string): Promise<ReadonlyArray<VirusReport>> {
    const url = `${BASE_URL}/virus/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawVirusResponse>(url, this._config);

    return (raw.reports ?? []).map(mapVirusReport);
  }

  public async bioproject(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<BioProjectReport>> {
    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/bioproject/accession/${encodeURIComponent(joined)}`;
    const raw = await fetchJson<RawBioProjectResponse>(url, this._config);

    return (raw.reports ?? []).map(mapBioProjectReport);
  }

  public async biosample(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<BioSampleReport>> {
    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/biosample/accession/${encodeURIComponent(joined)}`;
    const raw = await fetchJson<RawBioSampleResponse>(url, this._config);

    return (raw.reports ?? []).map(mapBioSampleReport);
  }
}

interface RawGeneResponse {
  readonly reports?: ReadonlyArray<RawGeneReportWrapper>;
}

interface RawGeneReportWrapper {
  readonly gene?: RawGeneData;
}

interface RawGeneData {
  readonly gene_id?: number;
  readonly symbol?: string;
  readonly description?: string;
  readonly tax_id?: number;
  readonly taxname?: string;
  readonly common_name?: string;
  readonly type?: string;
  readonly chromosomes?: ReadonlyArray<string>;
  readonly synonyms?: ReadonlyArray<string>;
  readonly swiss_prot_accessions?: ReadonlyArray<string>;
  readonly ensembl_gene_ids?: ReadonlyArray<string>;
  readonly omim_ids?: ReadonlyArray<string>;
  readonly summary?: ReadonlyArray<string>;
  readonly transcript_count?: number;
  readonly protein_count?: number;
  readonly gene_ontology?: RawGeneOntology;
}

interface RawGeneOntology {
  readonly molecular_functions?: ReadonlyArray<RawGoTerm>;
  readonly biological_processes?: ReadonlyArray<RawGoTerm>;
  readonly cellular_components?: ReadonlyArray<RawGoTerm>;
}

interface RawGoTerm {
  readonly name?: string;
  readonly go_id?: string;
}

interface RawTaxonomyResponse {
  readonly taxonomy_nodes?: ReadonlyArray<RawTaxonomyNode>;
}

interface RawTaxonomyNode {
  readonly taxonomy?: RawTaxonomyData;
}

interface RawTaxonomyData {
  readonly tax_id?: number;
  readonly organism_name?: string;
  readonly genbank_common_name?: string;
  readonly rank?: string;
  readonly lineage?: ReadonlyArray<number>;
  readonly children?: ReadonlyArray<number>;
  readonly counts?: ReadonlyArray<RawTaxonomyCount>;
}

interface RawTaxonomyCount {
  readonly type?: string;
  readonly count?: number;
}

interface RawGenomeResponse {
  readonly reports?: ReadonlyArray<RawGenomeData>;
}

interface RawGenomeData {
  readonly accession?: string;
  readonly current_accession?: string;
  readonly source_database?: string;
  readonly organism?: RawGenomeOrganism;
  readonly assembly_info?: RawAssemblyInfo;
  readonly assembly_stats?: RawAssemblyStats;
}

interface RawGenomeOrganism {
  readonly tax_id?: number;
  readonly organism_name?: string;
  readonly common_name?: string;
}

interface RawAssemblyInfo {
  readonly assembly_level?: string;
  readonly assembly_status?: string;
  readonly assembly_name?: string;
  readonly assembly_type?: string;
  readonly bioproject_accession?: string;
  readonly release_date?: string;
  readonly submitter?: string;
  readonly refseq_category?: string;
  readonly description?: string;
}

interface RawAssemblyStats {
  readonly total_number_of_chromosomes?: number;
  readonly total_sequence_length?: string;
  readonly total_ungapped_length?: string;
  readonly number_of_contigs?: number;
  readonly contig_n50?: number;
  readonly contig_l50?: number;
  readonly number_of_scaffolds?: number;
  readonly scaffold_n50?: number;
  readonly scaffold_l50?: number;
  readonly gc_percent?: number;
}

function mapGeneReport(wrapper: RawGeneReportWrapper): GeneReport {
  const gene = wrapper.gene ?? {};
  return {
    geneId: gene.gene_id ?? 0,
    symbol: gene.symbol ?? '',
    description: gene.description ?? '',
    taxId: gene.tax_id ?? 0,
    taxName: gene.taxname ?? '',
    commonName: gene.common_name ?? '',
    type: gene.type ?? '',
    chromosomes: gene.chromosomes ?? [],
    synonyms: gene.synonyms ?? [],
    swissProtAccessions: gene.swiss_prot_accessions ?? [],
    ensemblGeneIds: gene.ensembl_gene_ids ?? [],
    omimIds: gene.omim_ids ?? [],
    summary: (gene.summary ?? []).join(' '),
    transcriptCount: gene.transcript_count ?? 0,
    proteinCount: gene.protein_count ?? 0,
    geneOntology: mapGeneOntology(gene.gene_ontology),
  };
}

function mapGeneOntology(raw?: RawGeneOntology): GeneOntology {
  return {
    molecularFunctions: (raw?.molecular_functions ?? []).map(mapGoTerm),
    biologicalProcesses: (raw?.biological_processes ?? []).map(mapGoTerm),
    cellularComponents: (raw?.cellular_components ?? []).map(mapGoTerm),
  };
}

function mapGoTerm(raw: RawGoTerm): GoTerm {
  return {
    name: raw.name ?? '',
    goId: raw.go_id ?? '',
  };
}

function mapTaxonomyReport(node: RawTaxonomyNode): TaxonomyReport {
  const taxonomy = node.taxonomy ?? {};
  return {
    taxId: taxonomy.tax_id ?? 0,
    organismName: taxonomy.organism_name ?? '',
    commonName: taxonomy.genbank_common_name ?? '',
    rank: taxonomy.rank ?? '',
    lineage: taxonomy.lineage ?? [],
    children: taxonomy.children ?? [],
    counts: (taxonomy.counts ?? []).map(mapTaxonomyCount),
  };
}

function mapTaxonomyCount(raw: RawTaxonomyCount): TaxonomyCount {
  return {
    type: raw.type ?? '',
    count: raw.count ?? 0,
  };
}

function mapGenomeReport(raw: RawGenomeData): GenomeReport {
  return {
    accession: raw.accession ?? '',
    currentAccession: raw.current_accession ?? '',
    sourceDatabase: raw.source_database ?? '',
    organism: mapGenomeOrganism(raw.organism),
    assemblyInfo: mapAssemblyInfo(raw.assembly_info),
    assemblyStats: mapAssemblyStats(raw.assembly_stats),
  };
}

function mapGenomeOrganism(raw?: RawGenomeOrganism): GenomeOrganism {
  return {
    taxId: raw?.tax_id ?? 0,
    organismName: raw?.organism_name ?? '',
    commonName: raw?.common_name ?? '',
  };
}

function mapAssemblyInfo(raw?: RawAssemblyInfo): AssemblyInfo {
  return {
    assemblyLevel: raw?.assembly_level ?? '',
    assemblyStatus: raw?.assembly_status ?? '',
    assemblyName: raw?.assembly_name ?? '',
    assemblyType: raw?.assembly_type ?? '',
    bioprojectAccession: raw?.bioproject_accession ?? '',
    releaseDate: raw?.release_date ?? '',
    submitter: raw?.submitter ?? '',
    refseqCategory: raw?.refseq_category ?? '',
    description: raw?.description ?? '',
  };
}

function mapAssemblyStats(raw?: RawAssemblyStats): AssemblyStats {
  return {
    totalNumberOfChromosomes: raw?.total_number_of_chromosomes ?? 0,
    totalSequenceLength: raw?.total_sequence_length ?? '',
    totalUngappedLength: raw?.total_ungapped_length ?? '',
    numberOfContigs: raw?.number_of_contigs ?? 0,
    contigN50: raw?.contig_n50 ?? 0,
    contigL50: raw?.contig_l50 ?? 0,
    numberOfScaffolds: raw?.number_of_scaffolds ?? 0,
    scaffoldN50: raw?.scaffold_n50 ?? 0,
    scaffoldL50: raw?.scaffold_l50 ?? 0,
    gcPercent: raw?.gc_percent ?? 0,
  };
}

interface RawVirusResponse {
  readonly reports?: ReadonlyArray<RawVirusData>;
}

interface RawVirusData {
  readonly accession?: string;
  readonly tax_id?: number;
  readonly organism_name?: string;
  readonly isolate_name?: string;
  readonly host?: string;
  readonly collection_date?: string;
  readonly geo_location?: string;
  readonly completeness?: string;
  readonly length?: number;
  readonly bioproject_accession?: string;
  readonly biosample_accession?: string;
}

interface RawBioProjectResponse {
  readonly reports?: ReadonlyArray<RawBioProjectData>;
}

interface RawBioProjectData {
  readonly accession?: string;
  readonly title?: string;
  readonly description?: string;
  readonly organism_name?: string;
  readonly tax_id?: number;
  readonly project_type?: string;
  readonly registration_date?: string;
}

interface RawBioSampleResponse {
  readonly reports?: ReadonlyArray<RawBioSampleData>;
}

interface RawBioSampleData {
  readonly accession?: string;
  readonly title?: string;
  readonly description?: string;
  readonly organism_name?: string;
  readonly tax_id?: number;
  readonly owner_name?: string;
  readonly submission_date?: string;
  readonly publication_date?: string;
  readonly attributes?: ReadonlyArray<RawBioSampleAttribute>;
}

interface RawBioSampleAttribute {
  readonly name?: string;
  readonly value?: string;
}

function mapVirusReport(raw: RawVirusData): VirusReport {
  return {
    accession: raw.accession ?? '',
    taxId: raw.tax_id ?? 0,
    organismName: raw.organism_name ?? '',
    isolateName: raw.isolate_name ?? '',
    host: raw.host ?? '',
    collectionDate: raw.collection_date ?? '',
    geoLocation: raw.geo_location ?? '',
    completeness: raw.completeness ?? '',
    length: raw.length ?? 0,
    bioprojectAccession: raw.bioproject_accession ?? '',
    biosampleAccession: raw.biosample_accession ?? '',
  };
}

function mapBioProjectReport(raw: RawBioProjectData): BioProjectReport {
  return {
    accession: raw.accession ?? '',
    title: raw.title ?? '',
    description: raw.description ?? '',
    organismName: raw.organism_name ?? '',
    taxId: raw.tax_id ?? 0,
    projectType: raw.project_type ?? '',
    registrationDate: raw.registration_date ?? '',
  };
}

function mapBioSampleReport(raw: RawBioSampleData): BioSampleReport {
  return {
    accession: raw.accession ?? '',
    title: raw.title ?? '',
    description: raw.description ?? '',
    organismName: raw.organism_name ?? '',
    taxId: raw.tax_id ?? 0,
    ownerName: raw.owner_name ?? '',
    submissionDate: raw.submission_date ?? '',
    publicationDate: raw.publication_date ?? '',
    attributes: (raw.attributes ?? []).map(mapBioSampleAttribute),
  };
}

function mapBioSampleAttribute(raw: RawBioSampleAttribute): BioSampleAttribute {
  return {
    name: raw.name ?? '',
    value: raw.value ?? '',
  };
}
