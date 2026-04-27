import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './datasets-client';
import type { DatasetsClientConfig } from './datasets-client';
import type {
  AssemblyInfo,
  AssemblyStats,
  BioSampleAttribute,
  BioSampleReport,
  DataStorage,
  DatasetsConfig,
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
import { StorageModeError } from '../interfaces/datasets.interface';

const BASE_URL = 'https://api.ncbi.nlm.nih.gov/datasets/v2';
const REQUESTS_PER_SECOND_DEFAULT = 5;
const REQUESTS_PER_SECOND_WITH_KEY = 10;

/** NCBI Datasets v2 API client for genes, genomes, taxonomy, and biosamples. */
export class Datasets {
  private readonly _config: DatasetsClientConfig | undefined;
  private readonly _storage: DataStorage | undefined;

  constructor(config?: DatasetsConfig) {
    this._storage = undefined;

    const requestsPerSecond = config?.apiKey
      ? REQUESTS_PER_SECOND_WITH_KEY
      : REQUESTS_PER_SECOND_DEFAULT;

    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond }),
    };
  }

  /**
   * Create a Datasets instance backed by local storage instead of NCBI HTTP APIs.
   *
   * Methods with corresponding stored data (`geneById`, `geneBySymbol`, `taxonomy`)
   * query the storage directly. Methods without stored data equivalents
   * throw a `StorageModeError`.
   *
   * @param storage - Any object implementing the `DataStorage` interface.
   *   `ReadableStorage` from `@ncbijs/store` satisfies this interface.
   */
  public static fromStorage(storage: DataStorage): Datasets {
    const instance = Object.create(Datasets.prototype) as Datasets;
    Object.defineProperty(instance, '_storage', { value: storage, enumerable: true });
    Object.defineProperty(instance, '_config', { value: undefined, enumerable: true });
    return instance;
  }

  /** Fetch gene reports by NCBI Gene IDs. */
  public async geneById(geneIds: ReadonlyArray<number>): Promise<ReadonlyArray<GeneReport>> {
    if (geneIds.length === 0) {
      throw new Error('geneIds must not be empty');
    }

    if (this._storage !== undefined) {
      const results: Array<GeneReport> = [];
      for (const geneId of geneIds) {
        const record = await this._storage.getRecord<GeneReport>('genes', String(geneId));
        if (record !== undefined) {
          results.push(record);
        }
      }
      return results;
    }

    const joined = geneIds.join(',');
    const url = `${BASE_URL}/gene/id/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawGeneResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapGeneReport);
  }

  /** Fetch gene reports by gene symbols within a specific taxon. */
  public async geneBySymbol(
    symbols: ReadonlyArray<string>,
    _taxon: number | string,
  ): Promise<ReadonlyArray<GeneReport>> {
    if (symbols.length === 0) {
      throw new Error('symbols must not be empty');
    }

    if (this._storage !== undefined) {
      const results: Array<GeneReport> = [];
      for (const symbol of symbols) {
        const matches = await this._storage.searchRecords<GeneReport>('genes', {
          field: 'symbol',
          value: symbol,
          operator: 'eq',
        });
        results.push(...matches);
      }
      return results;
    }

    const joined = symbols.join(',');
    const url = `${BASE_URL}/gene/symbol/${encodeURIComponent(joined)}/taxon/${encodeURIComponent(String(_taxon))}/dataset_report`;
    const raw = await fetchJson<RawGeneResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapGeneReport);
  }

  /** Fetch taxonomy reports by taxon IDs or names. */
  public async taxonomy(
    taxons: ReadonlyArray<number | string>,
  ): Promise<ReadonlyArray<TaxonomyReport>> {
    if (taxons.length === 0) {
      throw new Error('taxons must not be empty');
    }

    if (this._storage !== undefined) {
      const results: Array<TaxonomyReport> = [];
      for (const taxon of taxons) {
        if (typeof taxon === 'number') {
          const record = await this._storage.getRecord<TaxonomyReport>('taxonomy', String(taxon));
          if (record !== undefined) {
            results.push(record);
          }
        } else {
          const matches = await this._storage.searchRecords<TaxonomyReport>('taxonomy', {
            field: 'organismName',
            value: taxon,
            operator: 'contains',
          });
          results.push(...matches);
        }
      }
      return results;
    }

    const joined = taxons.join(',');
    const url = `${BASE_URL}/taxonomy/taxon/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawTaxonomyResponse>(url, this._config!);

    if (raw.reports !== undefined && raw.reports.length > 0) {
      return raw.reports.map(mapTaxonomyReportV2);
    }

    return (raw.taxonomy_nodes ?? []).map(mapTaxonomyReportLegacy);
  }

  /** Fetch genome assembly reports by accession numbers. */
  public async genomeByAccession(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<GenomeReport>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('genomeByAccession');
    }

    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/genome/accession/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawGenomeResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapGenomeReport);
  }

  /** Fetch genome assembly reports for a given taxon. */
  public async genomeByTaxon(taxon: number | string): Promise<ReadonlyArray<GenomeReport>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('genomeByTaxon');
    }

    const url = `${BASE_URL}/genome/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawGenomeResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapGenomeReport);
  }

  /** Fetch virus genome reports by accession numbers. */
  public async virusByAccession(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<VirusReport>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('virusByAccession');
    }

    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/virus/accession/${encodeURIComponent(joined)}/dataset_report`;
    const raw = await fetchJson<RawVirusResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapVirusReport);
  }

  /** Fetch virus genome reports for a given taxon. */
  public async virusByTaxon(taxon: number | string): Promise<ReadonlyArray<VirusReport>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('virusByTaxon');
    }

    const url = `${BASE_URL}/virus/taxon/${encodeURIComponent(String(taxon))}/dataset_report`;
    const raw = await fetchJson<RawVirusResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapVirusReport);
  }

  /** Fetch BioSample reports by accession numbers. */
  public async biosample(
    accessions: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<BioSampleReport>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('biosample');
    }

    if (accessions.length === 0) {
      throw new Error('accessions must not be empty');
    }

    const joined = accessions.join(',');
    const url = `${BASE_URL}/biosample/accession/${encodeURIComponent(joined)}/biosample_report`;
    const raw = await fetchJson<RawBioSampleResponse>(url, this._config!);

    return (raw.reports ?? []).map(mapBioSampleReport);
  }

  /** Fetch external database links for genes by NCBI Gene IDs. */
  public async geneLinks(geneIds: ReadonlyArray<number>): Promise<ReadonlyArray<GeneLink>> {
    if (this._storage !== undefined) {
      throw new StorageModeError('geneLinks');
    }

    if (geneIds.length === 0) {
      throw new Error('geneIds must not be empty');
    }

    const joined = geneIds.join(',');
    const url = `${BASE_URL}/gene/id/${encodeURIComponent(joined)}/links`;
    const raw = await fetchJson<RawGeneLinkResponse>(url, this._config!);

    return (raw.gene_links ?? []).map(mapGeneLink);
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
  readonly summary?: ReadonlyArray<{ readonly description?: string }>;
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
    summary: (gene.summary ?? []).map((entry) => entry.description ?? '').join(' '),
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
  readonly virus?: { readonly tax_id?: number; readonly organism_name?: string };
  readonly isolate?: { readonly name?: string; readonly collection_date?: string };
  readonly host?: { readonly organism_name?: string };
  readonly location?: { readonly geographic_location?: string };
  readonly completeness?: string;
  readonly length?: number;
  readonly bioprojects?: ReadonlyArray<{ readonly accession?: string }>;
}

interface RawBioSampleResponse {
  readonly reports?: ReadonlyArray<RawBioSampleData>;
}

interface RawBioSampleData {
  readonly accession?: string;
  readonly description?: { readonly title?: string; readonly organism?: RawBioSampleOrganism };
  readonly owner?: { readonly name?: string };
  readonly submission_date?: string;
  readonly publication_date?: string;
  readonly attributes?: ReadonlyArray<RawBioSampleAttribute>;
}

interface RawBioSampleOrganism {
  readonly tax_id?: number;
  readonly organism_name?: string;
}

interface RawBioSampleAttribute {
  readonly name?: string;
  readonly value?: string;
}

function mapVirusReport(raw: RawVirusData): VirusReport {
  return {
    accession: raw.accession ?? '',
    taxId: raw.virus?.tax_id ?? 0,
    organismName: raw.virus?.organism_name ?? '',
    isolateName: raw.isolate?.name ?? '',
    host: raw.host?.organism_name ?? '',
    collectionDate: raw.isolate?.collection_date ?? '',
    geoLocation: raw.location?.geographic_location ?? '',
    completeness: raw.completeness ?? '',
    length: raw.length ?? 0,
    bioprojectAccession: raw.bioprojects?.[0]?.accession ?? '',
  };
}

function mapBioSampleReport(raw: RawBioSampleData): BioSampleReport {
  return {
    accession: raw.accession ?? '',
    title: raw.description?.title ?? '',
    organismName: raw.description?.organism?.organism_name ?? '',
    taxId: raw.description?.organism?.tax_id ?? 0,
    ownerName: raw.owner?.name ?? '',
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

interface RawGeneLinkResponse {
  readonly gene_links?: ReadonlyArray<RawGeneLinkData>;
}

interface RawGeneLinkData {
  readonly gene_id?: number;
  readonly gene_link_type?: string;
  readonly resource_link?: string;
  readonly resource_id?: string;
}

function mapGeneLink(raw: RawGeneLinkData): GeneLink {
  return {
    geneId: raw.gene_id ?? 0,
    type: raw.gene_link_type ?? '',
    url: raw.resource_link ?? '',
    resourceId: raw.resource_id ?? '',
  };
}
