import { EUtils } from '@ncbijs/eutils';
import type { EUtilsConfig } from '@ncbijs/eutils';
import { parsePubmedXml } from '@ncbijs/pubmed-xml';

import { convertArticle } from './convert-article';
import type { Article, RelatedArticle } from './interfaces/pubmed.interface';
import { PubMedQueryBuilder } from './query-builder';

const EFETCH_ID_BATCH_SIZE = 200;

export class PubMed {
  private readonly eutils: EUtils;

  constructor(config: EUtilsConfig) {
    this.eutils = new EUtils(config);
  }

  public search(term: string): PubMedQueryBuilder {
    return new PubMedQueryBuilder(this.eutils, term);
  }

  public async related(pmid: string): Promise<ReadonlyArray<RelatedArticle>> {
    const linkResult = await this.eutils.elink({
      db: 'pubmed',
      dbfrom: 'pubmed',
      id: pmid,
      cmd: 'neighbor_score',
    });

    const linkSet = linkResult.linkSets[0];
    if (!linkSet?.linkSetDbs?.length) {
      return [];
    }

    const links = linkSet.linkSetDbs[0]?.links;
    if (!links?.length) {
      return [];
    }

    const scoresByPmid = new Map<string, number>();
    for (const link of links) {
      scoresByPmid.set(link.id, link.score ?? 0);
    }

    const relatedIds = links.map((link) => link.id);
    const articles = await this.fetchArticlesByIds(relatedIds);

    const relatedArticles = articles.map((article) => ({
      ...article,
      relevancyScore: scoresByPmid.get(article.pmid) ?? 0,
    }));

    return relatedArticles.sort((a, b) => b.relevancyScore - a.relevancyScore);
  }

  public async citedBy(pmid: string): Promise<ReadonlyArray<Article>> {
    return this.fetchLinkedArticles(pmid, 'pubmed_pubmed_citedin');
  }

  public async references(pmid: string): Promise<ReadonlyArray<Article>> {
    return this.fetchLinkedArticles(pmid, 'pubmed_pubmed_refs');
  }

  private async fetchLinkedArticles(
    pmid: string,
    linkname: string,
  ): Promise<ReadonlyArray<Article>> {
    const linkResult = await this.eutils.elink({
      db: 'pubmed',
      dbfrom: 'pubmed',
      id: pmid,
      linkname,
    });

    const linkSet = linkResult.linkSets[0];
    if (!linkSet?.linkSetDbs?.length) {
      return [];
    }

    const links = linkSet.linkSetDbs[0]?.links;
    if (!links?.length) {
      return [];
    }

    const linkedIds = links.map((link) => link.id);
    return this.fetchArticlesByIds(linkedIds);
  }

  private async fetchArticlesByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<Article>> {
    if (ids.length === 0) {
      return [];
    }

    const articles: Array<Article> = [];

    for (let offset = 0; offset < ids.length; offset += EFETCH_ID_BATCH_SIZE) {
      const batchIds = ids.slice(offset, offset + EFETCH_ID_BATCH_SIZE);
      const xml = await this.eutils.efetch({
        db: 'pubmed',
        id: batchIds.join(','),
        retmode: 'xml',
      });
      articles.push(...parsePubmedXml(xml).map(convertArticle));
    }

    return articles;
  }
}
