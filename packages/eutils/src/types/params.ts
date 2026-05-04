/** Sort orders accepted by ESearch (PubMed). */
export type ESearchSort =
  | 'relevance'
  | 'pub_date'
  | 'Author'
  | 'JournalName'
  | 'first_author'
  | 'last_author';

/** ELink `cmd` parameter variants. */
export type ELinkCmd =
  | 'neighbor'
  | 'neighbor_score'
  | 'neighbor_history'
  | 'acheck'
  | 'ncheck'
  | 'lcheck'
  | 'llinks'
  | 'llinkslib'
  | 'prlinks';

/** Response format (most endpoints). */
export type RetMode = 'xml' | 'json';

/** Date constraint type used by ESearch / ELink. */
export type DateType = 'mdat' | 'pdat' | 'edat';

/** Shared configuration for the EUtils client. */
export interface EUtilsConfig {
  /** NCBI API key. Raises rate limit from 3 req/s to 10 req/s. */
  readonly apiKey?: string | undefined;
  /** Application name (required by NCBI usage policy). */
  readonly tool: string;
  /** Developer contact email (required by NCBI usage policy). */
  readonly email: string;
  /** Retry count with exponential backoff. Defaults to 3. */
  readonly maxRetries?: number | undefined;
}

/** Parameters for ESearch (`esearch.fcgi`). */
export interface ESearchParams {
  /** Entrez database to search. */
  readonly db: string;
  /** Entrez text query. */
  readonly term: string;
  /** Store results on the History Server (`'y'`). */
  readonly usehistory?: 'y' | undefined;
  /** Sequential index of the first UID to retrieve (default 0). */
  readonly retstart?: number | undefined;
  /** Number of UIDs to retrieve (default 20, max 10 000). */
  readonly retmax?: number | undefined;
  /** Response format. */
  readonly retmode?: RetMode | undefined;
  /** Retrieval type (`'uilist'` for UID list or `'count'` for count only). */
  readonly rettype?: 'count' | 'uilist' | undefined;
  /** Sort order (PubMed-specific values). */
  readonly sort?: ESearchSort | undefined;
  /** Search field limiter (e.g. `'title'`, `'author'`). */
  readonly field?: string | undefined;
  /** Type of date to constrain. */
  readonly datetype?: DateType | undefined;
  /** Relative date in days from today. */
  readonly reldate?: number | undefined;
  /** Minimum date (YYYY/MM/DD). */
  readonly mindate?: string | undefined;
  /** Maximum date (YYYY/MM/DD). */
  readonly maxdate?: string | undefined;
  /** Return accession.version identifiers instead of GI numbers. */
  readonly idtype?: 'acc' | undefined;
  /** Web environment string from a previous History Server call. */
  readonly WebEnv?: string | undefined;
  /** Query key referencing a previous result set. */
  readonly query_key?: number | undefined;
}

/** Parameters for EFetch (`efetch.fcgi`). */
export interface EFetchParams {
  /** Entrez database. */
  readonly db: string;
  /** Comma-separated list of UIDs. */
  readonly id?: string | undefined;
  /** Web environment string from the History Server. */
  readonly WebEnv?: string | undefined;
  /** Query key referencing a previous result set. */
  readonly query_key?: number | undefined;
  /** Retrieval type (database-dependent, e.g. `'abstract'`, `'medline'`). */
  readonly rettype?: string | undefined;
  /** Retrieval mode (e.g. `'xml'`, `'text'`). */
  readonly retmode?: string | undefined;
  /** Sequential index of the first record to retrieve. */
  readonly retstart?: number | undefined;
  /** Number of records to retrieve. */
  readonly retmax?: number | undefined;
  /** Return accession.version identifiers instead of GI numbers. */
  readonly idtype?: 'acc' | undefined;
  /** Strand of DNA to retrieve (`1` = plus, `2` = minus). Sequence databases only. */
  readonly strand?: 1 | 2 | undefined;
  /** First sequence position to retrieve (1-based). Sequence databases only. */
  readonly seq_start?: number | undefined;
  /** Last sequence position to retrieve (1-based). Sequence databases only. */
  readonly seq_stop?: number | undefined;
  /** Data complexity level (`0`=entire blob, `1`=bioseq, `2`=minimal bioseq-set, `3`=minimal nuc-prot, `4`=minimal pub-set). Sequence databases only. */
  readonly complexity?: 0 | 1 | 2 | 3 | 4 | undefined;
}

/** Parameters for ESummary (`esummary.fcgi`). */
export interface ESummaryParams {
  /** Entrez database. */
  readonly db: string;
  /** Comma-separated list of UIDs. */
  readonly id?: string | undefined;
  /** Web environment string from the History Server. */
  readonly WebEnv?: string | undefined;
  /** Query key referencing a previous result set. */
  readonly query_key?: number | undefined;
  /** Sequential index of the first DocSum to retrieve. */
  readonly retstart?: number | undefined;
  /** Number of DocSums to retrieve. */
  readonly retmax?: number | undefined;
  /** Response format. */
  readonly retmode?: RetMode | undefined;
  /** ESummary version (`'2.0'` for richer DocSums). */
  readonly version?: '2.0' | undefined;
}

/** Parameters for EPost (`epost.fcgi`). */
export interface EPostParams {
  /** Entrez database. */
  readonly db: string;
  /** Comma-separated list of UIDs (max 10 000 for PubMed/PMC). */
  readonly id: string;
  /** Existing Web environment to append results to. */
  readonly WebEnv?: string | undefined;
}

/** Parameters for ELink (`elink.fcgi`). */
export interface ELinkParams {
  /** Target Entrez database. */
  readonly db: string;
  /** Source Entrez database. */
  readonly dbfrom: string;
  /** Comma-separated list of UIDs from the source database. */
  readonly id?: string | undefined;
  /** Web environment string from the History Server. */
  readonly WebEnv?: string | undefined;
  /** Query key referencing a previous result set. */
  readonly query_key?: number | undefined;
  /** Link command variant. */
  readonly cmd?: ELinkCmd | undefined;
  /** Specific link name to follow (e.g. `'pubmed_pubmed_citedin'`). */
  readonly linkname?: string | undefined;
  /** Response format. */
  readonly retmode?: RetMode | undefined;
  /** Return accession.version identifiers instead of GI numbers. */
  readonly idtype?: 'acc' | undefined;
  /** Entrez query used to limit linked UIDs. */
  readonly term?: string | undefined;
  /** Library holding filter (for llinks/llinkslib). */
  readonly holding?: string | undefined;
  /** Type of date to constrain. */
  readonly datetype?: DateType | undefined;
  /** Relative date in days from today. */
  readonly reldate?: number | undefined;
  /** Minimum date (YYYY/MM/DD). */
  readonly mindate?: string | undefined;
  /** Maximum date (YYYY/MM/DD). */
  readonly maxdate?: string | undefined;
}

/** Parameters for EInfo (`einfo.fcgi`). */
export interface EInfoParams {
  /** Entrez database. Omit to list all available databases. */
  readonly db?: string | undefined;
  /** EInfo version (`'2.0'` for extended field metadata). */
  readonly version?: '2.0' | undefined;
  /** Response format. */
  readonly retmode?: RetMode | undefined;
}

/** Parameters for ESpell (`espell.fcgi`). */
export interface ESpellParams {
  /** Entrez database. */
  readonly db?: string | undefined;
  /** Search term to spell-check. */
  readonly term: string;
}

/** Parameters for EGQuery (`egquery.fcgi`). */
export interface EGQueryParams {
  /** Search term to query across all Entrez databases. */
  readonly term: string;
}

/** Parameters for searchAndFetch (History Server pipeline). */
export interface SearchAndFetchParams {
  readonly db: string;
  readonly term: string;
  readonly rettype?: string | undefined;
  readonly retmode?: string | undefined;
  readonly batchSize?: number | undefined;
  readonly datetype?: DateType | undefined;
  readonly reldate?: number | undefined;
  readonly mindate?: string | undefined;
  readonly maxdate?: string | undefined;
  readonly sort?: ESearchSort | undefined;
}

/** Parameters for searchAndSummarize (History Server pipeline). */
export interface SearchAndSummarizeParams {
  readonly db: string;
  readonly term: string;
  readonly retmode?: RetMode | undefined;
  readonly version?: '2.0' | undefined;
  readonly batchSize?: number | undefined;
  readonly datetype?: DateType | undefined;
  readonly reldate?: number | undefined;
  readonly mindate?: string | undefined;
  readonly maxdate?: string | undefined;
  readonly sort?: ESearchSort | undefined;
}

/** Parameters for ECitMatch (`ecitmatch.cgi`). */
export interface ECitMatchParams {
  /** Entrez database (default `'pubmed'`). */
  readonly db?: string | undefined;
  /**
   * Pipe-delimited citation strings separated by `\r`.
   * Format per citation: `journal|year|volume|first_page|author_name|your_key|`
   */
  readonly bdata: string;
}
