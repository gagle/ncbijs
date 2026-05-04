import type { ESearchResult, EUtils } from '@ncbijs/eutils';
import { parsePubmedXml } from '@ncbijs/pubmed-xml';

import { convertArticle } from './convert-article';
import type { Article, PubMedSort, PublicationType } from './interfaces/pubmed.interface';

const DEFAULT_BATCH_SIZE = 500;
const NCBI_RETMAX_LIMIT = 10_000;
const MAX_FETCH_ITERATIONS = 10_000;

function extractHistoryParams(result: ESearchResult): { webEnv: string; queryKey: number } {
  if (result.webEnv === undefined || result.queryKey === undefined) {
    throw new Error('ESearch did not return History Server parameters');
  }
  return { webEnv: result.webEnv, queryKey: result.queryKey };
}

/** Fluent query builder for constructing and executing PubMed searches. */
export class PubMedQueryBuilder {
  private readonly eutils: EUtils;
  private readonly baseTerm: string;
  private readonly filters: Array<string> = [];
  private sortField: PubMedSort = 'relevance';
  private maxResults: number | undefined;

  constructor(eutils: EUtils, term: string) {
    this.eutils = eutils;
    this.baseTerm = term;
  }

  /** Filter results by author name. */
  public author(name: string): this {
    this.filters.push(`${name}[au]`);
    return this;
  }

  /** Filter results by journal ISO abbreviation. */
  public journal(isoAbbrev: string): this {
    this.filters.push(`"${isoAbbrev}"[ta]`);
    return this;
  }

  /** Filter results by MeSH descriptor term. */
  public meshTerm(descriptor: string): this {
    this.filters.push(`"${descriptor}"[mesh]`);
    return this;
  }

  /** Restrict results to a publication date range (YYYY/MM/DD). */
  public dateRange(from: string, to: string): this {
    this.filters.push(`("${from}"[dp] : "${to}"[dp])`);
    return this;
  }

  /** Filter results by publication type. */
  public publicationType(type: PublicationType): this {
    this.filters.push(`"${type}"[pt]`);
    return this;
  }

  /** Restrict results to free full-text articles only. */
  public freeFullText(): this {
    this.filters.push('free full text[sb]');
    return this;
  }

  /** Set the sort order for results. */
  public sort(field: PubMedSort): this {
    this.sortField = field;
    return this;
  }

  /** Add a proximity search constraint for terms within a given distance. */
  public proximity(terms: string, field: string, distance: number): this {
    this.filters.push(`"${terms}"[${field}:~${distance}]`);
    return this;
  }

  /** Limit the maximum number of results to retrieve. */
  public limit(n: number): this {
    this.maxResults = n;
    return this;
  }

  /** Build the final PubMed query string with all applied filters. */
  public buildQuery(): string {
    if (this.filters.length === 0) {
      return this.baseTerm;
    }
    return `${this.baseTerm} AND ${this.filters.join(' AND ')}`;
  }

  /** Execute the query and return all matching articles. */
  public async fetchAll(): Promise<ReadonlyArray<Article>> {
    const query = this.buildQuery();

    const searchResult = await this.eutils.esearch({
      db: 'pubmed',
      term: query,
      usehistory: 'y',
      retmax: 0,
      sort: this.sortField,
    });

    const totalCount =
      this.maxResults !== undefined
        ? Math.min(searchResult.count, this.maxResults)
        : searchResult.count;

    if (totalCount === 0) {
      return [];
    }

    if (totalCount > NCBI_RETMAX_LIMIT) {
      return this.fetchWithDateSegmentation(query, totalCount);
    }

    const { webEnv, queryKey } = extractHistoryParams(searchResult);
    return this.fetchFromHistory(webEnv, queryKey, totalCount);
  }

  /** Execute the query and yield articles in batches via an async iterator. */
  public async *batches(
    size: number = DEFAULT_BATCH_SIZE,
  ): AsyncIterableIterator<ReadonlyArray<Article>> {
    const query = this.buildQuery();

    const searchResult = await this.eutils.esearch({
      db: 'pubmed',
      term: query,
      usehistory: 'y',
      retmax: 0,
      sort: this.sortField,
    });

    const totalCount =
      this.maxResults !== undefined
        ? Math.min(searchResult.count, this.maxResults)
        : searchResult.count;

    if (totalCount === 0) {
      return;
    }

    if (totalCount > NCBI_RETMAX_LIMIT) {
      throw new Error(
        `Query returned ${searchResult.count} results, exceeding the ${NCBI_RETMAX_LIMIT} limit. ` +
          'Use fetchAll() which handles date segmentation, or add filters to narrow results.',
      );
    }

    const { webEnv, queryKey } = extractHistoryParams(searchResult);
    let fetched = 0;
    let iterations = 0;

    while (fetched < totalCount && iterations++ < MAX_FETCH_ITERATIONS) {
      const batchSize = Math.min(size, totalCount - fetched);
      const xml = await this.eutils.efetch({
        db: 'pubmed',
        WebEnv: webEnv,
        query_key: queryKey,
        retstart: fetched,
        retmax: batchSize,
        retmode: 'xml',
      });

      const articles = parsePubmedXml(xml).map(convertArticle);
      if (articles.length === 0) break;
      yield articles;
      fetched += articles.length;
    }
  }

  private async fetchFromHistory(
    webEnv: string,
    queryKey: number,
    totalCount: number,
  ): Promise<ReadonlyArray<Article>> {
    const articles: Array<Article> = [];
    let fetched = 0;
    let iterations = 0;
    const maxIterations = Math.ceil(totalCount / DEFAULT_BATCH_SIZE) + 1;

    while (fetched < totalCount && iterations++ < maxIterations) {
      const batchSize = Math.min(DEFAULT_BATCH_SIZE, totalCount - fetched);
      const xml = await this.eutils.efetch({
        db: 'pubmed',
        WebEnv: webEnv,
        query_key: queryKey,
        retstart: fetched,
        retmax: batchSize,
        retmode: 'xml',
      });

      const batch = parsePubmedXml(xml).map(convertArticle);
      if (batch.length === 0) break;
      articles.push(...batch);
      fetched += batch.length;
    }

    return articles;
  }

  private async fetchWithDateSegmentation(
    query: string,
    totalCount: number,
  ): Promise<ReadonlyArray<Article>> {
    const currentYear = new Date().getFullYear();
    const articles: Array<Article> = [];

    for (let year = currentYear; year >= 1900 && articles.length < totalCount; year--) {
      const yearQuery = `${query} AND ("${year}/01/01"[dp] : "${year}/12/31"[dp])`;

      const yearSearch = await this.eutils.esearch({
        db: 'pubmed',
        term: yearQuery,
        usehistory: 'y',
        retmax: 0,
        sort: this.sortField,
      });

      if (yearSearch.count === 0) continue;

      const { webEnv, queryKey } = extractHistoryParams(yearSearch);
      const yearArticles = await this.fetchFromHistory(
        webEnv,
        queryKey,
        Math.min(yearSearch.count, NCBI_RETMAX_LIMIT, totalCount - articles.length),
      );

      articles.push(...yearArticles);
    }

    return articles;
  }
}
