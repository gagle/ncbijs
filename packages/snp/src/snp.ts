import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './snp-client';
import type { SnpClientConfig } from './snp-client';
import type {
  RefSnpReport,
  SnpAllele,
  SnpAlleleAnnotation,
  SnpClinicalSignificance,
  SnpConfig,
  SnpFrequency,
  SnpPlacement,
} from './interfaces/snp.interface';

const BASE_URL = 'https://api.ncbi.nlm.nih.gov/variation/v0';
const REQUESTS_PER_SECOND = 5;

export class Snp {
  private readonly _config: SnpClientConfig;

  constructor(config?: SnpConfig) {
    this._config = {
      ...(config?.apiKey !== undefined && { apiKey: config.apiKey }),
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  public async refsnp(rsId: number): Promise<RefSnpReport> {
    const url = `${BASE_URL}/refsnp/${encodeURIComponent(String(rsId))}`;
    const raw = await fetchJson<RawRefSnpResponse>(url, this._config);

    return mapRefSnpReport(raw);
  }

  public async refsnpBatch(rsIds: ReadonlyArray<number>): Promise<ReadonlyArray<RefSnpReport>> {
    const reports: Array<RefSnpReport> = [];
    for (const rsId of rsIds) {
      const report = await this.refsnp(rsId);
      reports.push(report);
    }
    return reports;
  }
}

interface RawRefSnpResponse {
  readonly refsnp_id?: string;
  readonly create_date?: string;
  readonly primary_snapshot_data?: RawPrimarySnapshotData;
}

interface RawPrimarySnapshotData {
  readonly placements_with_allele?: ReadonlyArray<RawPlacement>;
  readonly allele_annotations?: ReadonlyArray<RawAlleleAnnotation>;
}

interface RawPlacement {
  readonly seq_id?: string;
  readonly placement_annot?: RawPlacementAnnot;
  readonly alleles?: ReadonlyArray<RawAlleleWrapper>;
}

interface RawPlacementAnnot {
  readonly seq_type?: string;
  readonly seq_id_traits_by_assembly?: ReadonlyArray<RawAssemblyTrait>;
}

interface RawAssemblyTrait {
  readonly assembly_name?: string;
}

interface RawAlleleWrapper {
  readonly allele?: RawAlleleData;
}

interface RawAlleleData {
  readonly spdi?: RawSpdi;
}

interface RawSpdi {
  readonly seq_id?: string;
  readonly position?: number;
  readonly deleted_sequence?: string;
  readonly inserted_sequence?: string;
}

interface RawAlleleAnnotation {
  readonly frequency?: ReadonlyArray<RawFrequency>;
  readonly clinical?: ReadonlyArray<RawClinical>;
}

interface RawFrequency {
  readonly study_name?: string;
  readonly allele_count?: number;
  readonly total_count?: number;
  readonly observation?: RawObservation;
}

interface RawObservation {
  readonly deleted_sequence?: string;
  readonly inserted_sequence?: string;
}

interface RawClinical {
  readonly clinical_significances?: ReadonlyArray<string>;
  readonly disease_names?: ReadonlyArray<string>;
  readonly review_status?: string;
}

function mapRefSnpReport(raw: RawRefSnpResponse): RefSnpReport {
  const snapshot = raw.primary_snapshot_data;
  const rawPlacements = snapshot?.placements_with_allele ?? [];
  const chromosomePlacements = rawPlacements.filter(
    (placement) => placement.placement_annot?.seq_type === 'refseq_chromosome',
  );

  return {
    refsnpId: raw.refsnp_id ?? '',
    createDate: raw.create_date ?? '',
    placements: chromosomePlacements.map(mapPlacement),
    alleleAnnotations: (snapshot?.allele_annotations ?? []).map(mapAlleleAnnotation),
  };
}

function mapPlacement(raw: RawPlacement): SnpPlacement {
  const assemblyTraits = raw.placement_annot?.seq_id_traits_by_assembly ?? [];
  const assemblyName = assemblyTraits[0]?.assembly_name ?? '';

  return {
    seqId: raw.seq_id ?? '',
    assemblyName,
    alleles: (raw.alleles ?? []).map(mapAllele),
  };
}

function mapAllele(wrapper: RawAlleleWrapper): SnpAllele {
  const spdi = wrapper.allele?.spdi;

  return {
    seqId: spdi?.seq_id ?? '',
    position: spdi?.position ?? 0,
    deletedSequence: spdi?.deleted_sequence ?? '',
    insertedSequence: spdi?.inserted_sequence ?? '',
  };
}

function mapAlleleAnnotation(raw: RawAlleleAnnotation): SnpAlleleAnnotation {
  return {
    frequency: (raw.frequency ?? []).map(mapFrequency),
    clinical: (raw.clinical ?? []).map(mapClinical),
  };
}

function mapFrequency(raw: RawFrequency): SnpFrequency {
  const alleleCount = raw.allele_count ?? 0;
  const totalCount = raw.total_count ?? 0;
  const frequency = totalCount > 0 ? alleleCount / totalCount : 0;

  return {
    studyName: raw.study_name ?? '',
    alleleCount,
    totalCount,
    frequency,
    deletedSequence: raw.observation?.deleted_sequence ?? '',
    insertedSequence: raw.observation?.inserted_sequence ?? '',
  };
}

function mapClinical(raw: RawClinical): SnpClinicalSignificance {
  return {
    significances: raw.clinical_significances ?? [],
    diseaseNames: raw.disease_names ?? [],
    reviewStatus: raw.review_status ?? '',
  };
}
