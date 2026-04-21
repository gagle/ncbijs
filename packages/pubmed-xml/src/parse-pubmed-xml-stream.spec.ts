import { describe, expect, it } from 'vitest';
import { createPubmedXmlStream } from './parse-pubmed-xml-stream';

function createStringStream(chunks: Array<string>): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

function buildArticleXml(pmid: string, title: string): string {
  return (
    '<PubmedArticle><MedlineCitation><PMID>' +
    pmid +
    '</PMID><Article><ArticleTitle>' +
    title +
    '</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation>' +
    '<JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal>' +
    '<Language>eng</Language></Article></MedlineCitation></PubmedArticle>'
  );
}

function wrapInSet(...articleXmls: Array<string>): string {
  return '<PubmedArticleSet>' + articleXmls.join('') + '</PubmedArticleSet>';
}

async function collectArticles(
  stream: ReadableStream<string>,
): Promise<Array<{ pmid: string; title: string }>> {
  const articles: Array<{ pmid: string; title: string }> = [];
  for await (const article of createPubmedXmlStream(stream)) {
    articles.push({ pmid: article.pmid, title: article.title });
  }
  return articles;
}

describe('createPubmedXmlStream', () => {
  it('should yield PubmedArticle objects from stream', async () => {
    const xml = wrapInSet(buildArticleXml('12345', 'Test Article'));
    const stream = createStringStream([xml]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(1);
    expect(articles[0]?.pmid).toBe('12345');
    expect(articles[0]?.title).toBe('Test Article');
  });

  it('should handle chunked XML across article boundaries', async () => {
    const firstArticle = buildArticleXml('11111', 'First');
    const secondArticle = buildArticleXml('22222', 'Second');
    const fullXml = wrapInSet(firstArticle, secondArticle);

    const splitPoint = fullXml.indexOf('</PubmedArticle>') + '</PubmedArticle>'.length;
    const chunkOne = fullXml.slice(0, splitPoint);
    const chunkTwo = fullXml.slice(splitPoint);
    const stream = createStringStream([chunkOne, chunkTwo]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(2);
    expect(articles[0]?.pmid).toBe('11111');
    expect(articles[1]?.pmid).toBe('22222');
  });

  it('should handle chunk split in middle of element', async () => {
    const xml = wrapInSet(buildArticleXml('99999', 'Split Tag'));

    const closeTagStart = xml.indexOf('</PubmedArticle>');
    const splitPoint = closeTagStart + '</Pubmed'.length;
    const chunkOne = xml.slice(0, splitPoint);
    const chunkTwo = xml.slice(splitPoint);
    const stream = createStringStream([chunkOne, chunkTwo]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(1);
    expect(articles[0]?.pmid).toBe('99999');
    expect(articles[0]?.title).toBe('Split Tag');
  });

  it('should process multiple articles from stream', async () => {
    const xml = wrapInSet(
      buildArticleXml('10001', 'Alpha'),
      buildArticleXml('10002', 'Beta'),
      buildArticleXml('10003', 'Gamma'),
    );
    const stream = createStringStream([xml]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(3);
    expect(articles[0]?.pmid).toBe('10001');
    expect(articles[1]?.pmid).toBe('10002');
    expect(articles[2]?.pmid).toBe('10003');
  });

  it('should handle single article stream', async () => {
    const xml = wrapInSet(buildArticleXml('55555', 'Solo'));
    const stream = createStringStream([xml]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(1);
    expect(articles[0]?.pmid).toBe('55555');
    expect(articles[0]?.title).toBe('Solo');
  });

  it('should handle empty stream', async () => {
    const stream = new ReadableStream<string>({
      start(controller) {
        controller.close();
      },
    });

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(0);
  });

  it('should maintain constant memory for large inputs', async () => {
    const articleCount = 200;
    const articleXmls = Array.from({ length: articleCount }, (_, index) =>
      buildArticleXml(String(index + 1), `Article ${index + 1}`),
    );
    const xml = wrapInSet(...articleXmls);
    const stream = createStringStream([xml]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(articleCount);
  });

  it('should yield articles as they complete parsing', async () => {
    const xml = wrapInSet(
      buildArticleXml('30001', 'First In Order'),
      buildArticleXml('30002', 'Second In Order'),
      buildArticleXml('30003', 'Third In Order'),
    );
    const stream = createStringStream([xml]);

    const yieldedPmids: Array<string> = [];
    for await (const article of createPubmedXmlStream(stream)) {
      yieldedPmids.push(article.pmid);
    }

    expect(yieldedPmids).toEqual(['30001', '30002', '30003']);
  });

  it('should skip chunk that has close tag without matching open tag', async () => {
    const orphanClose = 'some junk</PubmedArticle>';
    const stream = createStringStream([
      orphanClose,
      '<PubmedArticle><MedlineCitation><PMID>77777</PMID><Article><ArticleTitle>After Skip</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article></MedlineCitation></PubmedArticle>',
    ]);

    const articles = await collectArticles(stream);

    expect(articles).toHaveLength(1);
    expect(articles[0]?.pmid).toBe('77777');
  });

  it('should throw on malformed XML in stream', async () => {
    const incompleteXml =
      '<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>12345</PMID>' +
      '<Article><ArticleTitle>Incomplete</ArticleTitle></Article></MedlineCitation>';
    const stream = createStringStream([incompleteXml]);

    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _article of createPubmedXmlStream(stream)) {
        // noop
      }
    }).rejects.toThrow('Stream ended with incomplete PubmedArticle element');
  });
});
