import { afterEach, describe, expect, it, vi } from 'vitest';

import { EUtils } from './eutils';
import { EUtilsHttpError } from './http-client';
import type { EUtilsConfig } from './types/params';

function mockFetch(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => Promise.resolve(new Response(body, { status }))),
  );
}

function mockFetchSequence(responses: ReadonlyArray<{ body: string; status: number }>): void {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockImplementationOnce(() => Promise.resolve(new Response(r.body, { status: r.status })));
  }
  vi.stubGlobal('fetch', fn);
}

function createClient(overrides?: Partial<EUtilsConfig>): EUtils {
  return new EUtils({ tool: 'test-tool', email: 'test@test.com', ...overrides });
}

function lastFetchRequest(): Request {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  const lastCall = calls[calls.length - 1]!;
  return lastCall[0] as Request;
}

function lastFetchUrl(): string {
  return lastFetchRequest().url;
}

function lastFetchMethod(): string {
  return lastFetchRequest().method;
}

async function lastFetchBody(): Promise<string> {
  return lastFetchRequest().text();
}

async function drainAsyncIterator<T>(iter: AsyncIterable<T>): Promise<Array<T>> {
  const items: Array<T> = [];
  for await (const item of iter) {
    items.push(item);
  }
  return items;
}

const ESEARCH_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>42</Count>
  <RetMax>20</RetMax>
  <RetStart>0</RetStart>
  <IdList>
    <Id>38000001</Id>
    <Id>38000002</Id>
  </IdList>
  <TranslationSet>
    <Translation>
      <From>asthma</From>
      <To>"asthma"[MeSH Terms] OR "asthma"[All Fields]</To>
    </Translation>
  </TranslationSet>
  <QueryTranslation>"asthma"[MeSH Terms] OR "asthma"[All Fields]</QueryTranslation>
</eSearchResult>`;

const ESEARCH_HISTORY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>10</Count>
  <RetMax>10</RetMax>
  <RetStart>0</RetStart>
  <IdList><Id>1</Id></IdList>
  <TranslationSet />
  <QueryTranslation>test</QueryTranslation>
  <WebEnv>MCID_test_webenv</WebEnv>
  <QueryKey>1</QueryKey>
</eSearchResult>`;

const ESEARCH_EMPTY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>0</Count>
  <RetMax>0</RetMax>
  <RetStart>0</RetStart>
  <IdList />
  <TranslationSet />
  <QueryTranslation />
</eSearchResult>`;

const ESEARCH_JSON = JSON.stringify({
  esearchresult: {
    count: '42',
    retmax: '20',
    retstart: '0',
    idlist: ['38000001', '38000002'],
    translationset: [{ from: 'asthma', to: '"asthma"[MeSH Terms]' }],
    querytranslation: '"asthma"[MeSH Terms]',
  },
});

const EFETCH_XML = `<PubmedArticleSet><PubmedArticle><MedlineCitation>...</MedlineCitation></PubmedArticle></PubmedArticleSet>`;

const ESUMMARY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSummaryResult>
  <DocSum>
    <Id>12345</Id>
    <Item Name="PubDate" Type="Date">2024 Jan</Item>
    <Item Name="Title" Type="String">Test Article</Item>
    <Item Name="AuthorList" Type="List">
      <Item Name="Author" Type="String">Smith J</Item>
      <Item Name="Author" Type="String">Doe A</Item>
    </Item>
  </DocSum>
</eSummaryResult>`;

const ESUMMARY_JSON = JSON.stringify({
  result: {
    uids: ['12345'],
    '12345': { uid: '12345', pubdate: '2024 Jan', title: 'Test Article' },
  },
});

const EPOST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ePostResult>
  <WebEnv>MCID_posted_webenv</WebEnv>
  <QueryKey>1</QueryKey>
</ePostResult>`;

const ELINK_NEIGHBOR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <LinkSetDb>
      <DbTo>pubmed</DbTo>
      <LinkName>pubmed_pubmed</LinkName>
      <Link><Id>456</Id></Link>
      <Link><Id>789</Id></Link>
    </LinkSetDb>
  </LinkSet>
</eLinkResult>`;

const ELINK_SCORE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <LinkSetDb>
      <DbTo>pubmed</DbTo>
      <LinkName>pubmed_pubmed</LinkName>
      <Link><Id>456</Id><Score>48572043</Score></Link>
    </LinkSetDb>
  </LinkSet>
</eLinkResult>`;

const ELINK_HISTORY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <WebEnv>MCID_link_webenv</WebEnv>
    <QueryKey>1</QueryKey>
  </LinkSet>
</eLinkResult>`;

const ELINK_ACHECK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdCheckList>
      <Id HasLinkOut="Y" HasNeighbor="Y">123</Id>
    </IdCheckList>
  </LinkSet>
</eLinkResult>`;

const ELINK_NCHECK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdCheckList>
      <Id HasNeighbor="Y">123</Id>
    </IdCheckList>
  </LinkSet>
</eLinkResult>`;

const ELINK_LCHECK_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdCheckList>
      <Id HasLinkOut="N">123</Id>
    </IdCheckList>
  </LinkSet>
</eLinkResult>`;

const ELINK_LLINKS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdUrlList>
      <IdUrlSet>
        <Id>123</Id>
        <ObjUrl>
          <Url>https://example.com/article</Url>
          <IconUrl>https://example.com/icon.png</IconUrl>
          <SubjectType>publishers/providers</SubjectType>
          <Provider>
            <Name>Example Publisher</Name>
            <NameAbbr>EP</NameAbbr>
          </Provider>
        </ObjUrl>
      </IdUrlSet>
    </IdUrlList>
  </LinkSet>
</eLinkResult>`;

const ELINK_JSON = JSON.stringify({
  linksets: [
    {
      dbfrom: 'pubmed',
      ids: [{ value: '123' }],
      linksetdbs: [
        {
          dbto: 'pubmed',
          linkname: 'pubmed_pubmed',
          links: [{ id: { value: '456' } }],
        },
      ],
    },
  ],
});

const EINFO_DBLIST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eInfoResult>
  <DbList>
    <DbName>pubmed</DbName>
    <DbName>protein</DbName>
    <DbName>nucleotide</DbName>
  </DbList>
</eInfoResult>`;

const EINFO_DETAIL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eInfoResult>
  <DbInfo>
    <DbName>pubmed</DbName>
    <Description>PubMed bibliographic record</Description>
    <Count>36000000</Count>
    <LastUpdate>2024/01/15 08:30</LastUpdate>
    <FieldList>
      <Field>
        <Name>ALL</Name>
        <FullName>All Fields</FullName>
        <Description>All terms from all searchable fields</Description>
        <TermCount>250000000</TermCount>
        <IsDate>N</IsDate>
        <IsNumerical>N</IsNumerical>
        <IsTruncatable>Y</IsTruncatable>
        <IsRangeable>N</IsRangeable>
      </Field>
    </FieldList>
    <LinkList>
      <Link>
        <Name>pubmed_pubmed</Name>
        <Menu>Similar articles</Menu>
        <Description>Computed neighbors</Description>
        <DbTo>pubmed</DbTo>
      </Link>
    </LinkList>
  </DbInfo>
</eInfoResult>`;

const EINFO_JSON_DETAIL = JSON.stringify({
  dbinfo: {
    dbname: 'pubmed',
    description: 'PubMed bibliographic record',
    count: '36000000',
    lastupdate: '2024/01/15 08:30',
    fieldlist: [
      {
        name: 'ALL',
        fullname: 'All Fields',
        description: 'All terms',
        termcount: '250000000',
        isdate: 'N',
        isnumerical: 'N',
      },
    ],
    linklist: [
      {
        name: 'pubmed_pubmed',
        menu: 'Similar articles',
        description: 'Computed neighbors',
        dbto: 'pubmed',
      },
    ],
  },
});

const ESPELL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSpellResult>
  <Database>pubmed</Database>
  <Query>asthmaa</Query>
  <CorrectedQuery>asthma</CorrectedQuery>
  <SpelledQuery><Replaced>asthma</Replaced>a treatment</SpelledQuery>
</eSpellResult>`;

const ESPELL_NO_CORRECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<eSpellResult>
  <Database>pubmed</Database>
  <Query>asthma</Query>
  <CorrectedQuery></CorrectedQuery>
  <SpelledQuery>asthma</SpelledQuery>
</eSpellResult>`;

const EGQUERY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Result>
  <Term>asthma</Term>
  <eGQueryResult>
    <ResultItem>
      <DbName>pubmed</DbName>
      <MenuName>PubMed</MenuName>
      <Count>250000</Count>
      <Status>Ok</Status>
    </ResultItem>
    <ResultItem>
      <DbName>pmc</DbName>
      <MenuName>PMC</MenuName>
      <Count>85000</Count>
      <Status>Ok</Status>
    </ResultItem>
    <ResultItem>
      <DbName>mesh</DbName>
      <MenuName>MeSH</MenuName>
      <Count>0</Count>
      <Status>Term or Database is not found</Status>
    </ResultItem>
  </eGQueryResult>
</Result>`;

const ECITMATCH_TEXT = `Ann Intern Med|1998|129|103|Feigelson HS|Art1|9652966\nN Engl J Med|1990|322|1405|Smith J|Art2|\n`;

describe('EUtils', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // NCBI E-utilities §General: tool + email required in all requests
  // https://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.Usage_Guidelines_and_Requiremen
  describe('constructor', () => {
    it('should create instance with valid config', () => {
      mockFetch('');
      const client = createClient();
      expect(client).toBeInstanceOf(EUtils);
    });

    it('should accept optional apiKey', () => {
      mockFetch('');
      const client = createClient({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(EUtils);
    });

    it('should accept optional maxRetries', () => {
      mockFetch('');
      const client = createClient({ maxRetries: 5 });
      expect(client).toBeInstanceOf(EUtils);
    });

    it('should throw if tool is missing', () => {
      expect(() => new EUtils({ tool: '', email: 'test@test.com' })).toThrow('tool is required');
    });

    it('should throw if email is missing', () => {
      expect(() => new EUtils({ tool: 'test', email: '' })).toThrow('email is required');
    });
  });

  // NCBI E-utilities §ESearch: esearch.fcgi returns UIDs matching a text query
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch
  describe('esearch', () => {
    it('should send GET request to esearch.fcgi', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma' });
      expect(lastFetchUrl()).toContain('esearch.fcgi');
      expect(lastFetchMethod()).toBe('GET');
    });

    it('should include db and term in query params', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma' });
      const url = lastFetchUrl();
      expect(url).toContain('db=pubmed');
      expect(url).toContain('term=asthma');
    });

    it('should parse XML response into ESearchResult', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'asthma' });
      expect(result).toBeDefined();
      expect(result.count).toBe(42);
    });

    it('should return count, retMax, retStart, idList', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'asthma' });
      expect(result.count).toBe(42);
      expect(result.retMax).toBe(20);
      expect(result.retStart).toBe(0);
      expect(result.idList).toEqual(['38000001', '38000002']);
    });

    it('should return translationSet and queryTranslation', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'asthma' });
      expect(result.translationSet).toHaveLength(1);
      expect(result.translationSet[0]!.from).toBe('asthma');
      expect(result.queryTranslation).toContain('asthma');
    });

    // NCBI E-utilities §ESearch.usehistory: when usehistory=y, returns WebEnv + QueryKey
    it('should include WebEnv and queryKey when usehistory is y', async () => {
      mockFetch(ESEARCH_HISTORY_XML);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'test', usehistory: 'y' });
      expect(result.webEnv).toBe('MCID_test_webenv');
      expect(result.queryKey).toBe(1);
      expect(lastFetchUrl()).toContain('usehistory=y');
    });

    it('should support retmode xml', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'asthma', retmode: 'xml' });
      expect(result.count).toBe(42);
    });

    it('should support retmode json', async () => {
      mockFetch(ESEARCH_JSON);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'asthma', retmode: 'json' });
      expect(result.count).toBe(42);
      expect(result.idList).toEqual(['38000001', '38000002']);
    });

    it('should support sort parameter', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma', sort: 'pub_date' });
      expect(lastFetchUrl()).toContain('sort=pub_date');
    });

    it('should support field parameter', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma', field: 'title' });
      expect(lastFetchUrl()).toContain('field=title');
    });

    it('should support datetype with mindate and maxdate', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({
        db: 'pubmed',
        term: 'asthma',
        datetype: 'pdat',
        mindate: '2020/01/01',
        maxdate: '2024/12/31',
      });
      const url = lastFetchUrl();
      expect(url).toContain('datetype=pdat');
      expect(url).toContain('mindate=2020%2F01%2F01');
      expect(url).toContain('maxdate=2024%2F12%2F31');
    });

    it('should support reldate parameter', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma', reldate: 365 });
      expect(lastFetchUrl()).toContain('reldate=365');
    });

    it('should support idtype acc', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma', idtype: 'acc' });
      expect(lastFetchUrl()).toContain('idtype=acc');
    });

    it('should send WebEnv and query_key when provided', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({
        db: 'pubmed',
        term: 'asthma',
        WebEnv: 'MCID_test',
        query_key: 1,
      });
      const url = lastFetchUrl();
      expect(url).toContain('WebEnv=MCID_test');
      expect(url).toContain('query_key=1');
    });

    it('should handle empty result set', async () => {
      mockFetch(ESEARCH_EMPTY_XML);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'xyznonexistent' });
      expect(result.count).toBe(0);
      expect(result.idList).toEqual([]);
    });

    it('should handle retstart and retmax pagination', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma', retstart: 20, retmax: 10 });
      const url = lastFetchUrl();
      expect(url).toContain('retstart=20');
      expect(url).toContain('retmax=10');
    });

    it('should encode spaces as + in term', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'asthma treatment' });
      expect(lastFetchUrl()).toContain('term=asthma+treatment');
    });

    it('should encode # as %23 in term', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: '#1 AND #2' });
      expect(lastFetchUrl()).toContain('term=%231+AND+%232');
    });

    it('should use HTTPS endpoint', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'test' });
      expect(lastFetchUrl()).toMatch(/^https:\/\/eutils\.ncbi\.nlm\.nih\.gov/);
    });
  });

  // NCBI E-utilities §EFetch: efetch.fcgi retrieves data records
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EFetch
  describe('efetch', () => {
    it('should send GET request to efetch.fcgi', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', id: '12345' });
      expect(lastFetchUrl()).toContain('efetch.fcgi');
      expect(lastFetchMethod()).toBe('GET');
    });

    it('should return raw XML string', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      const result = await client.efetch({ db: 'pubmed', id: '12345' });
      expect(result).toBe(EFETCH_XML);
    });

    it('should include db and id in query params', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', id: '12345' });
      const url = lastFetchUrl();
      expect(url).toContain('db=pubmed');
      expect(url).toContain('id=12345');
    });

    it('should support WebEnv and query_key', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', WebEnv: 'MCID_test', query_key: 1 });
      const url = lastFetchUrl();
      expect(url).toContain('WebEnv=MCID_test');
      expect(url).toContain('query_key=1');
    });

    it('should support rettype parameter', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', id: '12345', rettype: 'abstract' });
      expect(lastFetchUrl()).toContain('rettype=abstract');
    });

    it('should support retmode parameter', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', id: '12345', retmode: 'xml' });
      expect(lastFetchUrl()).toContain('retmode=xml');
    });

    it('should support retstart and retmax', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', id: '12345', retstart: 10, retmax: 5 });
      const url = lastFetchUrl();
      expect(url).toContain('retstart=10');
      expect(url).toContain('retmax=5');
    });

    it('should support idtype parameter', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      await client.efetch({ db: 'pubmed', id: '12345', idtype: 'acc' });
      expect(lastFetchUrl()).toContain('idtype=acc');
    });

    // NCBI E-utilities §Usage: POST when id list > 200 characters
    it('should POST when id list exceeds 200', async () => {
      mockFetch(EFETCH_XML);
      const client = createClient();
      const longIds = Array.from({ length: 50 }, (_, i) => String(30000000 + i)).join(',');
      await client.efetch({ db: 'pubmed', id: longIds });
      expect(lastFetchMethod()).toBe('POST');
    });

    it('should POST when term length exceeds limit', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      const longTerm = 'a'.repeat(301);
      await client.esearch({ db: 'pubmed', term: longTerm });
      expect(lastFetchMethod()).toBe('POST');
    });

    it('should support rettype abstract', async () => {
      const abstractText = 'This is an abstract.';
      mockFetch(abstractText);
      const client = createClient();
      const result = await client.efetch({ db: 'pubmed', id: '12345', rettype: 'abstract' });
      expect(result).toBe(abstractText);
    });
  });

  // NCBI E-utilities §ESummary: esummary.fcgi retrieves document summaries
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESummary
  describe('esummary', () => {
    it('should send GET request to esummary.fcgi', async () => {
      mockFetch(ESUMMARY_XML);
      const client = createClient();
      await client.esummary({ db: 'pubmed', id: '12345' });
      expect(lastFetchUrl()).toContain('esummary.fcgi');
    });

    it('should parse XML response into ESummaryResult', async () => {
      mockFetch(ESUMMARY_XML);
      const client = createClient();
      const result = await client.esummary({ db: 'pubmed', id: '12345' });
      expect(result.docSums).toHaveLength(1);
    });

    it('should return docSums array with uid and fields', async () => {
      mockFetch(ESUMMARY_XML);
      const client = createClient();
      const result = await client.esummary({ db: 'pubmed', id: '12345' });
      const doc = result.docSums[0]!;
      expect(doc.uid).toBe('12345');
      expect(doc['Title']).toBe('Test Article');
      expect(doc['PubDate']).toBe('2024 Jan');
    });

    it('should support retmode json natively', async () => {
      mockFetch(ESUMMARY_JSON);
      const client = createClient();
      const result = await client.esummary({ db: 'pubmed', id: '12345', retmode: 'json' });
      expect(result.docSums).toHaveLength(1);
      expect(result.docSums[0]!.uid).toBe('12345');
    });

    it('should support version 2.0', async () => {
      mockFetch(ESUMMARY_XML);
      const client = createClient();
      await client.esummary({ db: 'pubmed', id: '12345', version: '2.0' });
      expect(lastFetchUrl()).toContain('version=2.0');
    });

    it('should support WebEnv and query_key', async () => {
      mockFetch(ESUMMARY_XML);
      const client = createClient();
      await client.esummary({ db: 'pubmed', WebEnv: 'MCID_test', query_key: 1 });
      const url = lastFetchUrl();
      expect(url).toContain('WebEnv=MCID_test');
      expect(url).toContain('query_key=1');
    });

    it('should support retstart and retmax', async () => {
      mockFetch(ESUMMARY_XML);
      const client = createClient();
      await client.esummary({ db: 'pubmed', id: '12345', retstart: 10, retmax: 5 });
      const url = lastFetchUrl();
      expect(url).toContain('retstart=10');
      expect(url).toContain('retmax=5');
    });
  });

  // NCBI E-utilities §EPost: epost.fcgi uploads UIDs to the History Server
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EPost
  describe('epost', () => {
    it('should send POST request to epost.fcgi', async () => {
      mockFetch(EPOST_XML);
      const client = createClient();
      await client.epost({ db: 'pubmed', id: '12345' });
      expect(lastFetchUrl()).toContain('epost.fcgi');
      expect(lastFetchMethod()).toBe('POST');
    });

    it('should return webEnv and queryKey', async () => {
      mockFetch(EPOST_XML);
      const client = createClient();
      const result = await client.epost({ db: 'pubmed', id: '12345' });
      expect(result.webEnv).toBe('MCID_posted_webenv');
      expect(result.queryKey).toBe(1);
    });

    it('should support existing WebEnv to append', async () => {
      mockFetch(EPOST_XML);
      const client = createClient();
      await client.epost({ db: 'pubmed', id: '12345', WebEnv: 'MCID_existing' });
      const body = await lastFetchBody();
      expect(body).toContain('WebEnv=MCID_existing');
    });

    it('should POST id list in request body', async () => {
      mockFetch(EPOST_XML);
      const client = createClient();
      await client.epost({ db: 'pubmed', id: '12345,67890' });
      const body = await lastFetchBody();
      expect(body).toContain('id=12345%2C67890');
    });
  });

  // NCBI E-utilities §ELink: elink.fcgi discovers links between databases
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ELink
  describe('elink', () => {
    it('should send GET request to elink.fcgi', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      await client.elink({ db: 'pubmed', dbfrom: 'pubmed', id: '123' });
      expect(lastFetchUrl()).toContain('elink.fcgi');
    });

    it('should parse LinkSet response', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      const result = await client.elink({ db: 'pubmed', dbfrom: 'pubmed', id: '123' });
      expect(result.linkSets).toHaveLength(1);
      expect(result.linkSets[0]!.dbFrom).toBe('pubmed');
    });

    // NCBI E-utilities §ELink.cmd=neighbor: returns linked UIDs in target db
    it('should support cmd neighbor', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'neighbor',
      });
      const ls = result.linkSets[0]!;
      expect(ls.linkSetDbs).toHaveLength(1);
      expect(ls.linkSetDbs![0]!.links).toHaveLength(2);
    });

    // NCBI E-utilities §ELink.cmd=neighbor_score: returns UIDs with relevancy scores
    it('should support cmd neighbor_score', async () => {
      mockFetch(ELINK_SCORE_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'neighbor_score',
      });
      const link = result.linkSets[0]!.linkSetDbs![0]!.links[0]!;
      expect(link.id).toBe('456');
      expect(link.score).toBe(48572043);
    });

    // NCBI E-utilities §ELink.cmd=neighbor_history: stores results on History Server
    it('should support cmd neighbor_history and return WebEnv', async () => {
      mockFetch(ELINK_HISTORY_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'neighbor_history',
      });
      expect(result.linkSets[0]!.webEnv).toBe('MCID_link_webenv');
      expect(result.linkSets[0]!.queryKey).toBe(1);
    });

    // NCBI E-utilities §ELink.cmd=acheck: check all links for a set of UIDs
    it('should support cmd acheck', async () => {
      mockFetch(ELINK_ACHECK_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'acheck',
      });
      const check = result.linkSets[0]!.idCheckResults![0]!;
      expect(check.id).toBe('123');
      expect(check.hasLinkOut).toBe(true);
      expect(check.hasNeighbor).toBe(true);
    });

    it('should support cmd ncheck', async () => {
      mockFetch(ELINK_NCHECK_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'ncheck',
      });
      expect(result.linkSets[0]!.idCheckResults![0]!.hasNeighbor).toBe(true);
    });

    it('should support cmd lcheck', async () => {
      mockFetch(ELINK_LCHECK_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'lcheck',
      });
      expect(result.linkSets[0]!.idCheckResults![0]!.hasLinkOut).toBe(false);
    });

    // NCBI E-utilities §ELink.cmd=llinks: returns full LinkOut URLs
    it('should support cmd llinks', async () => {
      mockFetch(ELINK_LLINKS_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
      });
      const urls = result.linkSets[0]!.linkOutUrls!;
      expect(urls).toHaveLength(1);
      expect(urls[0]!.url).toBe('https://example.com/article');
      expect(urls[0]!.provider).toBe('Example Publisher');
    });

    it('should support cmd llinkslib', async () => {
      mockFetch(ELINK_LLINKS_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinkslib',
      });
      expect(result.linkSets[0]!.linkOutUrls).toBeDefined();
    });

    it('should support cmd prlinks', async () => {
      mockFetch(ELINK_LLINKS_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'prlinks',
      });
      expect(result.linkSets[0]!.linkOutUrls).toBeDefined();
    });

    it('should support linkname parameter', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        linkname: 'pubmed_pubmed_citedin',
      });
      expect(lastFetchUrl()).toContain('linkname=pubmed_pubmed_citedin');
    });

    it('should support retmode json', async () => {
      mockFetch(ELINK_JSON);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        retmode: 'json',
      });
      expect(result.linkSets[0]!.linkSetDbs![0]!.links[0]!.id).toBe('456');
    });

    it('should support multiple IDs', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      await client.elink({ db: 'pubmed', dbfrom: 'pubmed', id: '123,456,789' });
      expect(lastFetchUrl()).toContain('id=123%2C456%2C789');
    });

    it('should support date filtering', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        datetype: 'pdat',
        mindate: '2020/01/01',
        maxdate: '2024/12/31',
      });
      const url = lastFetchUrl();
      expect(url).toContain('datetype=pdat');
      expect(url).toContain('mindate=');
    });

    it('should support term filtering', async () => {
      mockFetch(ELINK_NEIGHBOR_XML);
      const client = createClient();
      await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        term: 'asthma[MeSH]',
      });
      expect(lastFetchUrl()).toContain('term=asthma');
    });

    it('should support holding parameter', async () => {
      mockFetch(ELINK_LLINKS_XML);
      const client = createClient();
      await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
        holding: 'nlm',
      });
      expect(lastFetchUrl()).toContain('holding=nlm');
    });

    it('should return linkOutUrls when available', async () => {
      mockFetch(ELINK_LLINKS_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
      });
      const url = result.linkSets[0]!.linkOutUrls![0]!;
      expect(url.iconUrl).toBe('https://example.com/icon.png');
      expect(url.subjectType).toBe('publishers/providers');
      expect(url.providerAbbr).toBe('EP');
    });

    it('should return idCheckResults for check commands', async () => {
      mockFetch(ELINK_ACHECK_XML);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'acheck',
      });
      const checks = result.linkSets[0]!.idCheckResults!;
      expect(checks).toHaveLength(1);
      expect(checks[0]!.id).toBe('123');
    });
  });

  // NCBI E-utilities §EInfo: einfo.fcgi provides database metadata
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EInfo
  describe('einfo', () => {
    it('should send GET request to einfo.fcgi', async () => {
      mockFetch(EINFO_DBLIST_XML);
      const client = createClient();
      await client.einfo();
      expect(lastFetchUrl()).toContain('einfo.fcgi');
    });

    it('should return dbList when no db specified', async () => {
      mockFetch(EINFO_DBLIST_XML);
      const client = createClient();
      const result = await client.einfo();
      expect(result.dbList).toContain('pubmed');
      expect(result.dbList).toContain('protein');
    });

    it('should return dbInfo when db specified', async () => {
      mockFetch(EINFO_DETAIL_XML);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed' });
      expect(result.dbInfo).toBeDefined();
      expect(result.dbInfo!.dbName).toBe('pubmed');
      expect(result.dbInfo!.count).toBe(36000000);
    });

    it('should include fieldList in dbInfo', async () => {
      mockFetch(EINFO_DETAIL_XML);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed' });
      const field = result.dbInfo!.fieldList[0]!;
      expect(field.name).toBe('ALL');
      expect(field.fullName).toBe('All Fields');
      expect(field.isDate).toBe(false);
      expect(field.isTruncatable).toBe(true);
    });

    it('should include linkList in dbInfo', async () => {
      mockFetch(EINFO_DETAIL_XML);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed' });
      const link = result.dbInfo!.linkList[0]!;
      expect(link.name).toBe('pubmed_pubmed');
      expect(link.menu).toBe('Similar articles');
      expect(link.dbTo).toBe('pubmed');
    });

    it('should support version 2.0', async () => {
      mockFetch(EINFO_DETAIL_XML);
      const client = createClient();
      await client.einfo({ db: 'pubmed', version: '2.0' });
      expect(lastFetchUrl()).toContain('version=2.0');
    });

    it('should support retmode json', async () => {
      mockFetch(EINFO_JSON_DETAIL);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed', retmode: 'json' });
      expect(result.dbInfo!.dbName).toBe('pubmed');
    });
  });

  // NCBI E-utilities §ESpell: espell.fcgi provides spelling suggestions
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESpell
  describe('espell', () => {
    it('should send GET request to espell.fcgi', async () => {
      mockFetch(ESPELL_XML);
      const client = createClient();
      await client.espell({ db: 'pubmed', term: 'asthmaa' });
      expect(lastFetchUrl()).toContain('espell.fcgi');
    });

    it('should return correctedQuery', async () => {
      mockFetch(ESPELL_XML);
      const client = createClient();
      const result = await client.espell({ db: 'pubmed', term: 'asthmaa' });
      expect(result.correctedQuery).toBe('asthma');
    });

    // NCBI E-utilities §ESpell: SpelledQuery marks corrections with <Replaced> tags
    it('should return spelledQuery with corrections marked', async () => {
      mockFetch(ESPELL_XML);
      const client = createClient();
      const result = await client.espell({ db: 'pubmed', term: 'asthmaa' });
      expect(result.spelledQuery).toContain('asthma');
    });

    it('should return original query unchanged when no corrections', async () => {
      mockFetch(ESPELL_NO_CORRECTION_XML);
      const client = createClient();
      const result = await client.espell({ db: 'pubmed', term: 'asthma' });
      expect(result.query).toBe('asthma');
      expect(result.correctedQuery).toBe('');
    });
  });

  // NCBI E-utilities §EGQuery: egquery.fcgi searches all Entrez databases
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EGQuery
  describe('egquery', () => {
    it('should send GET request to egquery.fcgi', async () => {
      mockFetch(EGQUERY_XML);
      const client = createClient();
      await client.egquery({ term: 'asthma' });
      expect(lastFetchUrl()).toContain('egquery.fcgi');
    });

    it('should return term and eGQueryResultItems', async () => {
      mockFetch(EGQUERY_XML);
      const client = createClient();
      const result = await client.egquery({ term: 'asthma' });
      expect(result.term).toBe('asthma');
      expect(result.eGQueryResultItems.length).toBeGreaterThan(0);
    });

    it('should include count per database', async () => {
      mockFetch(EGQUERY_XML);
      const client = createClient();
      const result = await client.egquery({ term: 'asthma' });
      const pubmed = result.eGQueryResultItems.find((item) => item.dbName === 'pubmed');
      expect(pubmed).toBeDefined();
      expect(pubmed!.count).toBe(250000);
    });
  });

  // NCBI E-utilities §ECitMatch: ecitmatch.cgi matches citation strings to PMIDs
  // https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ECitMatch
  describe('ecitmatch', () => {
    it('should send GET request to ecitmatch.cgi', async () => {
      mockFetch(ECITMATCH_TEXT);
      const client = createClient();
      await client.ecitmatch({ bdata: 'Ann Intern Med|1998|129|103|Feigelson HS|Art1|' });
      expect(lastFetchUrl()).toContain('ecitmatch.cgi');
    });

    it('should return citation matches with PMIDs', async () => {
      mockFetch(ECITMATCH_TEXT);
      const client = createClient();
      const result = await client.ecitmatch({
        bdata: 'Ann Intern Med|1998|129|103|Feigelson HS|Art1|',
      });
      const match = result.citations[0]!;
      expect(match.journal).toBe('Ann Intern Med');
      expect(match.pmid).toBe('9652966');
    });

    it('should handle unmatched citations with null pmid', async () => {
      mockFetch(ECITMATCH_TEXT);
      const client = createClient();
      const result = await client.ecitmatch({ bdata: 'test' });
      const unmatched = result.citations.find((citation) => citation.key === 'Art2');
      expect(unmatched).toBeDefined();
      expect(unmatched!.pmid).toBeUndefined();
    });

    it('should format bdata correctly', async () => {
      mockFetch(ECITMATCH_TEXT);
      const client = createClient();
      const bdata = 'Ann Intern Med|1998|129|103|Feigelson HS|Art1|';
      await client.ecitmatch({ bdata });
      expect(lastFetchUrl()).toContain('bdata=');
    });
  });

  // NCBI E-utilities §History Server: WebEnv + query_key pagination
  // https://www.ncbi.nlm.nih.gov/books/NBK25498/#chapter3.Application_3_Retrieving_large
  describe('efetchBatches', () => {
    it('should yield batches of results as strings', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<batch1>data</batch1>', status: 200 },
      ]);
      const client = createClient();
      const batches: Array<string> = [];
      for await (const batch of client.efetchBatches({ db: 'pubmed', id: '12345' })) {
        batches.push(batch);
      }
      expect(batches).toHaveLength(1);
      expect(batches[0]).toContain('batch1');
    });

    it('should use default batchSize of 500', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<data />', status: 200 },
      ]);
      const client = createClient();
      await drainAsyncIterator(client.efetchBatches({ db: 'pubmed', id: '12345' }));
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[1]![0] as Request).url;
      expect(efetchUrl).toContain('retmax=500');
    });

    it('should respect custom batchSize', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<data />', status: 200 },
      ]);
      const client = createClient();
      await drainAsyncIterator(client.efetchBatches({ db: 'pubmed', id: '12345', batchSize: 100 }));
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[1]![0] as Request).url;
      expect(efetchUrl).toContain('retmax=100');
    });

    it('should use History Server for iteration', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<data />', status: 200 },
      ]);
      const client = createClient();
      await drainAsyncIterator(client.efetchBatches({ db: 'pubmed', id: '12345' }));
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[1]![0] as Request).url;
      expect(efetchUrl).toContain('WebEnv=MCID_posted_webenv');
      expect(efetchUrl).toContain('query_key=1');
    });

    it('should stop when all results fetched', async () => {
      const ids = '1,2,3';
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<batch1 />', status: 200 },
      ]);
      const client = createClient();
      const batches: Array<string> = [];
      for await (const batch of client.efetchBatches({ db: 'pubmed', id: ids, batchSize: 500 })) {
        batches.push(batch);
      }
      // 3 ids with batchSize 500 → 1 batch
      expect(batches).toHaveLength(1);
    });

    it('should handle empty result set', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();
      const batches: Array<string> = [];
      for await (const batch of client.efetchBatches({ db: 'pubmed', id: '12345' })) {
        batches.push(batch);
      }
      expect(batches).toHaveLength(0);
    });

    it('should increment retstart for each batch', async () => {
      const ids = Array.from({ length: 3 }, (_, i) => String(i + 1)).join(',');
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<batch1 />', status: 200 },
        { body: '<batch2 />', status: 200 },
        { body: '<batch3 />', status: 200 },
      ]);
      const client = createClient();
      const batches: Array<string> = [];
      for await (const batch of client.efetchBatches({ db: 'pubmed', id: ids, batchSize: 1 })) {
        batches.push(batch);
      }
      expect(batches).toHaveLength(3);
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      // calls[0] = epost, calls[1..3] = efetch batches
      expect((calls[1]![0] as Request).url).toContain('retstart=0');
      expect((calls[2]![0] as Request).url).toContain('retstart=1');
      expect((calls[3]![0] as Request).url).toContain('retstart=2');
    });

    it('should throw when neither WebEnv+query_key nor id is provided', async () => {
      const client = createClient();
      await expect(drainAsyncIterator(client.efetchBatches({ db: 'pubmed' }))).rejects.toThrow(
        'efetchBatches requires WebEnv+query_key or id',
      );
    });

    it('should use WebEnv and query_key directly when both are provided', async () => {
      mockFetchSequence([
        { body: '<batch1>data</batch1>', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();
      const batches = await drainAsyncIterator(
        client.efetchBatches({
          db: 'pubmed',
          WebEnv: 'MCID_direct',
          query_key: 2,
        }),
      );
      expect(batches).toHaveLength(1);
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[0]![0] as Request).url;
      expect(efetchUrl).toContain('WebEnv=MCID_direct');
      expect(efetchUrl).toContain('query_key=2');
    });

    it('should handle whitespace-only response as empty', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '   \n  ', status: 200 },
      ]);
      const client = createClient();
      const batches = await drainAsyncIterator(client.efetchBatches({ db: 'pubmed', id: '12345' }));
      expect(batches).toHaveLength(0);
    });

    it('should respect custom retstart', async () => {
      mockFetchSequence([
        { body: '<data />', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();
      await drainAsyncIterator(
        client.efetchBatches({
          db: 'pubmed',
          WebEnv: 'MCID_test',
          query_key: 1,
          retstart: 100,
        }),
      );
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[0]![0] as Request).url;
      expect(efetchUrl).toContain('retstart=100');
    });

    it('should pass rettype and idtype to efetch calls', async () => {
      mockFetchSequence([
        { body: EPOST_XML, status: 200 },
        { body: '<data />', status: 200 },
      ]);
      const client = createClient();
      await drainAsyncIterator(
        client.efetchBatches({
          db: 'pubmed',
          id: '12345',
          rettype: 'abstract',
          retmode: 'xml',
          idtype: 'acc',
        }),
      );
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[1]![0] as Request).url;
      expect(efetchUrl).toContain('rettype=abstract');
      expect(efetchUrl).toContain('retmode=xml');
      expect(efetchUrl).toContain('idtype=acc');
    });
  });

  // NCBI E-utilities §General: shared request parameters
  // https://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.Usage_Guidelines_and_Requiremen
  describe('shared behavior', () => {
    it('should include api_key in all requests when configured', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient({ apiKey: 'my-api-key' });
      await client.esearch({ db: 'pubmed', term: 'test' });
      expect(lastFetchUrl()).toContain('api_key=my-api-key');
    });

    it('should include tool and email in all requests', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();
      await client.esearch({ db: 'pubmed', term: 'test' });
      const url = lastFetchUrl();
      expect(url).toContain('tool=test-tool');
      expect(url).toContain('email=test%40test.com');
    });

    // NCBI E-utilities §Usage: retry on HTTP 429
    it('should retry on HTTP 429', async () => {
      mockFetchSequence([
        { body: 'rate limited', status: 429 },
        { body: ESEARCH_XML, status: 200 },
      ]);
      const client = createClient({ maxRetries: 3 });
      const result = await client.esearch({ db: 'pubmed', term: 'test' });
      expect(result.count).toBe(42);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on HTTP 500', async () => {
      mockFetchSequence([
        { body: 'server error', status: 500 },
        { body: ESEARCH_XML, status: 200 },
      ]);
      const client = createClient({ maxRetries: 3 });
      const result = await client.esearch({ db: 'pubmed', term: 'test' });
      expect(result.count).toBe(42);
    });

    it('should retry on HTTP 502', async () => {
      mockFetchSequence([
        { body: 'bad gateway', status: 502 },
        { body: ESEARCH_XML, status: 200 },
      ]);
      const client = createClient({ maxRetries: 3 });
      const result = await client.esearch({ db: 'pubmed', term: 'test' });
      expect(result.count).toBe(42);
    });

    it('should retry on HTTP 503', async () => {
      mockFetchSequence([
        { body: 'service unavailable', status: 503 },
        { body: ESEARCH_XML, status: 200 },
      ]);
      const client = createClient({ maxRetries: 3 });
      const result = await client.esearch({ db: 'pubmed', term: 'test' });
      expect(result.count).toBe(42);
    });

    it('should use exponential backoff for retries', async () => {
      vi.useFakeTimers();
      mockFetchSequence([
        { body: 'error', status: 500 },
        { body: 'error', status: 500 },
        { body: ESEARCH_XML, status: 200 },
      ]);
      const client = createClient({ maxRetries: 3 });
      const promise = client.esearch({ db: 'pubmed', term: 'test' });
      // Advance through retries (backoff + jitter)
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result.count).toBe(42);
      expect(fetch).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });

    it('should respect maxRetries configuration', async () => {
      mockFetchSequence([
        { body: 'error', status: 500 },
        { body: 'error', status: 500 },
      ]);
      const client = createClient({ maxRetries: 1 });
      await expect(client.esearch({ db: 'pubmed', term: 'test' })).rejects.toThrow(EUtilsHttpError);
    });

    it('should throw after maxRetries exceeded', async () => {
      mockFetchSequence([
        { body: 'error', status: 500 },
        { body: 'error', status: 500 },
        { body: 'error', status: 500 },
        { body: 'error', status: 500 },
      ]);
      const client = createClient({ maxRetries: 3 });

      try {
        await client.esearch({ db: 'pubmed', term: 'test' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EUtilsHttpError);
        expect((err as EUtilsHttpError).statusCode).toBe(500);
      }
    });

    it('should throw on malformed XML response', async () => {
      mockFetch('not xml at all {{{');
      const client = createClient();
      // esearch tries to parse — missing Count tag will produce NaN but won't throw
      // epost parsing will throw because WebEnv/QueryKey are required
      await expect(client.epost({ db: 'pubmed', id: '12345' })).rejects.toThrow(
        'Invalid EPost response',
      );
    });

    it('should throw on network error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
      const client = createClient();
      await expect(client.esearch({ db: 'pubmed', term: 'test' })).rejects.toThrow('fetch failed');
    });

    it('should throw on non-retryable HTTP errors', async () => {
      mockFetch('not found', 404);
      const client = createClient();
      await expect(client.esearch({ db: 'pubmed', term: 'test' })).rejects.toThrow(EUtilsHttpError);
    });
  });

  describe('searchAndFetch', () => {
    it('should chain esearch with usehistory and efetchBatches', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: '<articles>batch1</articles>', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();

      const batches = await drainAsyncIterator(
        client.searchAndFetch({ db: 'pubmed', term: 'test' }),
      );

      expect(batches).toHaveLength(1);
      expect(batches[0]).toContain('batch1');
    });

    it('should pass rettype and retmode to efetch', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: '<data />', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();

      await drainAsyncIterator(
        client.searchAndFetch({ db: 'pubmed', term: 'test', rettype: 'abstract', retmode: 'xml' }),
      );

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[1]![0] as Request).url;
      expect(efetchUrl).toContain('rettype=abstract');
      expect(efetchUrl).toContain('retmode=xml');
    });

    it('should pass batchSize to efetchBatches', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: '<data />', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();

      await drainAsyncIterator(
        client.searchAndFetch({ db: 'pubmed', term: 'test', batchSize: 100 }),
      );

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const efetchUrl = (calls[1]![0] as Request).url;
      expect(efetchUrl).toContain('retmax=100');
    });

    it('should yield nothing when esearch returns no webEnv', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();

      const batches = await drainAsyncIterator(
        client.searchAndFetch({ db: 'pubmed', term: 'test' }),
      );

      expect(batches).toHaveLength(0);
    });

    it('should yield nothing when esearch returns webEnv but no queryKey', async () => {
      const noQueryKeyXml = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>5</Count>
  <RetMax>0</RetMax>
  <RetStart>0</RetStart>
  <IdList />
  <TranslationSet />
  <QueryTranslation>test</QueryTranslation>
  <WebEnv>MCID_test_webenv</WebEnv>
</eSearchResult>`;
      mockFetch(noQueryKeyXml);
      const client = createClient();

      const batches = await drainAsyncIterator(
        client.searchAndFetch({ db: 'pubmed', term: 'test' }),
      );

      expect(batches).toHaveLength(0);
    });

    it('should pass date parameters to esearch', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: '<data />', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();

      await drainAsyncIterator(
        client.searchAndFetch({
          db: 'pubmed',
          term: 'test',
          datetype: 'pdat',
          mindate: '2020/01/01',
          maxdate: '2024/12/31',
          reldate: 365,
          sort: 'pub_date',
        }),
      );

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const esearchUrl = (calls[0]![0] as Request).url;
      expect(esearchUrl).toContain('datetype=pdat');
      expect(esearchUrl).toContain('sort=pub_date');
    });

    it('should send usehistory=y and retmax=0 to esearch', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: '<data />', status: 200 },
        { body: '', status: 200 },
      ]);
      const client = createClient();

      await drainAsyncIterator(client.searchAndFetch({ db: 'pubmed', term: 'test' }));

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const esearchUrl = (calls[0]![0] as Request).url;
      expect(esearchUrl).toContain('usehistory=y');
      expect(esearchUrl).toContain('retmax=0');
    });
  });

  describe('searchAndSummarize', () => {
    it('should chain esearch with usehistory and esummary batches', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: ESUMMARY_XML, status: 200 },
      ]);
      const client = createClient();

      const results = await drainAsyncIterator(
        client.searchAndSummarize({ db: 'pubmed', term: 'test' }),
      );

      expect(results).toHaveLength(1);
      expect(results[0]!.docSums).toHaveLength(1);
      expect(results[0]!.docSums[0]!.uid).toBe('12345');
    });

    it('should yield nothing when esearch returns count=0', async () => {
      const emptySearch = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>0</Count>
  <RetMax>0</RetMax>
  <RetStart>0</RetStart>
  <IdList />
  <TranslationSet />
  <QueryTranslation>test</QueryTranslation>
  <WebEnv>MCID_test_webenv</WebEnv>
  <QueryKey>1</QueryKey>
</eSearchResult>`;
      mockFetch(emptySearch);
      const client = createClient();

      const results = await drainAsyncIterator(
        client.searchAndSummarize({ db: 'pubmed', term: 'nomatch' }),
      );

      expect(results).toHaveLength(0);
    });

    it('should respect custom batchSize', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: ESUMMARY_XML, status: 200 },
      ]);
      const client = createClient();

      await drainAsyncIterator(
        client.searchAndSummarize({ db: 'pubmed', term: 'test', batchSize: 50 }),
      );

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const esummaryUrl = (calls[1]![0] as Request).url;
      expect(esummaryUrl).toContain('retmax=50');
    });

    it('should yield nothing when esearch returns no webEnv', async () => {
      mockFetch(ESEARCH_XML);
      const client = createClient();

      const results = await drainAsyncIterator(
        client.searchAndSummarize({ db: 'pubmed', term: 'test' }),
      );

      expect(results).toHaveLength(0);
    });

    it('should yield nothing when esearch returns webEnv but no queryKey', async () => {
      const noQueryKeyXml = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>5</Count>
  <RetMax>0</RetMax>
  <RetStart>0</RetStart>
  <IdList />
  <TranslationSet />
  <QueryTranslation>test</QueryTranslation>
  <WebEnv>MCID_test_webenv</WebEnv>
</eSearchResult>`;
      mockFetch(noQueryKeyXml);
      const client = createClient();

      const results = await drainAsyncIterator(
        client.searchAndSummarize({ db: 'pubmed', term: 'test' }),
      );

      expect(results).toHaveLength(0);
    });

    it('should pass retmode and version to esummary', async () => {
      mockFetchSequence([
        { body: ESEARCH_HISTORY_XML, status: 200 },
        { body: ESUMMARY_JSON, status: 200 },
      ]);
      const client = createClient();

      await drainAsyncIterator(
        client.searchAndSummarize({
          db: 'pubmed',
          term: 'test',
          retmode: 'json',
          version: '2.0',
        }),
      );

      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      const esummaryUrl = (calls[1]![0] as Request).url;
      expect(esummaryUrl).toContain('retmode=json');
      expect(esummaryUrl).toContain('version=2.0');
    });

    it('should paginate esummary batches when count exceeds batchSize', async () => {
      const largeSearch = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>3</Count>
  <RetMax>0</RetMax>
  <RetStart>0</RetStart>
  <IdList />
  <TranslationSet />
  <QueryTranslation>test</QueryTranslation>
  <WebEnv>MCID_test_webenv</WebEnv>
  <QueryKey>1</QueryKey>
</eSearchResult>`;
      mockFetchSequence([
        { body: largeSearch, status: 200 },
        { body: ESUMMARY_XML, status: 200 },
        { body: ESUMMARY_XML, status: 200 },
        { body: ESUMMARY_XML, status: 200 },
      ]);
      const client = createClient();

      const results = await drainAsyncIterator(
        client.searchAndSummarize({ db: 'pubmed', term: 'test', batchSize: 1 }),
      );

      expect(results).toHaveLength(3);
    });
  });

  describe('parser edge cases', () => {
    it('should parse esearch XML with errorList', async () => {
      const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<eSearchResult>
  <Count>0</Count>
  <RetMax>0</RetMax>
  <RetStart>0</RetStart>
  <IdList />
  <TranslationSet />
  <QueryTranslation />
  <ErrorList>
    <FieldNotFound>badfield</FieldNotFound>
  </ErrorList>
</eSearchResult>`;
      mockFetch(errorXml);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'test' });
      expect(result.errorList).toEqual(['badfield']);
    });

    it('should parse esearch JSON with errorList', async () => {
      const errorJson = JSON.stringify({
        esearchresult: {
          count: '0',
          retmax: '0',
          retstart: '0',
          idlist: [],
          translationset: [],
          querytranslation: '',
          errorlist: { fieldnotfound: ['badfield'] },
        },
      });
      mockFetch(errorJson);
      const client = createClient();
      const result = await client.esearch({ db: 'pubmed', term: 'test', retmode: 'json' });
      expect(result.errorList).toEqual(['badfield']);
    });

    it('should throw on esearch JSON with missing esearchresult', async () => {
      mockFetch(JSON.stringify({}));
      const client = createClient();
      await expect(client.esearch({ db: 'pubmed', term: 'test', retmode: 'json' })).rejects.toThrow(
        'Invalid ESearch JSON',
      );
    });

    it('should parse esearch JSON with webEnv and queryKey', async () => {
      const historyJson = JSON.stringify({
        esearchresult: {
          count: '10',
          retmax: '10',
          retstart: '0',
          idlist: ['1'],
          translationset: [],
          querytranslation: 'test',
          webenv: 'MCID_json_webenv',
          querykey: '1',
        },
      });
      mockFetch(historyJson);
      const client = createClient();
      const result = await client.esearch({
        db: 'pubmed',
        term: 'test',
        retmode: 'json',
        usehistory: 'y',
      });
      expect(result.webEnv).toBe('MCID_json_webenv');
      expect(result.queryKey).toBe(1);
    });

    it('should throw on esummary JSON with missing result', async () => {
      mockFetch(JSON.stringify({}));
      const client = createClient();
      await expect(client.esummary({ db: 'pubmed', id: '12345', retmode: 'json' })).rejects.toThrow(
        'Invalid ESummary JSON',
      );
    });

    it('should handle esummary JSON where uid record is not an object', async () => {
      const jsonWithNonObject = JSON.stringify({
        result: {
          uids: ['12345'],
          '12345': 'not-an-object',
        },
      });
      mockFetch(jsonWithNonObject);
      const client = createClient();
      const result = await client.esummary({ db: 'pubmed', id: '12345', retmode: 'json' });
      expect(result.docSums).toHaveLength(0);
    });

    it('should handle esummary JSON with no uids key', async () => {
      const jsonNoUids = JSON.stringify({ result: {} });
      mockFetch(jsonNoUids);
      const client = createClient();
      const result = await client.esummary({ db: 'pubmed', id: '12345', retmode: 'json' });
      expect(result.docSums).toHaveLength(0);
      expect(result.uid).toBe('');
    });

    it('should skip esummary XML items with empty name or undefined content', async () => {
      const xmlWithBadItems = `<?xml version="1.0" encoding="UTF-8"?>
<eSummaryResult>
  <DocSum>
    <Id>12345</Id>
    <Item Name="" Type="String">empty name</Item>
    <Item Name="Title" Type="String">Good Title</Item>
  </DocSum>
</eSummaryResult>`;
      mockFetch(xmlWithBadItems);
      const client = createClient();
      const result = await client.esummary({ db: 'pubmed', id: '12345' });
      expect(result.docSums[0]!['Title']).toBe('Good Title');
    });

    it('should throw on einfo XML with neither DbList nor DbInfo', async () => {
      mockFetch('<eInfoResult></eInfoResult>');
      const client = createClient();
      await expect(client.einfo({ db: 'baddb' })).rejects.toThrow('Invalid EInfo response');
    });

    it('should throw on einfo JSON with neither dblist nor dbinfo', async () => {
      mockFetch(JSON.stringify({}));
      const client = createClient();
      await expect(client.einfo({ db: 'baddb', retmode: 'json' })).rejects.toThrow(
        'Invalid EInfo JSON',
      );
    });

    it('should parse einfo JSON with dblist', async () => {
      const dblistJson = JSON.stringify({ dblist: ['pubmed', 'pmc'] });
      mockFetch(dblistJson);
      const client = createClient();
      const result = await client.einfo({ retmode: 'json' });
      expect(result.dbList).toEqual(['pubmed', 'pmc']);
    });

    it('should skip einfo XML fields missing name or fullName', async () => {
      const xmlMissingFieldName = `<?xml version="1.0" encoding="UTF-8"?>
<eInfoResult>
  <DbInfo>
    <DbName>pubmed</DbName>
    <Description>test</Description>
    <Count>100</Count>
    <LastUpdate>2024/01/01</LastUpdate>
    <FieldList>
      <Field>
        <FullName>Missing Name Field</FullName>
      </Field>
      <Field>
        <Name>TIAB</Name>
      </Field>
      <Field>
        <Name>ALL</Name>
        <FullName>All Fields</FullName>
        <Description>All terms</Description>
        <TermCount>100</TermCount>
        <IsDate>N</IsDate>
        <IsNumerical>N</IsNumerical>
      </Field>
    </FieldList>
    <LinkList>
      <Link>
        <Name>pubmed_pubmed</Name>
      </Link>
      <Link>
        <Menu>Similar</Menu>
      </Link>
      <Link>
        <Name>pubmed_pmc</Name>
        <Menu>PMC Links</Menu>
        <Description>Links to PMC</Description>
        <DbTo>pmc</DbTo>
      </Link>
    </LinkList>
  </DbInfo>
</eInfoResult>`;
      mockFetch(xmlMissingFieldName);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed' });
      expect(result.dbInfo!.fieldList).toHaveLength(1);
      expect(result.dbInfo!.fieldList[0]!.name).toBe('ALL');
      expect(result.dbInfo!.linkList).toHaveLength(1);
      expect(result.dbInfo!.linkList[0]!.name).toBe('pubmed_pmc');
    });

    it('should parse einfo XML fields without optional boolean attributes', async () => {
      const xmlNoOptional = `<?xml version="1.0" encoding="UTF-8"?>
<eInfoResult>
  <DbInfo>
    <DbName>pubmed</DbName>
    <Description>test</Description>
    <Count>100</Count>
    <LastUpdate>2024/01/01</LastUpdate>
    <FieldList>
      <Field>
        <Name>ALL</Name>
        <FullName>All Fields</FullName>
        <Description>All terms</Description>
        <TermCount>100</TermCount>
        <IsDate>Y</IsDate>
        <IsNumerical>Y</IsNumerical>
      </Field>
    </FieldList>
    <LinkList />
  </DbInfo>
</eInfoResult>`;
      mockFetch(xmlNoOptional);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed' });
      const field = result.dbInfo!.fieldList[0]!;
      expect(field.isDate).toBe(true);
      expect(field.isNumerical).toBe(true);
      expect(field).not.toHaveProperty('isTruncatable');
      expect(field).not.toHaveProperty('isRangeable');
      expect(field).not.toHaveProperty('isHidden');
    });

    it('should parse elink XML with empty link id (skipped)', async () => {
      const xmlEmptyLinkId = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <LinkSetDb>
      <DbTo>pubmed</DbTo>
      <LinkName>pubmed_pubmed</LinkName>
      <Link><Id></Id></Link>
      <Link><Id>456</Id></Link>
    </LinkSetDb>
  </LinkSet>
</eLinkResult>`;
      mockFetch(xmlEmptyLinkId);
      const client = createClient();
      const result = await client.elink({ db: 'pubmed', dbfrom: 'pubmed', id: '123' });
      expect(result.linkSets[0]!.linkSetDbs![0]!.links).toHaveLength(1);
      expect(result.linkSets[0]!.linkSetDbs![0]!.links[0]!.id).toBe('456');
    });

    it('should parse elink XML with IdUrlList but no ObjUrl blocks', async () => {
      const xmlEmptyObjUrl = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdUrlList>
      <IdUrlSet><Id>123</Id></IdUrlSet>
    </IdUrlList>
  </LinkSet>
</eLinkResult>`;
      mockFetch(xmlEmptyObjUrl);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
      });
      expect(result.linkSets[0]!.linkOutUrls).toBeUndefined();
    });

    it('should skip elink XML ObjUrl entries without a URL', async () => {
      const xmlNoUrl = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdUrlList>
      <IdUrlSet>
        <Id>123</Id>
        <ObjUrl>
          <Provider><Name>NoUrl Provider</Name></Provider>
        </ObjUrl>
        <ObjUrl>
          <Url>https://example.com</Url>
          <Provider><Name>Good Provider</Name></Provider>
        </ObjUrl>
      </IdUrlSet>
    </IdUrlList>
  </LinkSet>
</eLinkResult>`;
      mockFetch(xmlNoUrl);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
      });
      expect(result.linkSets[0]!.linkOutUrls).toHaveLength(1);
      expect(result.linkSets[0]!.linkOutUrls![0]!.provider).toBe('Good Provider');
    });

    it('should parse elink XML IdCheckList with no matching Id elements', async () => {
      const xmlEmptyCheckList = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdCheckList>
    </IdCheckList>
  </LinkSet>
</eLinkResult>`;
      mockFetch(xmlEmptyCheckList);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'acheck',
      });
      expect(result.linkSets[0]!.idCheckResults).toBeUndefined();
    });

    it('should parse elink JSON with webenv and querykey', async () => {
      const jsonWithHistory = JSON.stringify({
        linksets: [
          {
            dbfrom: 'pubmed',
            ids: [{ value: '123' }],
            webenv: 'MCID_link_webenv',
            querykey: '1',
          },
        ],
      });
      mockFetch(jsonWithHistory);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        retmode: 'json',
      });
      expect(result.linkSets[0]!.webEnv).toBe('MCID_link_webenv');
      expect(result.linkSets[0]!.queryKey).toBe(1);
    });

    it('should parse elink JSON with score in links', async () => {
      const jsonWithScore = JSON.stringify({
        linksets: [
          {
            dbfrom: 'pubmed',
            ids: [{ id: '123' }],
            linksetdbs: [
              {
                dbto: 'pubmed',
                linkname: 'pubmed_pubmed',
                links: [{ id: { value: '456' }, score: '100' }],
              },
            ],
          },
        ],
      });
      mockFetch(jsonWithScore);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        retmode: 'json',
      });
      expect(result.linkSets[0]!.idList).toEqual(['123']);
      expect(result.linkSets[0]!.linkSetDbs![0]!.links[0]!.score).toBe(100);
    });

    it('should parse ecitmatch text with empty lines', async () => {
      const textWithBlanks = `Ann Intern Med|1998|129|103|Feigelson HS|Art1|9652966\n\n\nN Engl J Med|1990|322|1405|Smith J|Art2|\n`;
      mockFetch(textWithBlanks);
      const client = createClient();
      const result = await client.ecitmatch({ bdata: 'test' });
      expect(result.citations).toHaveLength(2);
    });

    it('should parse egquery XML skipping non-Ok entries', async () => {
      const xmlAllFailed = `<?xml version="1.0" encoding="UTF-8"?>
<Result>
  <Term>test</Term>
  <eGQueryResult>
    <ResultItem>
      <DbName>baddb</DbName>
      <MenuName>Bad DB</MenuName>
      <Count>0</Count>
      <Status>Term or Database is not found</Status>
    </ResultItem>
  </eGQueryResult>
</Result>`;
      mockFetch(xmlAllFailed);
      const client = createClient();
      const result = await client.egquery({ term: 'test' });
      expect(result.eGQueryResultItems).toHaveLength(0);
    });

    it('should handle elink XML ObjUrl without provider block', async () => {
      const xmlNoProvider = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdUrlList>
      <IdUrlSet>
        <Id>123</Id>
        <ObjUrl>
          <Url>https://example.com/article</Url>
        </ObjUrl>
      </IdUrlSet>
    </IdUrlList>
  </LinkSet>
</eLinkResult>`;
      mockFetch(xmlNoProvider);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
      });
      expect(result.linkSets[0]!.linkOutUrls![0]!.provider).toBe('');
      expect(result.linkSets[0]!.linkOutUrls![0]!.url).toBe('https://example.com/article');
    });

    it('should parse einfo JSON fields with optional boolean attributes', async () => {
      const jsonWithOptionals = JSON.stringify({
        dbinfo: {
          dbname: 'pubmed',
          description: 'test',
          count: '100',
          lastupdate: '2024/01/01',
          fieldlist: [
            {
              name: 'ALL',
              fullname: 'All Fields',
              description: 'All terms',
              termcount: '100',
              isdate: 'N',
              isnumerical: 'N',
              istruncatable: 'Y',
              israngeable: 'N',
              ishidden: 'N',
            },
          ],
          linklist: [],
        },
      });
      mockFetch(jsonWithOptionals);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed', retmode: 'json' });
      const field = result.dbInfo!.fieldList[0]!;
      expect(field.isTruncatable).toBe(true);
      expect(field.isRangeable).toBe(false);
      expect(field.isHidden).toBe(false);
    });

    it('should parse einfo XML fields with IsHidden attribute', async () => {
      const xmlWithHidden = `<?xml version="1.0" encoding="UTF-8"?>
<eInfoResult>
  <DbInfo>
    <DbName>pubmed</DbName>
    <Description>test</Description>
    <Count>100</Count>
    <LastUpdate>2024/01/01</LastUpdate>
    <FieldList>
      <Field>
        <Name>ALL</Name>
        <FullName>All Fields</FullName>
        <Description>All terms</Description>
        <TermCount>100</TermCount>
        <IsDate>N</IsDate>
        <IsNumerical>N</IsNumerical>
        <IsTruncatable>Y</IsTruncatable>
        <IsRangeable>Y</IsRangeable>
        <IsHidden>Y</IsHidden>
      </Field>
    </FieldList>
    <LinkList />
  </DbInfo>
</eInfoResult>`;
      mockFetch(xmlWithHidden);
      const client = createClient();
      const result = await client.einfo({ db: 'pubmed' });
      const field = result.dbInfo!.fieldList[0]!;
      expect(field.isHidden).toBe(true);
      expect(field.isRangeable).toBe(true);
    });

    it('should handle elink XML ObjUrl with provider but no NameAbbr', async () => {
      const xmlNoNameAbbr = `<?xml version="1.0" encoding="UTF-8"?>
<eLinkResult>
  <LinkSet>
    <DbFrom>pubmed</DbFrom>
    <IdList><Id>123</Id></IdList>
    <IdUrlList>
      <IdUrlSet>
        <Id>123</Id>
        <ObjUrl>
          <Url>https://example.com/article</Url>
          <Provider>
            <Name>Full Name Only</Name>
          </Provider>
        </ObjUrl>
      </IdUrlSet>
    </IdUrlList>
  </LinkSet>
</eLinkResult>`;
      mockFetch(xmlNoNameAbbr);
      const client = createClient();
      const result = await client.elink({
        db: 'pubmed',
        dbfrom: 'pubmed',
        id: '123',
        cmd: 'llinks',
      });
      const linkOut = result.linkSets[0]!.linkOutUrls![0]!;
      expect(linkOut.provider).toBe('Full Name Only');
      expect(linkOut.providerAbbr).toBeUndefined();
    });
  });
});
