const PMID_REGEX = /^[1-9]\d*$/;
const PMCID_REGEX = /^pmc\d+(\.\d+)?$/i;
const DOI_REGEX = /^10\.\S+\/\S+$/;
const MID_REGEX = /^nihms\d+$/i;

/** Check whether a string is a valid PubMed ID (PMID). */
export function isPMID(value: string): boolean {
  return PMID_REGEX.test(value);
}

/** Check whether a string is a valid PubMed Central ID (PMCID). */
export function isPMCID(value: string): boolean {
  return PMCID_REGEX.test(value);
}

/** Check whether a string is a valid Digital Object Identifier (DOI). */
export function isDOI(value: string): boolean {
  return DOI_REGEX.test(value);
}

/** Check whether a string is a valid NIH Manuscript ID (MID). */
export function isMID(value: string): boolean {
  return MID_REGEX.test(value);
}
