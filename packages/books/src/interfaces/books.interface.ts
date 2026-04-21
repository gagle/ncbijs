/** Configuration options for the Books client. */
export interface BooksConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** Books search result containing matched record IDs and total count. */
export interface BooksSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A record from the NCBI Bookshelf representing a book or chapter. */
export interface BooksRecord {
  readonly uid: string;
  readonly title: string;
  readonly publicationDate: string;
  readonly entryId: string;
  readonly accessionId: string;
  readonly parents: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly text: string;
  readonly bookId: number;
  readonly bookAccessionId: string;
  readonly chapterId: number;
  readonly chapterAccessionId: string;
  readonly bookName: string;
  readonly navigation: string;
}
