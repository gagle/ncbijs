import type { PubmedArticle } from './interfaces/pubmed-article.interface';
import { parsePubmedXml } from './parse-pubmed-xml';

const ARTICLE_CLOSE_TAG = '</PubmedArticle>';
const ARTICLE_CLOSE_TAG_LENGTH = ARTICLE_CLOSE_TAG.length;

export async function* createPubmedXmlStream(
  input: ReadableStream<string>,
): AsyncIterableIterator<PubmedArticle> {
  const reader = input.getReader();
  let articleBuffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

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
  } finally {
    reader.releaseLock();
  }
}
