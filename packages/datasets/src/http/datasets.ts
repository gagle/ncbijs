import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './datasets-client';
import type { DatasetsClientConfig } from './datasets-client';
import type {
  AssemblyDescriptor,
  AssemblyInfo,
  AssemblyStats,
  BioProjectReport,
  BioSampleAttribute,
  BioSampleReport,
  DatasetInfo,
  DatasetsConfig,
  ExternalLink,
  GeneLink,
  GeneOntology,
  GeneReport,
  GenomeOrganism,
  GenomeReport,
  GoTerm,
  TaxonomyCount,
  TaxonomyReport,
  VirusReport,
} from '../interfaces/datasets.interface';

const BASE_URL = 'https://api.ncbi.nlm.nih.gov/datasets/v2';
const REQUESTS_PER_SECOND_DEFAULT = 5;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

/** NCBI Datasets v2 API client for genes, genomes, taxonomy, and biosamples. */
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

  /** Fetch gene reports by NCBI Gene IDs. */
  public async geneById(geneIds: ReadonlyArray<number>): Promise<ReadonlyArray<GeneReport>> {
    if (geneIds.length === 0) {
      throw new Error('geneIds must not be empty');
    }

    const joined = geneIds.join(',');
    const url = `${BASE_URL}/gene/id/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawGeneResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGeneReport);
  }

  /** Fetch gene reports by gene symbols within a specific taxon. */
  public async geneBySymbol(
    symbols: ReadonlyArray<string>,
    taxon: number | string,
  ): Promise<ReadonlyArray<GeneReport>> {
    if (symbols.length === 0) {
      throw new Error('symbols must not be empty');
    }

    const joined = symbols.join(',');
    const url = `${BASE_URL}/gene/symbol/${encodeURIComponent(joined)}/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawGeneResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGeneReport);
  }

  /** Fetch taxonomy reports by taxon IDs or names. */
  public async taxonomy(
    taxons: ReadonlyArray<number | string>,
  ): Promise<ReadonlyArray<TaxonomyReport>> {
    if (taxons.length === 0) {
      throw new Error('taxons must not be empty');
    }

    const joined = taxons.join(',');
    const url = `${BASE_URL}/taxonomy/taxon/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawTaxonomyResponse>(url, this._config);

    if (raw.reports !== undefined && raw.reports.length > 0) {
      return raw.reports.map(mapTaxonomyReportV2);
    }

    return (raw.taxonomy_nodes ?? []).map(mapTaxonomyReportLegacy);
  }

  /** Fetch genome assembly reports by accession numbers. */
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

  /** Fetch genome assembly reports for a given taxon. */
  public async genomeByTaxon(taxon: number | string): Promise<ReadonlyArray<GenomeReport>> {
    const url = `${BASE_URL}/genome/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawGenomeResponse>(url, this._config);

    return (raw.reports ?? []).map(mapGenomeReport);
  }

  /** Fetch virus genome reports by accession numbers. */
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

  /** Fetch virus genome reports for a given taxon. */
  public async virusByTaxon(taxon: number | string): Promise<ReadonlyArray<VirusReport>> {
    const url = `${BASE_URL}/virus/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawVirusResponse>(url, this._config);

    return (raw.reports ?? []).map(mapVirusReport);
  }

  /** Fetch BioProject reports by accession numbers. */
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

  /** Fetch BioSample reports by accession numbers. */
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

  /** Fetch lightweight assembly descriptors by accession numbers. */
  public async assemblyDescriptors(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<AssemblyDescriptor>> {
    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/genome/accession/${encodeURIComponent(joined)}/assembly_descriptors`;
    const raw = await fetchJson<RawAssemblyDescriptorResponse>(url, this._config);

    return (raw.assemblies ?? []).map(mapAssemblyDescriptor);
  }

  /** Fetch external database links for genes by NCBI Gene IDs. */
  public async geneLinks(geneIds: ReadonlyArray<number>): Promise<ReadonlyArray<GeneLink>> {
    if (geneIds.length === 0) {
      throw new Error('geneIds must not be empty');
    }

    const joined = geneIds.join(',');
    const url = `${BASE_URL}/gene/id/${encodeURIComponent(joined)}/links`;
    const raw = await fetchJson<RawGeneLinkResponse>(url, this._config);

    return (raw.genes ?? []).map(mapGeneLink);
  }

  /** List available NCBI datasets from the catalog. */
  public async datasetCatalog(): Promise<ReadonlyArray<DatasetInfo>> {
    const url = `${BASE_URL}/dataset_catalog`;
    const raw = await fetchJson<RawDatasetCatalogResponse>(url, this._config);

    return (raw.datasets ?? []).map(mapDatasetInfo);
  }
}

interface RawGeneResponse {
  readonly reports?: ReadonlyArray<RawGeneReportWrapper>;
}

interface RawGeneReportWrapper {
  readonly gene?: RawGeneData;
}

interface RawGeneData {
  readonly gene_id?: number | string;
  readonly symbol?: string;
  readonly description?: string;
  readonly tax_id?: number | string;
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
  readonly reports?: ReadonlyArray<RawTaxonomyReportWrapper>;
  readonly total_count?: number;
}

interface RawTaxonomyReportWrapper {
  readonly taxonomy?: RawTaxonomyDataV2;
  readonly query?: ReadonlyArray<string>;
}

interface RawTaxonomyDataV2 {
  readonly tax_id?: number;
  readonly current_scientific_name?: { readonly name?: string };
  readonly curator_common_name?: string;
  readonly rank?: string;
  readonly parents?: ReadonlyArray<number>;
  readonly children?: ReadonlyArray<number>;
  readonly counts?: ReadonlyArray<RawTaxonomyCount>;
}

interface RawTaxonomyNode {
  readonly taxonomy?: RawTaxonomyDataLegacy;
}

interface RawTaxonomyDataLegacy {
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
    geneId: Number(gene.gene_id ?? 0),
    symbol: gene.symbol ?? '',
    description: gene.description ?? '',
    taxId: Number(gene.tax_id ?? 0),
    taxName: gene.taxname ?? '',
    commonName: gene.common_name ?? '',
    type: normalizeGeneType(gene.type ?? ''),
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

function normalizeGeneType(rawType: string): string {
  return rawType.toLowerCase().replace(/_/g, '-');
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

function mapTaxonomyReportV2(wrapper: RawTaxonomyReportWrapper): TaxonomyReport {
  const taxonomy = wrapper.taxonomy ?? {};
  return {
    taxId: taxonomy.tax_id ?? 0,
    organismName: taxonomy.current_scientific_name?.name ?? '',
    commonName: taxonomy.curator_common_name ?? '',
    rank: (taxonomy.rank ?? '').toLowerCase(),
    lineage: taxonomy.parents ?? [],
    children: taxonomy.children ?? [],
    counts: (taxonomy.counts ?? []).map(mapTaxonomyCountV2),
  };
}

function mapTaxonomyReportLegacy(node: RawTaxonomyNode): TaxonomyReport {
  const taxonomy = node.taxonomy ?? {};
  return {
    taxId: taxonomy.tax_id ?? 0,
    organismName: taxonomy.organism_name ?? '',
    commonName: taxonomy.genbank_common_name ?? '',
    rank: taxonomy.rank ?? '',
    lineage: taxonomy.lineage ?? [],
    children: taxonomy.children ?? [],
    counts: (taxonomy.counts ?? []).map(mapTaxonomyCountLegacy),
  };
}

function mapTaxonomyCountV2(raw: RawTaxonomyCount): TaxonomyCount {
  const rawType = raw.type ?? '';
  const normalizedType = rawType.startsWith('COUNT_TYPE_')
    ? rawType.slice('COUNT_TYPE_'.length).toLowerCase()
    : rawType.toLowerCase();

  return {
    type: normalizedType,
    count: raw.count ?? 0,
  };
}

function mapTaxonomyCountLegacy(raw: RawTaxonomyCount): TaxonomyCount {
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

interface RawAssemblyDescriptorResponse {
  readonly assemblies?: ReadonlyArray<RawAssemblyDescriptorData>;
}

interface RawAssemblyDescriptorData {
  readonly accession?: string;
  readonly assembly_name?: string;
  readonly assembly_level?: string;
  readonly organism?: string;
  readonly tax_id?: number;
  readonly submitter?: string;
  readonly release_date?: string;
}

interface RawGeneLinkResponse {
  readonly genes?: ReadonlyArray<RawGeneLinkData>;
}

interface RawGeneLinkData {
  readonly gene_id?: number;
  readonly links?: ReadonlyArray<RawExternalLink>;
}

interface RawExternalLink {
  readonly resource_name?: string;
  readonly url?: string;
}

interface RawDatasetCatalogResponse {
  readonly datasets?: ReadonlyArray<RawDatasetInfoData>;
}

interface RawDatasetInfoData {
  readonly name?: string;
  readonly description?: string;
  readonly version?: string;
}

function mapAssemblyDescriptor(raw: RawAssemblyDescriptorData): AssemblyDescriptor {
  return {
    accession: raw.accession ?? '',
    assemblyName: raw.assembly_name ?? '',
    assemblyLevel: raw.assembly_level ?? '',
    organism: raw.organism ?? '',
    taxId: raw.tax_id ?? 0,
    submitter: raw.submitter ?? '',
    releaseDate: raw.release_date ?? '',
  };
}

function mapGeneLink(raw: RawGeneLinkData): GeneLink {
  return {
    geneId: raw.gene_id ?? 0,
    links: (raw.links ?? []).map(mapExternalLink),
  };
}

function mapExternalLink(raw: RawExternalLink): ExternalLink {
  return {
    resourceName: raw.resource_name ?? '',
    url: raw.url ?? '',
  };
}

function mapDatasetInfo(raw: RawDatasetInfoData): DatasetInfo {
  return {
    name: raw.name ?? '',
    description: raw.description ?? '',
    version: raw.version ?? '',
  };
}
