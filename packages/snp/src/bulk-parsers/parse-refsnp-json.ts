import type {
  RefSnpReport,
  SnpAllele,
  SnpAlleleAnnotation,
  SnpClinicalSignificance,
  SnpFrequency,
  SnpPlacement,
} from '../interfaces/snp.interface';

/** Parse a single RefSNP JSON record (as from the NCBI FTP) into a {@link RefSnpReport}. */
export function parseRefSnpJson(json: string): RefSnpReport {
  const raw: RawRefSnpResponse = JSON.parse(json);

  return mapRefSnpReport(raw);
}

/** Parse an NDJSON file of RefSNP records into an array of {@link RefSnpReport}. */
export function parseRefSnpNdjson(ndjson: string): ReadonlyArray<RefSnpReport> {
  const lines = ndjson.split('\n');
  const reports: Array<RefSnpReport> = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      continue;
    }

    reports.push(parseRefSnpJson(trimmedLine));
  }

  return reports;
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
  const assemblyName = assemblyTraits.length > 0 ? (assemblyTraits[0]?.assembly_name ?? '') : '';

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
