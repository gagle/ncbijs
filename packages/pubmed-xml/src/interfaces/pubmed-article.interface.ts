export interface AbstractSection {
  readonly label: string;
  readonly nlmCategory?: string;
  readonly text: string;
}

export interface AbstractContent {
  readonly structured: boolean;
  readonly text: string;
  readonly sections?: ReadonlyArray<Readonly<AbstractSection>>;
}

export interface Author {
  readonly lastName?: string;
  readonly foreName?: string;
  readonly initials?: string;
  readonly collectiveName?: string;
  readonly affiliations: ReadonlyArray<string>;
}

export interface JournalInfo {
  readonly title: string;
  readonly isoAbbrev: string;
  readonly issn?: string;
  readonly volume?: string;
  readonly issue?: string;
}

export interface PartialDate {
  readonly year: number;
  readonly month?: number;
  readonly day?: number;
  readonly season?: string;
  readonly raw?: string;
}

export interface MeshQualifier {
  readonly name: string;
  readonly ui: string;
  readonly majorTopic: boolean;
}

export interface MeshHeading {
  readonly descriptor: string;
  readonly descriptorUI: string;
  readonly majorTopic: boolean;
  readonly qualifiers: ReadonlyArray<Readonly<MeshQualifier>>;
}

export interface ArticleIds {
  readonly pmid: string;
  readonly doi?: string;
  readonly pmc?: string;
  readonly pii?: string;
  readonly mid?: string;
}

export interface Grant {
  readonly grantId: string;
  readonly acronym?: string;
  readonly agency: string;
  readonly country: string;
}

export interface Keyword {
  readonly text: string;
  readonly majorTopic: boolean;
  readonly owner: 'NLM' | 'NOTNLM';
}

export interface CommentCorrection {
  readonly refType: string;
  readonly refSource: string;
  readonly pmid?: string;
}

export interface DataBank {
  readonly name: string;
  readonly accessionNumbers: ReadonlyArray<string>;
}

export interface PubmedArticle {
  readonly pmid: string;
  readonly title: string;
  readonly vernacularTitle?: string;
  readonly abstract: Readonly<AbstractContent>;
  readonly authors: ReadonlyArray<Readonly<Author>>;
  readonly journal: Readonly<JournalInfo>;
  readonly publicationDate: Readonly<PartialDate>;
  readonly mesh: ReadonlyArray<Readonly<MeshHeading>>;
  readonly articleIds: Readonly<ArticleIds>;
  readonly publicationTypes: ReadonlyArray<string>;
  readonly grants: ReadonlyArray<Readonly<Grant>>;
  readonly keywords: ReadonlyArray<Readonly<Keyword>>;
  readonly commentsCorrections: ReadonlyArray<Readonly<CommentCorrection>>;
  readonly dataBanks: ReadonlyArray<Readonly<DataBank>>;
  readonly language: string;
  readonly dateRevised?: Readonly<PartialDate>;
  readonly dateCompleted?: Readonly<PartialDate>;
}
