import { describe, expect, it } from 'vitest';
import { parseMeshDescriptorXml } from './parse-mesh-descriptor-xml';

const DESCRIPTOR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE DescriptorRecordSet SYSTEM "desc_record.dtd">
<DescriptorRecordSet LanguageCode="eng">
  <DescriptorRecord DescriptorClass="1">
    <DescriptorUI>D000001</DescriptorUI>
    <DescriptorName>
      <String>Calcimycin</String>
    </DescriptorName>
    <AllowableQualifiersList>
      <AllowableQualifier>
        <QualifierReferredTo>
          <QualifierUI>Q000008</QualifierUI>
          <QualifierName>
            <String>administration &amp; dosage</String>
          </QualifierName>
        </QualifierReferredTo>
        <Abbreviation>AD</Abbreviation>
      </AllowableQualifier>
      <AllowableQualifier>
        <QualifierReferredTo>
          <QualifierUI>Q000009</QualifierUI>
          <QualifierName>
            <String>adverse effects</String>
          </QualifierName>
        </QualifierReferredTo>
        <Abbreviation>AE</Abbreviation>
      </AllowableQualifier>
    </AllowableQualifiersList>
    <TreeNumberList>
      <TreeNumber>D03.633.100.221.173</TreeNumber>
    </TreeNumberList>
    <PharmacologicalActionList>
      <PharmacologicalAction>
        <DescriptorReferredTo>
          <DescriptorUI>D000900</DescriptorUI>
          <DescriptorName>
            <String>Anti-Bacterial Agents</String>
          </DescriptorName>
        </DescriptorReferredTo>
      </PharmacologicalAction>
      <PharmacologicalAction>
        <DescriptorReferredTo>
          <DescriptorUI>D002148</DescriptorUI>
          <DescriptorName>
            <String>Calcium Ionophores</String>
          </DescriptorName>
        </DescriptorReferredTo>
      </PharmacologicalAction>
    </PharmacologicalActionList>
    <ConceptList>
      <Concept PreferredConceptYN="Y">
        <ConceptUI>M0000001</ConceptUI>
        <ConceptName>
          <String>Calcimycin</String>
        </ConceptName>
      </Concept>
    </ConceptList>
  </DescriptorRecord>
  <DescriptorRecord DescriptorClass="1">
    <DescriptorUI>D005145</DescriptorUI>
    <DescriptorName>
      <String>Face</String>
    </DescriptorName>
    <TreeNumberList>
      <TreeNumber>A01.236.500</TreeNumber>
      <TreeNumber>A17.360</TreeNumber>
    </TreeNumberList>
    <ConceptList>
      <Concept PreferredConceptYN="Y">
        <ConceptUI>M0007880</ConceptUI>
        <ConceptName>
          <String>Face</String>
        </ConceptName>
      </Concept>
    </ConceptList>
  </DescriptorRecord>
  <DescriptorRecord DescriptorClass="1">
    <DescriptorUI>D006257</DescriptorUI>
    <DescriptorName>
      <String>Head</String>
    </DescriptorName>
    <AllowableQualifiersList>
      <AllowableQualifier>
        <QualifierReferredTo>
          <QualifierUI>Q000032</QualifierUI>
          <QualifierName>
            <String>analysis</String>
          </QualifierName>
        </QualifierReferredTo>
        <Abbreviation>AN</Abbreviation>
      </AllowableQualifier>
    </AllowableQualifiersList>
    <TreeNumberList>
      <TreeNumber>A01.236</TreeNumber>
    </TreeNumberList>
    <ConceptList>
      <Concept PreferredConceptYN="Y">
        <ConceptUI>M0009814</ConceptUI>
        <ConceptName>
          <String>Head</String>
        </ConceptName>
      </Concept>
    </ConceptList>
  </DescriptorRecord>
</DescriptorRecordSet>`;

describe('parseMeshDescriptorXml', () => {
  it('parses all descriptor records', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);

    expect(result.descriptors).toHaveLength(3);
  });

  it('extracts descriptor UI and name', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const calcimycin = result.descriptors[0];

    expect(calcimycin.id).toBe('D000001');
    expect(calcimycin.name).toBe('Calcimycin');
  });

  it('decodes XML entities in names', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const calcimycin = result.descriptors[0];

    expect(calcimycin.qualifiers[0].name).toBe('administration & dosage');
  });

  it('extracts tree numbers', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const calcimycin = result.descriptors[0];

    expect(calcimycin.treeNumbers).toEqual(['D03.633.100.221.173']);
  });

  it('extracts multiple tree numbers', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const face = result.descriptors[1];

    expect(face.treeNumbers).toEqual(['A01.236.500', 'A17.360']);
  });

  it('extracts allowable qualifiers', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const calcimycin = result.descriptors[0];

    expect(calcimycin.qualifiers).toEqual([
      { name: 'administration & dosage', abbreviation: 'AD' },
      { name: 'adverse effects', abbreviation: 'AE' },
    ]);
  });

  it('returns empty qualifiers when none present', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const face = result.descriptors[1];

    expect(face.qualifiers).toEqual([]);
  });

  it('extracts pharmacological actions', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const calcimycin = result.descriptors[0];

    expect(calcimycin.pharmacologicalActions).toEqual([
      'Anti-Bacterial Agents',
      'Calcium Ionophores',
    ]);
  });

  it('returns empty pharmacological actions when none present', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const face = result.descriptors[1];

    expect(face.pharmacologicalActions).toEqual([]);
  });

  it('returns empty supplementary concepts from descriptor XML', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);

    for (const descriptor of result.descriptors) {
      expect(descriptor.supplementaryConcepts).toEqual([]);
    }
  });

  it('returns empty descriptors for empty XML', () => {
    const result = parseMeshDescriptorXml('');

    expect(result.descriptors).toEqual([]);
  });

  it('returns empty descriptors for XML with no DescriptorRecord elements', () => {
    const result = parseMeshDescriptorXml('<DescriptorRecordSet></DescriptorRecordSet>');

    expect(result.descriptors).toEqual([]);
  });

  it('handles descriptor with missing optional fields', () => {
    const minimalXml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D999999</DescriptorUI>
        <DescriptorName><String>Minimal</String></DescriptorName>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(minimalXml);

    expect(result.descriptors).toEqual([
      {
        id: 'D999999',
        name: 'Minimal',
        treeNumbers: [],
        qualifiers: [],
        pharmacologicalActions: [],
        supplementaryConcepts: [],
      },
    ]);
  });

  it('handles single qualifier correctly', () => {
    const result = parseMeshDescriptorXml(DESCRIPTOR_XML);
    const head = result.descriptors[2];

    expect(head.qualifiers).toEqual([{ name: 'analysis', abbreviation: 'AN' }]);
  });

  it('defaults name to empty string when DescriptorName has no String tag', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000002</DescriptorUI>
        <DescriptorName></DescriptorName>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].name).toBe('');
  });

  it('defaults name to empty string when DescriptorName block is missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000003</DescriptorUI>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].name).toBe('');
  });

  it('defaults qualifier name when QualifierReferredTo block is missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000004</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <AllowableQualifiersList>
          <AllowableQualifier>
            <Abbreviation>XX</Abbreviation>
          </AllowableQualifier>
        </AllowableQualifiersList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].qualifiers).toEqual([{ name: '', abbreviation: 'XX' }]);
  });

  it('defaults qualifier name when QualifierName block is missing inside QualifierReferredTo', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000005</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <AllowableQualifiersList>
          <AllowableQualifier>
            <QualifierReferredTo>
              <QualifierUI>Q000001</QualifierUI>
            </QualifierReferredTo>
            <Abbreviation>YY</Abbreviation>
          </AllowableQualifier>
        </AllowableQualifiersList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].qualifiers).toEqual([{ name: '', abbreviation: 'YY' }]);
  });

  it('skips pharmacological actions when DescriptorReferredTo is missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000006</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <PharmacologicalActionList>
          <PharmacologicalAction></PharmacologicalAction>
        </PharmacologicalActionList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].pharmacologicalActions).toEqual([]);
  });

  it('skips pharmacological actions when DescriptorName is missing inside DescriptorReferredTo', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000007</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <PharmacologicalActionList>
          <PharmacologicalAction>
            <DescriptorReferredTo>
              <DescriptorUI>D999999</DescriptorUI>
            </DescriptorReferredTo>
          </PharmacologicalAction>
        </PharmacologicalActionList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].pharmacologicalActions).toEqual([]);
  });

  it('defaults qualifier name when QualifierName exists but String tag is missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000008</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <AllowableQualifiersList>
          <AllowableQualifier>
            <QualifierReferredTo>
              <QualifierUI>Q000002</QualifierUI>
              <QualifierName></QualifierName>
            </QualifierReferredTo>
            <Abbreviation>ZZ</Abbreviation>
          </AllowableQualifier>
        </AllowableQualifiersList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].qualifiers).toEqual([{ name: '', abbreviation: 'ZZ' }]);
  });

  it('defaults abbreviation when Abbreviation tag is missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000009</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <AllowableQualifiersList>
          <AllowableQualifier>
            <QualifierReferredTo>
              <QualifierUI>Q000003</QualifierUI>
              <QualifierName><String>test qualifier</String></QualifierName>
            </QualifierReferredTo>
          </AllowableQualifier>
        </AllowableQualifiersList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].qualifiers).toEqual([
      { name: 'test qualifier', abbreviation: '' },
    ]);
  });

  it('skips pharmacological action when DescriptorName exists but String tag is missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorUI>D000010</DescriptorUI>
        <DescriptorName><String>Test</String></DescriptorName>
        <PharmacologicalActionList>
          <PharmacologicalAction>
            <DescriptorReferredTo>
              <DescriptorUI>D999998</DescriptorUI>
              <DescriptorName></DescriptorName>
            </DescriptorReferredTo>
          </PharmacologicalAction>
        </PharmacologicalActionList>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].pharmacologicalActions).toEqual([]);
  });

  it('defaults DescriptorUI to empty string when missing', () => {
    const xml = `<DescriptorRecordSet>
      <DescriptorRecord>
        <DescriptorName><String>NoId</String></DescriptorName>
      </DescriptorRecord>
    </DescriptorRecordSet>`;

    const result = parseMeshDescriptorXml(xml);

    expect(result.descriptors[0].id).toBe('');
  });
});
