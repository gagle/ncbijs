import type { PubmedArticle } from './interfaces/pubmed-article.interface';
import { parsePubmedXml } from './parse-pubmed-xml';

const ARTICLE_CLOSE_TAG = '</PubmedArticle>';
const ARTICLE_CLOSE_TAG_LENGTH = ARTICLE_CLOSE_TAG.length;

/** Stream-parse PubMed XML, yielding articles as they become complete in the input stream. */
export async function* createPubmedXmlStream(
  input: AsyncIterable<string>,
): AsyncIterableIterator<PubmedArticle> {
  let articleBuffer = '';

  for await (const value of input) {
    articleBuffer += value;

    let closeTagIndex: number;
    while ((closeTagIndex = articleBuffer.indexOf(ARTICLE_CLOSE_TAG)) !== -1) {
      const completeEnd = closeTagIndex + ARTICLE_CLOSE_TAG_LENGTH;
      const completedChunk = articleBuffer.slice(0, completeEnd);
      articleBuffer = articleBuffer.slice(completeEnd);

      const openTagIndex = completedChunk.lastIndexOf('<PubmedArticle');
      if (openTagIndex === -1) {
        continue;
      }

      const singleArticleXml = completedChunk.slice(openTagIndex);
      const wrappedXml = `<PubmedArticleSet>${singleArticleXml}</PubmedArticleSet>`;
      const parsedArticles = parsePubmedXml(wrappedXml);

      for (const article of parsedArticles) {
        yield article;
      }
    }
  }

  if (articleBuffer.trim() && articleBuffer.includes('<PubmedArticle')) {
    throw new Error('Stream ended with incomplete PubmedArticle element');
  }
}
