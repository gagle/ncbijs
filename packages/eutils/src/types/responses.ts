/** A single term translation returned by ESearch. */
export interface Translation {
  readonly from: string;
  readonly to: string;
}

/** Parsed response from ESearch. */
export interface ESearchResult {
  /** Total number of UIDs matching the query. */
  readonly count: number;
  /** Number of UIDs returned in this response. */
  readonly retMax: number;
  /** Index of the first UID in this response. */
  readonly retStart: number;
  /** List of UIDs matching the query. */
  readonly idList: ReadonlyArray<string>;
  /** Term translations applied by Entrez. */
  readonly translationSet: ReadonlyArray<Translation>;
  /** The query as interpreted after translation. */
  readonly queryTranslation: string;
  /** Web environment string (present when `usehistory=y`). */
  readonly webEnv?: string | undefined;
  /** Query key for the stored result set. */
  readonly queryKey?: number | undefined;
  /** Fields not found in the database (present when query references invalid fields). */
  readonly errorList?: ReadonlyArray<string> | undefined;
}

/** A single document summary record. Database-specific fields live in the index signature. */
export interface DocSum {
  /** Unique identifier for this record. */
  readonly uid: string;
  /** Database-specific fields (vary per Entrez database). */
  readonly [key: string]: unknown;
}

/** Parsed response from ESummary. */
export interface ESummaryResult {
  /** UID echoed from the request (first UID or summary UID). */
  readonly uid: string;
  /** Array of document summaries. */
  readonly docSums: ReadonlyArray<DocSum>;
}

/** Parsed response from EPost. */
export interface EPostResult {
  /** Web environment string for the posted UID set. */
  readonly webEnv: string;
  /** Query key referencing the posted UID set. */
  readonly queryKey: number;
}

/** A single link within a LinkSetDb. */
export interface Link {
  /** Target UID. */
  readonly id: string;
  /** Relevancy score (present when `cmd=neighbor_score`). */
  readonly score?: number | undefined;
}

/** A set of links to a specific target database. */
export interface LinkSetDb {
  /** Target database name. */
  readonly dbTo: string;
  /** Link name (e.g. `'pubmed_pubmed_citedin'`). */
  readonly linkName: string;
  /** Links to target UIDs. */
  readonly links: ReadonlyArray<Link>;
}

/** A LinkOut URL returned by llinks/llinkslib/prlinks commands. */
export interface LinkOutUrl {
  /** URL of the external resource. */
  readonly url: string;
  /** Icon URL for the provider. */
  readonly iconUrl?: string | undefined;
  /** Subject type description. */
  readonly subjectType?: string | undefined;
  /** Provider name. */
  readonly provider: string;
  /** Provider abbreviation. */
  readonly providerAbbr?: string | undefined;
}

/** Check result for acheck/ncheck/lcheck commands. */
export interface IdCheckResult {
  /** Source UID. */
  readonly id: string;
  /** Whether the link type exists for this UID. */
  readonly hasLinkOut?: boolean | undefined;
  /** Whether neighbor links exist for this UID. */
  readonly hasNeighbor?: boolean | undefined;
}

/** A single link set in the ELink response. */
export interface LinkSet {
  /** Source database. */
  readonly dbFrom: string;
  /** Source UID list. */
  readonly idList: ReadonlyArray<string>;
  /** Link sets to target databases (present for neighbor/neighbor_score). */
  readonly linkSetDbs?: ReadonlyArray<LinkSetDb> | undefined;
  /** Web environment (present when `cmd=neighbor_history`). */
  readonly webEnv?: string | undefined;
  /** Query key (present when `cmd=neighbor_history`). */
  readonly queryKey?: number | undefined;
  /** LinkOut URLs (present for llinks/llinkslib/prlinks). */
  readonly linkOutUrls?: ReadonlyArray<LinkOutUrl> | undefined;
  /** Check results (present for acheck/ncheck/lcheck). */
  readonly idCheckResults?: ReadonlyArray<IdCheckResult> | undefined;
}

/** Parsed response from ELink. */
export interface ELinkResult {
  /** Array of link sets. */
  readonly linkSets: ReadonlyArray<LinkSet>;
}

/** Metadata about a search field in an Entrez database. */
export interface FieldInfo {
  /** Internal field name. */
  readonly name: string;
  /** Human-readable field name. */
  readonly fullName: string;
  /** Description of the field. */
  readonly description: string;
  /** Number of terms indexed for this field. */
  readonly termCount: number;
  /** Whether this field contains date values. */
  readonly isDate: boolean;
  /** Whether this field contains numeric values. */
  readonly isNumerical: boolean;
  /** Whether search terms are truncatable in this field. */
  readonly isTruncatable?: boolean | undefined;
  /** Whether range queries are supported. */
  readonly isRangeable?: boolean | undefined;
  /** Whether this field is hidden from the user interface. */
  readonly isHidden?: boolean | undefined;
}

/** Metadata about a link from one Entrez database to another. */
export interface LinkInfo {
  /** Internal link name. */
  readonly name: string;
  /** Menu label for the link. */
  readonly menu: string;
  /** Description of the link. */
  readonly description: string;
  /** Target database. */
  readonly dbTo: string;
}

/** Detailed metadata about a single Entrez database. */
export interface DbInfo {
  /** Database name (short code, e.g. `'pubmed'`). */
  readonly dbName: string;
  /** Human-readable description. */
  readonly description: string;
  /** Total record count. */
  readonly count: number;
  /** Date of last update (YYYY/MM/DD HH:MM). */
  readonly lastUpdate: string;
  /** Searchable fields. */
  readonly fieldList: ReadonlyArray<FieldInfo>;
  /** Available links to other databases. */
  readonly linkList: ReadonlyArray<LinkInfo>;
}

/** Parsed response from EInfo. */
export interface EInfoResult {
  /** List of all Entrez database names (present when no `db` param). */
  readonly dbList?: ReadonlyArray<string> | undefined;
  /** Database metadata (present when a `db` param is specified). */
  readonly dbInfo?: DbInfo | undefined;
}

/** Parsed response from ESpell. */
export interface ESpellResult {
  /** Original query as submitted. */
  readonly query: string;
  /** Suggested corrected query. */
  readonly correctedQuery: string;
  /** Query with spelling corrections applied inline. */
  readonly spelledQuery: string;
}

/** A single database hit count from EGQuery. */
export interface EGQueryResultItem {
  /** Entrez database name. */
  readonly dbName: string;
  /** Number of records matching the query in this database. */
  readonly count: number;
}

/** Parsed response from EGQuery. */
export interface EGQueryResult {
  /** The search term. */
  readonly term: string;
  /** Per-database hit counts. */
  readonly eGQueryResultItems: ReadonlyArray<EGQueryResultItem>;
}

/** A single citation match result. */
export interface CitationMatch {
  /** Journal name from the query. */
  readonly journal: string;
  /** Publication year from the query. */
  readonly year: string;
  /** Volume from the query. */
  readonly volume: string;
  /** First page from the query. */
  readonly firstPage: string;
  /** Author name from the query. */
  readonly authorName: string;
  /** User-supplied key for this citation. */
  readonly key: string;
  /** Matched PubMed ID (absent if no match found). */
  readonly pmid?: string | undefined;
}

/** Parsed response from ECitMatch. */
export interface ECitMatchResult {
  /** Array of citation match results. */
  readonly citations: ReadonlyArray<CitationMatch>;
}
