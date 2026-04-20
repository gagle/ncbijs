import type { PubmedArticle } from '@ncbijs/pubmed-xml';

import type { Article } from './interfaces/pubmed.interface';

export function convertArticle(source: PubmedArticle): Article {
  return {
    pmid: source.pmid,
    title: source.title,
    abstract: {
      structured: source.abstract.structured,
      text: source.abstract.text,
      sections: source.abstract.sections?.map((section) => ({
        label: section.label,
        text: section.text,
      })),
    },
    authors: source.authors.map((author) => ({
      lastName: author.lastName,
      foreName: author.foreName,
      collectiveName: author.collectiveName,
      affiliations: author.affiliations,
    })),
    journal: {
      title: source.journal.title,
      isoAbbrev: source.journal.isoAbbrev,
      issn: source.journal.issn,
      volume: source.journal.volume,
      issue: source.journal.issue,
    },
    publicationDate: {
      year: source.publicationDate.year,
      month: source.publicationDate.month,
      day: source.publicationDate.day,
    },
    mesh: source.mesh.map((heading) => ({
      descriptor: heading.descriptor,
      qualifiers: heading.qualifiers.map((qualifier) => qualifier.name),
      majorTopic: heading.majorTopic,
    })),
    articleIds: {
      pmid: source.articleIds.pmid,
      doi: source.articleIds.doi,
      pmc: source.articleIds.pmc,
      pii: source.articleIds.pii,
    },
    publicationTypes: source.publicationTypes,
    grants: source.grants.map((grant) => ({
      grantId: grant.grantId,
      agency: grant.agency,
      country: grant.country,
    })),
    keywords: source.keywords.map((keyword) => keyword.text),
  };
}
