import { describe, expect, it } from 'vitest';
import { parseECitMatchText } from './ecitmatch-parser';
import { parseEGQueryXml } from './egquery-parser';
import { parseEInfoJson, parseEInfoXml } from './einfo-parser';
import { parseELinkJson, parseELinkXml } from './elink-parser';
import { parseEPostXml } from './epost-parser';
import { parseESearchJson, parseESearchXml } from './esearch-parser';
import { parseESpellXml } from './espell-parser';
import { parseESummaryJson, parseESummaryXml } from './esummary-parser';

describe('parseECitMatchText', () => {
  it('should skip empty lines in input', () => {
    const text = `\n\nAnn Intern Med|1998|129|103|Feigelson HS|Art1|9652966\n\n`;
    const result = parseECitMatchText(text);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.pmid).toBe('9652966');
  });

  it('should handle minimal pipe-separated line with fewer fields', () => {
    const text = `journal|year`;
    const result = parseECitMatchText(text);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.journal).toBe('journal');
    expect(result.citations[0]!.year).toBe('year');
    expect(result.citations[0]!.volume).toBe('');
    expect(result.citations[0]!.firstPage).toBe('');
    expect(result.citations[0]!.authorName).toBe('');
    expect(result.citations[0]!.key).toBe('');
    expect(result.citations[0]!.pmid).toBeUndefined();
  });

  it('should handle line with no pipe separators', () => {
    const text = `singlevalue`;
    const result = parseECitMatchText(text);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]!.journal).toBe('singlevalue');
  });

  it('should handle empty input', () => {
    const result = parseECitMatchText('');
    expect(result.citations).toHaveLength(0);
  });

  it('should handle carriage return line endings', () => {
    const text = `J1|2020|1|1|Auth|K1|111\rJ2|2021|2|2|Auth2|K2|222\r`;
    const result = parseECitMatchText(text);
    expect(result.citations).toHaveLength(2);
  });
});

describe('parseEGQueryXml', () => {
  it('should return empty term when Term tag is missing', () => {
    const xml = `<Result><eGQueryResult></eGQueryResult></Result>`;
    const result = parseEGQueryXml(xml);
    expect(result.term).toBe('');
    expect(result.eGQueryResultItems).toHaveLength(0);
  });

  it('should skip items with non-Ok status', () => {
    const xml = `<Result>
      <Term>test</Term>
      <eGQueryResult>
        <ResultItem>
          <DbName>baddb</DbName>
          <Count>0</Count>
          <Status>Error</Status>
        </ResultItem>
      </eGQueryResult>
    </Result>`;
    const result = parseEGQueryXml(xml);
    expect(result.eGQueryResultItems).toHaveLength(0);
  });

  it('should skip items missing DbName', () => {
    const xml = `<Result>
      <Term>test</Term>
      <eGQueryResult>
        <ResultItem>
          <Count>100</Count>
          <Status>Ok</Status>
        </ResultItem>
      </eGQueryResult>
    </Result>`;
    const result = parseEGQueryXml(xml);
    expect(result.eGQueryResultItems).toHaveLength(0);
  });

  it('should skip items missing Count', () => {
    const xml = `<Result>
      <Term>test</Term>
      <eGQueryResult>
        <ResultItem>
          <DbName>pubmed</DbName>
          <Status>Ok</Status>
        </ResultItem>
      </eGQueryResult>
    </Result>`;
    const result = parseEGQueryXml(xml);
    expect(result.eGQueryResultItems).toHaveLength(0);
  });
});

describe('parseEInfoXml', () => {
  it('should throw when neither DbList nor DbInfo is present', () => {
    expect(() => parseEInfoXml('<eInfoResult></eInfoResult>')).toThrow('Invalid EInfo response');
  });

  it('should skip fields missing Name tag', () => {
    const xml = `<eInfoResult><DbInfo>
      <DbName>test</DbName><Description>d</Description><Count>1</Count><LastUpdate>now</LastUpdate>
      <FieldList>
        <Field><FullName>No Name</FullName></Field>
        <Field><Name>GOOD</Name><FullName>Good</FullName></Field>
      </FieldList>
      <LinkList />
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    expect(result.dbInfo!.fieldList).toHaveLength(1);
    expect(result.dbInfo!.fieldList[0]!.name).toBe('GOOD');
  });

  it('should skip fields missing FullName tag', () => {
    const xml = `<eInfoResult><DbInfo>
      <DbName>test</DbName><Description>d</Description><Count>1</Count><LastUpdate>now</LastUpdate>
      <FieldList>
        <Field><Name>NONAME</Name></Field>
      </FieldList>
      <LinkList />
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    expect(result.dbInfo!.fieldList).toHaveLength(0);
  });

  it('should skip links missing Name tag', () => {
    const xml = `<eInfoResult><DbInfo>
      <DbName>test</DbName><Description>d</Description><Count>1</Count><LastUpdate>now</LastUpdate>
      <FieldList />
      <LinkList>
        <Link><Menu>NoName</Menu></Link>
      </LinkList>
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    expect(result.dbInfo!.linkList).toHaveLength(0);
  });

  it('should skip links missing Menu tag', () => {
    const xml = `<eInfoResult><DbInfo>
      <DbName>test</DbName><Description>d</Description><Count>1</Count><LastUpdate>now</LastUpdate>
      <FieldList />
      <LinkList>
        <Link><Name>link1</Name></Link>
      </LinkList>
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    expect(result.dbInfo!.linkList).toHaveLength(0);
  });

  it('should parse fields without optional boolean attributes', () => {
    const xml = `<eInfoResult><DbInfo>
      <DbName>test</DbName><Description>d</Description><Count>1</Count><LastUpdate>now</LastUpdate>
      <FieldList>
        <Field>
          <Name>ALL</Name><FullName>All</FullName><Description>d</Description>
          <TermCount>0</TermCount><IsDate>N</IsDate><IsNumerical>N</IsNumerical>
        </Field>
      </FieldList>
      <LinkList />
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    const field = result.dbInfo!.fieldList[0]!;
    expect(field).not.toHaveProperty('isTruncatable');
    expect(field).not.toHaveProperty('isRangeable');
    expect(field).not.toHaveProperty('isHidden');
  });

  it('should use default values for missing optional Description and TermCount', () => {
    const xml = `<eInfoResult><DbInfo>
      <DbName>test</DbName><Description>d</Description><Count>1</Count><LastUpdate>now</LastUpdate>
      <FieldList>
        <Field>
          <Name>ALL</Name><FullName>All</FullName>
          <IsDate>N</IsDate><IsNumerical>N</IsNumerical>
        </Field>
      </FieldList>
      <LinkList>
        <Link>
          <Name>link1</Name><Menu>L1</Menu>
        </Link>
      </LinkList>
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    const field = result.dbInfo!.fieldList[0]!;
    expect(field.description).toBe('');
    expect(field.termCount).toBe(0);
    const link = result.dbInfo!.linkList[0]!;
    expect(link.description).toBe('');
    expect(link.dbTo).toBe('');
  });

  it('should use default values for missing DbName, Description, Count, LastUpdate', () => {
    const xml = `<eInfoResult><DbInfo>
      <FieldList />
      <LinkList />
    </DbInfo></eInfoResult>`;
    const result = parseEInfoXml(xml);
    expect(result.dbInfo!.dbName).toBe('');
    expect(result.dbInfo!.description).toBe('');
    expect(result.dbInfo!.count).toBe(0);
    expect(result.dbInfo!.lastUpdate).toBe('');
  });
});

describe('parseEInfoJson', () => {
  it('should throw when neither dblist nor dbinfo is present', () => {
    expect(() => parseEInfoJson('{}')).toThrow('Invalid EInfo JSON');
  });

  it('should parse dblist format', () => {
    const result = parseEInfoJson(JSON.stringify({ dblist: ['pubmed', 'pmc'] }));
    expect(result.dbList).toEqual(['pubmed', 'pmc']);
  });

  it('should handle empty fieldlist and linklist in JSON', () => {
    const json = JSON.stringify({
      dbinfo: {
        dbname: 'test',
        description: 'd',
        count: '1',
        lastupdate: 'now',
      },
    });
    const result = parseEInfoJson(json);
    expect(result.dbInfo!.fieldList).toHaveLength(0);
    expect(result.dbInfo!.linkList).toHaveLength(0);
  });

  it('should use default values for missing JSON field properties', () => {
    const json = JSON.stringify({
      dbinfo: {
        fieldlist: [{}],
        linklist: [{}],
      },
    });
    const result = parseEInfoJson(json);
    const field = result.dbInfo!.fieldList[0]!;
    expect(field.name).toBe('');
    expect(field.fullName).toBe('');
    expect(field.description).toBe('');
    expect(field.termCount).toBe(0);
    expect(field.isDate).toBe(false);
    expect(field.isNumerical).toBe(false);
    const link = result.dbInfo!.linkList[0]!;
    expect(link.name).toBe('');
    expect(link.menu).toBe('');
  });

  it('should parse JSON fields without optional boolean attributes', () => {
    const json = JSON.stringify({
      dbinfo: {
        fieldlist: [{ name: 'ALL', fullname: 'All', isdate: 'N', isnumerical: 'N' }],
        linklist: [],
      },
    });
    const result = parseEInfoJson(json);
    const field = result.dbInfo!.fieldList[0]!;
    expect(field).not.toHaveProperty('isTruncatable');
    expect(field).not.toHaveProperty('isRangeable');
    expect(field).not.toHaveProperty('isHidden');
  });

  it('should use default values for missing dbinfo string properties', () => {
    const json = JSON.stringify({ dbinfo: {} });
    const result = parseEInfoJson(json);
    expect(result.dbInfo!.dbName).toBe('');
    expect(result.dbInfo!.description).toBe('');
    expect(result.dbInfo!.count).toBe(0);
    expect(result.dbInfo!.lastUpdate).toBe('');
  });
});

describe('parseELinkXml', () => {
  it('should return empty linkSets for empty eLinkResult', () => {
    const result = parseELinkXml('<eLinkResult></eLinkResult>');
    expect(result.linkSets).toHaveLength(0);
  });

  it('should handle LinkSet without IdList', () => {
    const xml = `<eLinkResult>
      <LinkSet><DbFrom>pubmed</DbFrom></LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    expect(result.linkSets[0]!.idList).toEqual([]);
  });

  it('should skip Link blocks with empty Id', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <LinkSetDb>
          <DbTo>pubmed</DbTo><LinkName>test</LinkName>
          <Link><Id></Id></Link>
          <Link><Id>456</Id><Score>50</Score></Link>
        </LinkSetDb>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    const links = result.linkSets[0]!.linkSetDbs![0]!.links;
    expect(links).toHaveLength(1);
    expect(links[0]!.id).toBe('456');
    expect(links[0]!.score).toBe(50);
  });

  it('should handle empty IdCheckList', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <IdCheckList></IdCheckList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    expect(result.linkSets[0]!.idCheckResults).toBeUndefined();
  });

  it('should skip ObjUrl entries without a Url tag', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <IdUrlList>
          <IdUrlSet>
            <ObjUrl><Provider><Name>P</Name></Provider></ObjUrl>
          </IdUrlSet>
        </IdUrlList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    expect(result.linkSets[0]!.linkOutUrls).toEqual([]);
  });

  it('should handle IdUrlList with no ObjUrl blocks', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <IdUrlList><IdUrlSet><Id>1</Id></IdUrlSet></IdUrlList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    expect(result.linkSets[0]!.linkOutUrls).toBeUndefined();
  });

  it('should handle ObjUrl without provider', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <IdUrlList>
          <IdUrlSet>
            <ObjUrl>
              <Url>https://example.com</Url>
            </ObjUrl>
          </IdUrlSet>
        </IdUrlList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    const url = result.linkSets[0]!.linkOutUrls![0]!;
    expect(url.provider).toBe('');
    expect(url.providerAbbr).toBeUndefined();
    expect(url.iconUrl).toBeUndefined();
    expect(url.subjectType).toBeUndefined();
  });

  it('should handle IdCheckResult without HasLinkOut or HasNeighbor', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <IdCheckList>
          <Id >123</Id>
        </IdCheckList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    const check = result.linkSets[0]!.idCheckResults![0]!;
    expect(check.id).toBe('123');
    expect(check.hasLinkOut).toBeUndefined();
    expect(check.hasNeighbor).toBeUndefined();
  });

  it('should use default DbTo and LinkName when missing', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <LinkSetDb>
          <Link><Id>456</Id></Link>
        </LinkSetDb>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    const db = result.linkSets[0]!.linkSetDbs![0]!;
    expect(db.dbTo).toBe('');
    expect(db.linkName).toBe('');
    expect(db.links).toHaveLength(1);
  });

  it('should use default DbFrom when missing', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <IdList><Id>1</Id></IdList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    expect(result.linkSets[0]!.dbFrom).toBe('');
  });

  it('should handle ObjUrl with Provider missing Name tag', () => {
    const xml = `<eLinkResult>
      <LinkSet>
        <DbFrom>pubmed</DbFrom>
        <IdList><Id>1</Id></IdList>
        <IdUrlList>
          <IdUrlSet>
            <ObjUrl>
              <Url>https://example.com</Url>
              <Provider><NameAbbr>EP</NameAbbr></Provider>
            </ObjUrl>
          </IdUrlSet>
        </IdUrlList>
      </LinkSet>
    </eLinkResult>`;
    const result = parseELinkXml(xml);
    const url = result.linkSets[0]!.linkOutUrls![0]!;
    expect(url.provider).toBe('');
    expect(url.providerAbbr).toBe('EP');
  });
});

describe('parseELinkJson', () => {
  it('should handle empty linksets', () => {
    const result = parseELinkJson(JSON.stringify({}));
    expect(result.linkSets).toHaveLength(0);
  });

  it('should handle linkset without linksetdbs', () => {
    const json = JSON.stringify({
      linksets: [{ dbfrom: 'pubmed', ids: [{ value: '1' }] }],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.linkSetDbs).toBeUndefined();
  });

  it('should use id field when value is missing', () => {
    const json = JSON.stringify({
      linksets: [{ dbfrom: 'pubmed', ids: [{ id: '123' }] }],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.idList).toEqual(['123']);
  });

  it('should handle empty ids and linksetdbs arrays', () => {
    const json = JSON.stringify({
      linksets: [{ dbfrom: 'pubmed' }],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.idList).toEqual([]);
  });

  it('should fall back to empty string when id has neither value nor id', () => {
    const json = JSON.stringify({
      linksets: [{ dbfrom: 'pubmed', ids: [{}] }],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.idList).toEqual(['']);
  });

  it('should handle linksetdb links with missing id value', () => {
    const json = JSON.stringify({
      linksets: [
        {
          dbfrom: 'pubmed',
          ids: [],
          linksetdbs: [
            {
              dbto: 'pubmed',
              linkname: 'test',
              links: [{ id: {} }],
            },
          ],
        },
      ],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.linkSetDbs![0]!.links[0]!.id).toBe('');
  });

  it('should include webenv and querykey when present', () => {
    const json = JSON.stringify({
      linksets: [{ dbfrom: 'pubmed', ids: [], webenv: 'WEB1', querykey: '2' }],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.webEnv).toBe('WEB1');
    expect(result.linkSets[0]!.queryKey).toBe(2);
  });

  it('should handle link scores', () => {
    const json = JSON.stringify({
      linksets: [
        {
          dbfrom: 'pubmed',
          ids: [],
          linksetdbs: [
            {
              dbto: 'pubmed',
              linkname: 'test',
              links: [{ id: { value: '1' }, score: '999' }],
            },
          ],
        },
      ],
    });
    const result = parseELinkJson(json);
    expect(result.linkSets[0]!.linkSetDbs![0]!.links[0]!.score).toBe(999);
  });

  it('should use defaults for missing linksetdb properties', () => {
    const json = JSON.stringify({
      linksets: [
        {
          dbfrom: 'pubmed',
          ids: [],
          linksetdbs: [{}],
        },
      ],
    });
    const result = parseELinkJson(json);
    const db = result.linkSets[0]!.linkSetDbs![0]!;
    expect(db.dbTo).toBe('');
    expect(db.linkName).toBe('');
    expect(db.links).toHaveLength(0);
  });
});

describe('parseEPostXml', () => {
  it('should throw on missing WebEnv', () => {
    expect(() => parseEPostXml('<ePostResult><QueryKey>1</QueryKey></ePostResult>')).toThrow(
      'Invalid EPost response',
    );
  });

  it('should throw on missing QueryKey', () => {
    expect(() => parseEPostXml('<ePostResult><WebEnv>MCID_test</WebEnv></ePostResult>')).toThrow(
      'Invalid EPost response',
    );
  });
});

describe('parseESearchXml', () => {
  it('should return defaults for minimal XML', () => {
    const result = parseESearchXml('<eSearchResult></eSearchResult>');
    expect(result.count).toBe(0);
    expect(result.retMax).toBe(0);
    expect(result.retStart).toBe(0);
    expect(result.idList).toEqual([]);
    expect(result.queryTranslation).toBe('');
    expect(result.translationSet).toEqual([]);
  });

  it('should parse errorList with FieldNotFound', () => {
    const xml = `<eSearchResult>
      <ErrorList><FieldNotFound>badfield</FieldNotFound></ErrorList>
    </eSearchResult>`;
    const result = parseESearchXml(xml);
    expect(result.errorList).toEqual(['badfield']);
  });

  it('should skip translations with missing From or To', () => {
    const xml = `<eSearchResult>
      <TranslationSet>
        <Translation><From>term</From></Translation>
        <Translation><To>translated</To></Translation>
        <Translation><From>good</From><To>good trans</To></Translation>
      </TranslationSet>
    </eSearchResult>`;
    const result = parseESearchXml(xml);
    expect(result.translationSet).toHaveLength(1);
    expect(result.translationSet[0]!.from).toBe('good');
  });
});

describe('parseESearchJson', () => {
  it('should throw on missing esearchresult', () => {
    expect(() => parseESearchJson('{}')).toThrow('Invalid ESearch JSON');
  });

  it('should parse with minimal esearchresult', () => {
    const result = parseESearchJson(JSON.stringify({ esearchresult: {} }));
    expect(result.count).toBe(0);
    expect(result.idList).toEqual([]);
    expect(result.translationSet).toEqual([]);
    expect(result.queryTranslation).toBe('');
  });

  it('should parse webenv and querykey', () => {
    const json = JSON.stringify({
      esearchresult: { webenv: 'WEB', querykey: '5' },
    });
    const result = parseESearchJson(json);
    expect(result.webEnv).toBe('WEB');
    expect(result.queryKey).toBe(5);
  });

  it('should parse errorlist with fieldnotfound', () => {
    const json = JSON.stringify({
      esearchresult: { errorlist: { fieldnotfound: ['bad'] } },
    });
    const result = parseESearchJson(json);
    expect(result.errorList).toEqual(['bad']);
  });

  it('should omit errorList when fieldnotfound is empty', () => {
    const json = JSON.stringify({
      esearchresult: { errorlist: { fieldnotfound: [] } },
    });
    const result = parseESearchJson(json);
    expect(result.errorList).toBeUndefined();
  });
});

describe('parseESpellXml', () => {
  it('should return defaults for minimal XML', () => {
    const result = parseESpellXml('<eSpellResult></eSpellResult>');
    expect(result.query).toBe('');
    expect(result.correctedQuery).toBe('');
    expect(result.spelledQuery).toBe('');
  });

  it('should handle SpelledQuery with nested tags', () => {
    const xml = `<eSpellResult>
      <Query>asthmaa</Query>
      <CorrectedQuery>asthma</CorrectedQuery>
      <SpelledQuery><Replaced>asthma</Replaced> treatment</SpelledQuery>
    </eSpellResult>`;
    const result = parseESpellXml(xml);
    expect(result.spelledQuery).toContain('asthma');
    expect(result.spelledQuery).toContain('treatment');
  });

  it('should handle missing SpelledQuery block', () => {
    const xml = `<eSpellResult>
      <Query>test</Query>
      <CorrectedQuery>test2</CorrectedQuery>
    </eSpellResult>`;
    const result = parseESpellXml(xml);
    expect(result.spelledQuery).toBe('');
  });
});

describe('parseESummaryXml', () => {
  it('should handle empty eSummaryResult', () => {
    const result = parseESummaryXml('<eSummaryResult></eSummaryResult>');
    expect(result.docSums).toHaveLength(0);
    expect(result.uid).toBe('');
  });

  it('should skip items with empty name', () => {
    const xml = `<eSummaryResult>
      <DocSum>
        <Id>1</Id>
        <Item Name="" Type="String">value</Item>
        <Item Name="Title" Type="String">Good</Item>
      </DocSum>
    </eSummaryResult>`;
    const result = parseESummaryXml(xml);
    expect(result.docSums[0]!['Title']).toBe('Good');
  });

  it('should parse List type items', () => {
    const xml = `<eSummaryResult>
  <DocSum>
    <Id>1</Id>
    <Item Name="AuthorList" Type="List">
      <Item Name="Author" Type="String">Smith J</Item>
      <Item Name="Author" Type="String">Doe A</Item>
    </Item>
  </DocSum>
</eSummaryResult>`;
    const result = parseESummaryXml(xml);
    expect(result.docSums[0]).toBeDefined();
    expect(result.docSums[0]!.uid).toBe('1');
  });

  it('should handle multiple DocSums', () => {
    const xml = `<eSummaryResult>
      <DocSum><Id>1</Id></DocSum>
      <DocSum><Id>2</Id></DocSum>
    </eSummaryResult>`;
    const result = parseESummaryXml(xml);
    expect(result.docSums).toHaveLength(2);
    expect(result.uid).toBe('1');
  });
});

describe('parseESummaryJson', () => {
  it('should throw on missing result key', () => {
    expect(() => parseESummaryJson('{}')).toThrow('Invalid ESummary JSON');
  });

  it('should handle result without uids key', () => {
    const result = parseESummaryJson(JSON.stringify({ result: {} }));
    expect(result.docSums).toHaveLength(0);
    expect(result.uid).toBe('');
  });

  it('should skip non-object uid records', () => {
    const json = JSON.stringify({
      result: { uids: ['1'], '1': 'not-an-object' },
    });
    const result = parseESummaryJson(json);
    expect(result.docSums).toHaveLength(0);
  });

  it('should skip null uid records', () => {
    const json = JSON.stringify({
      result: { uids: ['1'], '1': null },
    });
    const result = parseESummaryJson(json);
    expect(result.docSums).toHaveLength(0);
  });

  it('should parse valid uid records', () => {
    const json = JSON.stringify({
      result: {
        uids: ['1', '2'],
        '1': { title: 'Article 1' },
        '2': { title: 'Article 2' },
      },
    });
    const result = parseESummaryJson(json);
    expect(result.docSums).toHaveLength(2);
    expect(result.uid).toBe('1');
  });
});
