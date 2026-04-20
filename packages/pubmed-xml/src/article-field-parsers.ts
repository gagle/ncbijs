import type {
  AbstractContent,
  AbstractSection,
  ArticleIds,
  Author,
  CommentCorrection,
  DataBank,
  Grant,
  JournalInfo,
  Keyword,
  MeshHeading,
  MeshQualifier,
  PartialDate,
} from './interfaces/pubmed-article.interface.js';
import {
  decodeEntities,
  readAllBlocks,
  readAllBlocksWithAttributes,
  readAllTags,
  readAllTagsWithAttributes,
  readBlock,
  readTag,
  readTagWithAttributes,
  stripTags,
} from '@ncbijs/xml';

const MONTH_NAMES: Readonly<Record<string, number>> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

export function monthTextToNumber(monthName: string): number | null {
  const trimmed = monthName.trim();
  const numericMonth = Number(trimmed);
  if (!Number.isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return numericMonth;
  }
  return MONTH_NAMES[trimmed.toLowerCase().slice(0, 3)] ?? null;
}

export function parseDateBlock(dateXml: string): PartialDate {
  const medlineDate = readTag(dateXml, 'MedlineDate');
  if (medlineDate !== undefined) {
    const yearMatch = /(\d{4})/.exec(medlineDate);
    const extractedYear = yearMatch?.[1] ? Number(yearMatch[1]) : 0;
    return { year: extractedYear, raw: medlineDate };
  }

  const yearText = readTag(dateXml, 'Year');
  const year = yearText ? Number(yearText) : 0;

  const season = readTag(dateXml, 'Season');
  if (season !== undefined) {
    return { year, season };
  }

  const monthText = readTag(dateXml, 'Month');
  const month = monthText ? monthTextToNumber(monthText) : null;

  const dayText = readTag(dateXml, 'Day');
  const day = dayText ? Number(dayText) : null;

  return {
    year,
    ...(month !== null ? { month } : {}),
    ...(day !== null ? { day } : {}),
  };
}

export function extractAbstract(articleXml: string): AbstractContent {
  const abstractBlock = readBlock(articleXml, 'Abstract');
  if (!abstractBlock) {
    return { structured: false, text: '' };
  }

  const abstractSections = readAllBlocksWithAttributes(abstractBlock, 'AbstractText');
  if (abstractSections.length === 0) {
    return { structured: false, text: '' };
  }

  const hasLabels = abstractSections.some((section) => section.attributes['Label'] !== undefined);

  if (!hasLabels) {
    const firstSection = abstractSections[0];
    const plainText =
      firstSection !== undefined ? stripTags(decodeEntities(firstSection.content)) : '';
    return { structured: false, text: plainText };
  }

  const sections: Array<AbstractSection> = [];
  const textParts: Array<string> = [];

  for (const section of abstractSections) {
    const label = section.attributes['Label'] ?? '';
    const nlmCategory = section.attributes['NlmCategory'];
    const sectionText = stripTags(decodeEntities(section.content));
    sections.push({
      label,
      ...(nlmCategory !== undefined ? { nlmCategory } : {}),
      text: sectionText,
    });
    textParts.push(sectionText);
  }

  return {
    structured: true,
    text: textParts.join(' '),
    sections,
  };
}

export function extractAuthors(articleXml: string): ReadonlyArray<Author> {
  const authorListBlock = readBlock(articleXml, 'AuthorList');
  if (!authorListBlock) {
    return [];
  }

  const authorBlocks = readAllBlocks(authorListBlock, 'Author');
  const authors: Array<Author> = [];

  for (const authorBlock of authorBlocks) {
    const collectiveName = readTag(authorBlock, 'CollectiveName');
    if (collectiveName !== undefined) {
      authors.push({ collectiveName, affiliations: [] });
      continue;
    }

    const lastName = readTag(authorBlock, 'LastName');
    const foreName = readTag(authorBlock, 'ForeName');
    const initials = readTag(authorBlock, 'Initials');

    const affiliationBlocks = readAllBlocks(authorBlock, 'AffiliationInfo');
    const affiliations: Array<string> = [];
    for (const affBlock of affiliationBlocks) {
      const affText = readTag(affBlock, 'Affiliation');
      if (affText !== undefined) {
        affiliations.push(affText);
      }
    }

    authors.push({
      ...(lastName !== undefined ? { lastName } : {}),
      ...(foreName !== undefined ? { foreName } : {}),
      ...(initials !== undefined ? { initials } : {}),
      affiliations,
    });
  }

  return authors;
}

export function extractJournal(articleXml: string): JournalInfo {
  const journalBlock = readBlock(articleXml, 'Journal');
  if (!journalBlock) {
    return { title: '', isoAbbrev: '' };
  }

  const title = readTag(journalBlock, 'Title') ?? '';
  const isoAbbrev = readTag(journalBlock, 'ISOAbbreviation') ?? '';
  const issn = readTag(journalBlock, 'ISSN');

  const journalIssueBlock = readBlock(journalBlock, 'JournalIssue');
  const volume = journalIssueBlock ? readTag(journalIssueBlock, 'Volume') : undefined;
  const issue = journalIssueBlock ? readTag(journalIssueBlock, 'Issue') : undefined;

  return {
    title,
    isoAbbrev,
    ...(issn !== undefined ? { issn } : {}),
    ...(volume !== undefined ? { volume } : {}),
    ...(issue !== undefined ? { issue } : {}),
  };
}

export function extractPublicationDate(articleXml: string): PartialDate {
  const journalBlock = readBlock(articleXml, 'Journal');
  if (!journalBlock) {
    return { year: 0 };
  }

  const journalIssueBlock = readBlock(journalBlock, 'JournalIssue');
  if (!journalIssueBlock) {
    return { year: 0 };
  }

  const pubDateBlock = readBlock(journalIssueBlock, 'PubDate');
  if (!pubDateBlock) {
    return { year: 0 };
  }

  return parseDateBlock(pubDateBlock);
}

export function extractMeshHeadings(citationXml: string): ReadonlyArray<MeshHeading> {
  const meshListBlock = readBlock(citationXml, 'MeshHeadingList');
  if (!meshListBlock) {
    return [];
  }

  const headingBlocks = readAllBlocks(meshListBlock, 'MeshHeading');
  const headings: Array<MeshHeading> = [];

  for (const headingBlock of headingBlocks) {
    const descriptor = readTagWithAttributes(headingBlock, 'DescriptorName');
    if (!descriptor) {
      continue;
    }

    const qualifierEntries = readAllTagsWithAttributes(headingBlock, 'QualifierName');
    const qualifiers: Array<MeshQualifier> = qualifierEntries.map((qualifier) => ({
      name: qualifier.text,
      ui: qualifier.attributes['UI'] ?? '',
      majorTopic: qualifier.attributes['MajorTopicYN'] === 'Y',
    }));

    headings.push({
      descriptor: descriptor.text,
      descriptorUI: descriptor.attributes['UI'] ?? '',
      majorTopic: descriptor.attributes['MajorTopicYN'] === 'Y',
      qualifiers,
    });
  }

  return headings;
}

export function extractArticleIds(
  pubmedDataXml: string,
  pmid: string,
  articleXml?: string,
): ArticleIds {
  if (!pubmedDataXml) {
    return { pmid };
  }

  const idListBlock = readBlock(pubmedDataXml, 'ArticleIdList');
  if (!idListBlock) {
    return { pmid };
  }

  const idEntries = readAllTagsWithAttributes(idListBlock, 'ArticleId');
  let doi: string | undefined;
  let pmc: string | undefined;
  let pii: string | undefined;
  let mid: string | undefined;

  for (const idEntry of idEntries) {
    const idType = idEntry.attributes['IdType'];
    switch (idType) {
      case 'doi':
        doi = idEntry.text;
        break;
      case 'pmc':
        pmc = idEntry.text;
        break;
      case 'pii':
        pii = idEntry.text;
        break;
      case 'mid':
        mid = idEntry.text;
        break;
    }
  }

  if (doi === undefined && articleXml) {
    const eLocationEntries = readAllTagsWithAttributes(articleXml, 'ELocationID');
    for (const entry of eLocationEntries) {
      if (entry.attributes['EIdType'] === 'doi' && entry.text) {
        doi = entry.text;
        break;
      }
    }
  }

  return {
    pmid,
    ...(doi !== undefined ? { doi } : {}),
    ...(pmc !== undefined ? { pmc } : {}),
    ...(pii !== undefined ? { pii } : {}),
    ...(mid !== undefined ? { mid } : {}),
  };
}

export function extractGrants(articleXml: string): ReadonlyArray<Grant> {
  const grantListBlock = readBlock(articleXml, 'GrantList');
  if (!grantListBlock) {
    return [];
  }

  const grantBlocks = readAllBlocks(grantListBlock, 'Grant');
  const grants: Array<Grant> = [];

  for (const grantBlock of grantBlocks) {
    const grantId = readTag(grantBlock, 'GrantID') ?? '';
    const acronym = readTag(grantBlock, 'Acronym');
    const agency = readTag(grantBlock, 'Agency') ?? '';
    const country = readTag(grantBlock, 'Country') ?? '';

    grants.push({
      grantId,
      ...(acronym !== undefined ? { acronym } : {}),
      agency,
      country,
    });
  }

  return grants;
}

export function extractKeywords(citationXml: string): ReadonlyArray<Keyword> {
  const keywordLists = readAllBlocksWithAttributes(citationXml, 'KeywordList');
  if (keywordLists.length === 0) {
    return [];
  }

  const keywords: Array<Keyword> = [];

  for (const keywordList of keywordLists) {
    const owner = keywordList.attributes['Owner'] === 'NLM' ? 'NLM' : 'NOTNLM';
    const keywordEntries = readAllTagsWithAttributes(keywordList.content, 'Keyword');

    for (const keywordEntry of keywordEntries) {
      keywords.push({
        text: keywordEntry.text,
        majorTopic: keywordEntry.attributes['MajorTopicYN'] === 'Y',
        owner,
      });
    }
  }

  return keywords;
}

export function extractCommentsCorrections(citationXml: string): ReadonlyArray<CommentCorrection> {
  const listBlock = readBlock(citationXml, 'CommentsCorrectionsList');
  if (!listBlock) {
    return [];
  }

  const correctionBlocks = readAllBlocksWithAttributes(listBlock, 'CommentsCorrections');
  const corrections: Array<CommentCorrection> = [];

  for (const correctionBlock of correctionBlocks) {
    const refType = correctionBlock.attributes['RefType'] ?? '';
    const refSource = readTag(correctionBlock.content, 'RefSource') ?? '';
    const correctionPmid = readTag(correctionBlock.content, 'PMID');

    corrections.push({
      refType,
      refSource,
      ...(correctionPmid !== undefined ? { pmid: correctionPmid } : {}),
    });
  }

  return corrections;
}

export function extractDataBanks(articleXml: string): ReadonlyArray<DataBank> {
  const dataBankListBlock = readBlock(articleXml, 'DataBankList');
  if (!dataBankListBlock) {
    return [];
  }

  const dataBankBlocks = readAllBlocks(dataBankListBlock, 'DataBank');
  const dataBanks: Array<DataBank> = [];

  for (const dataBankBlock of dataBankBlocks) {
    const name = readTag(dataBankBlock, 'DataBankName') ?? '';
    const accessionListBlock = readBlock(dataBankBlock, 'AccessionNumberList');
    const accessionNumbers = accessionListBlock
      ? readAllTags(accessionListBlock, 'AccessionNumber')
      : [];

    dataBanks.push({ name, accessionNumbers });
  }

  return dataBanks;
}

export function extractPublicationTypes(articleXml: string): ReadonlyArray<string> {
  const pubTypeListBlock = readBlock(articleXml, 'PublicationTypeList');
  if (!pubTypeListBlock) {
    return [];
  }

  return readAllTags(pubTypeListBlock, 'PublicationType');
}
