export interface BooksConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface BooksSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

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
