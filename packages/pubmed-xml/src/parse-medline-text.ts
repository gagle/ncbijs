import type {
  ArticleIds,
  Author,
  Grant,
  Keyword,
  MeshHeading,
  MeshQualifier,
  PartialDate,
  PubmedArticle,
} from './interfaces/pubmed-article.interface';
import { monthTextToNumber } from './article-field-parsers';

type MedlineTagMap = Map<string, Array<string>>;

const TAG_LINE_REGEX = /^([A-Z]{2,4})\s*-\s(.*)$/;

export function parseMedlineText(text: string): ReadonlyArray<PubmedArticle> {
  if (!text.trim()) {
    return [];
  }

  const recordTexts = text.split(/\n\s*\n/).filter((record) => record.trim().length > 0);
  return recordTexts.map((recordText) => {
    const medlineTagMap = parseRecordToTagMap(recordText);
    return convertMedlineTagsToArticle(medlineTagMap);
  });
}

function parseRecordToTagMap(recordText: string): MedlineTagMap {
  const medlineTagMap: MedlineTagMap = new Map();
  let currentTag = '';

  for (const line of recordText.split('\n')) {
    const tagMatch = TAG_LINE_REGEX.exec(line);
    if (tagMatch) {
      currentTag = tagMatch[1] ?? '';
      const tagValue = tagMatch[2] ?? '';
      const existingValues = medlineTagMap.get(currentTag);
      if (existingValues) {
        existingValues.push(tagValue);
      } else {
        medlineTagMap.set(currentTag, [tagValue]);
      }
    } else if (currentTag && /^\s{4,}/.test(line)) {
      const existingValues = medlineTagMap.get(currentTag);
      if (existingValues) {
        existingValues[existingValues.length - 1] += ' ' + line.trim();
      }
    }
  }

  return medlineTagMap;
}

function getFirstTagValue(medlineTagMap: MedlineTagMap, tag: string): string {
  return medlineTagMap.get(tag)?.[0] ?? '';
}

function getAllTagValues(medlineTagMap: MedlineTagMap, tag: string): ReadonlyArray<string> {
  return medlineTagMap.get(tag) ?? [];
}

function convertMedlineTagsToArticle(medlineTagMap: MedlineTagMap): PubmedArticle {
  const pmid = getFirstTagValue(medlineTagMap, 'PMID').trim();
  const title = getFirstTagValue(medlineTagMap, 'TI');
  const abstractText = getFirstTagValue(medlineTagMap, 'AB');
  const language = getFirstTagValue(medlineTagMap, 'LA');

  return {
    pmid,
    title,
    abstract: { structured: false, text: abstractText },
    authors: parseAuthorsFromMedline(medlineTagMap),
    journal: {
      title: getFirstTagValue(medlineTagMap, 'JT'),
      isoAbbrev: getFirstTagValue(medlineTagMap, 'TA'),
      ...(medlineTagMap.has('IS') ? { issn: getFirstTagValue(medlineTagMap, 'IS') } : {}),
      ...(medlineTagMap.has('VI') ? { volume: getFirstTagValue(medlineTagMap, 'VI') } : {}),
      ...(medlineTagMap.has('IP') ? { issue: getFirstTagValue(medlineTagMap, 'IP') } : {}),
    },
    publicationDate: parseDateFromMedline(getFirstTagValue(medlineTagMap, 'DP')),
    mesh: getAllTagValues(medlineTagMap, 'MH').map(parseSingleMeshEntry),
    articleIds: parseArticleIdsFromMedline(pmid, getAllTagValues(medlineTagMap, 'AID')),
    publicationTypes: getAllTagValues(medlineTagMap, 'PT'),
    grants: parseGrantsFromMedline(getAllTagValues(medlineTagMap, 'GR')),
    keywords: parseKeywordsFromMedline(getAllTagValues(medlineTagMap, 'OT')),
    commentsCorrections: [],
    dataBanks: [],
    language,
  };
}

function parseAuthorsFromMedline(medlineTagMap: MedlineTagMap): ReadonlyArray<Author> {
  const fullAuthorNames = getAllTagValues(medlineTagMap, 'FAU');
  if (fullAuthorNames.length > 0) {
    return fullAuthorNames.map(parseFullAuthorName);
  }

  const shortAuthorNames = getAllTagValues(medlineTagMap, 'AU');
  return shortAuthorNames.map(parseShortAuthorName);
}

function parseFullAuthorName(fullAuthorName: string): Author {
  const commaIndex = fullAuthorName.indexOf(',');
  if (commaIndex === -1) {
    return { lastName: fullAuthorName.trim() };
  }

  const lastName = fullAuthorName.slice(0, commaIndex).trim();
  const foreName = fullAuthorName.slice(commaIndex + 1).trim();
  return { lastName, foreName };
}

function parseShortAuthorName(shortAuthorName: string): Author {
  const lastSpaceIndex = shortAuthorName.lastIndexOf(' ');
  if (lastSpaceIndex === -1) {
    return { lastName: shortAuthorName.trim() };
  }

  const lastName = shortAuthorName.slice(0, lastSpaceIndex).trim();
  const initials = shortAuthorName.slice(lastSpaceIndex + 1).trim();
  return { lastName, initials };
}

function parseDateFromMedline(dateString: string): PartialDate {
  if (!dateString) {
    return { year: 0 };
  }

  const parts = dateString.split(/\s+/);
  const yearText = parts[0];
  const year = yearText ? Number(yearText) : 0;

  if (parts.length === 1) {
    return { year };
  }

  const monthPart = parts[1];
  if (!monthPart) {
    return { year };
  }

  const month = monthTextToNumber(monthPart);
  if (month === null) {
    return { year, season: monthPart };
  }

  const dayPart = parts[2];
  const day = dayPart ? Number(dayPart) : null;

  return {
    year,
    month,
    ...(day !== null && !Number.isNaN(day) ? { day } : {}),
  };
}

function parseSingleMeshEntry(meshEntry: string): MeshHeading {
  const parts = meshEntry.split('/');
  const rawDescriptor = (parts[0] ?? '').trim();
  const descriptorMajor = rawDescriptor.endsWith('*');
  const descriptor = descriptorMajor ? rawDescriptor.slice(0, -1) : rawDescriptor;

  const qualifiers: Array<MeshQualifier> = [];
  for (let partIndex = 1; partIndex < parts.length; partIndex++) {
    const rawQualifier = (parts[partIndex] ?? '').trim();
    const qualifierMajor = rawQualifier.endsWith('*');
    const qualifierName = qualifierMajor ? rawQualifier.slice(0, -1) : rawQualifier;

    qualifiers.push({
      name: qualifierName,
      ui: '',
      majorTopic: qualifierMajor,
    });
  }

  return {
    descriptor,
    descriptorUI: '',
    majorTopic: descriptorMajor,
    qualifiers,
  };
}

function parseArticleIdsFromMedline(pmid: string, aidValues: ReadonlyArray<string>): ArticleIds {
  let doi: string | undefined;
  let pii: string | undefined;

  const aidFormatRegex = /^(.+)\s+\[(\w+)\]$/;
  for (const aidValue of aidValues) {
    const aidMatch = aidFormatRegex.exec(aidValue);
    if (!aidMatch) {
      continue;
    }
    const idValue = aidMatch[1]?.trim();
    const idType = aidMatch[2]?.toLowerCase();
    if (idType === 'doi' && idValue) {
      doi = idValue;
    } else if (idType === 'pii' && idValue) {
      pii = idValue;
    }
  }

  return {
    pmid,
    ...(doi !== undefined ? { doi } : {}),
    ...(pii !== undefined ? { pii } : {}),
  };
}

function parseGrantsFromMedline(grantValues: ReadonlyArray<string>): ReadonlyArray<Grant> {
  const grants: Array<Grant> = [];

  for (const grantValue of grantValues) {
    const grantParts = grantValue.split('/');
    if (grantParts.length < 3) {
      continue;
    }

    const grantId = (grantParts[0] ?? '').trim();
    const acronym = grantParts.length >= 4 ? (grantParts[1] ?? '').trim() : undefined;
    const agency = (grantParts[grantParts.length >= 4 ? 2 : 1] ?? '').trim();
    const country = (grantParts[grantParts.length - 1] ?? '').trim();

    grants.push({
      grantId,
      ...(acronym !== undefined ? { acronym } : {}),
      agency,
      country,
    });
  }

  return grants;
}

function parseKeywordsFromMedline(keywordValues: ReadonlyArray<string>): ReadonlyArray<Keyword> {
  return keywordValues.map((keywordText) => ({
    text: keywordText,
    majorTopic: false,
    owner: 'NOTNLM',
  }));
}
