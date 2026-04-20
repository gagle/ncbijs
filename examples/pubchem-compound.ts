// Look up compound properties in PubChem by name, CID, SMILES, and InChIKey.
// Demonstrates compound search, property retrieval, synonyms, and descriptions.

import { PubChem } from '@ncbijs/pubchem';

async function main(): Promise<void> {
  const pubchem = new PubChem();

  console.log('Looking up aspirin by name...\n');

  const aspirin = await pubchem.compoundByName('aspirin');
  console.log(`  CID: ${aspirin.cid}`);
  console.log(`  Formula: ${aspirin.molecularFormula}`);
  console.log(`  Weight: ${aspirin.molecularWeight} g/mol`);
  console.log(`  IUPAC: ${aspirin.iupacName}`);
  console.log(`  SMILES: ${aspirin.canonicalSmiles}`);
  console.log(`  InChIKey: ${aspirin.inchiKey}`);
  console.log(`  XLogP: ${aspirin.xLogP}`);
  console.log(`  TPSA: ${aspirin.tpsa}`);
  console.log(`  H-bond donors: ${aspirin.hBondDonorCount}`);
  console.log(`  H-bond acceptors: ${aspirin.hBondAcceptorCount}`);

  console.log('\nLooking up synonyms...\n');

  const synonyms = await pubchem.synonyms(aspirin.cid);
  console.log(`  Top synonyms: ${synonyms.synonyms.slice(0, 10).join(', ')}`);

  console.log('\nLooking up description...\n');

  const desc = await pubchem.description(aspirin.cid);
  console.log(`  Title: ${desc.title}`);
  console.log(`  Description: ${desc.description.slice(0, 120)}...`);

  console.log('\nBatch lookup: aspirin + caffeine...\n');

  const batch = await pubchem.compoundByCidBatch([2244, 2519]);
  for (const compound of batch) {
    console.log(
      `  CID ${compound.cid}: ${compound.molecularFormula} (${compound.molecularWeight} g/mol)`,
    );
  }

  console.log('\nLookup by SMILES (caffeine)...\n');

  const caffeine = await pubchem.compoundBySmiles('CN1C=NC2=C1C(=O)N(C(=O)N2C)C');
  console.log(`  CID: ${caffeine.cid}, Formula: ${caffeine.molecularFormula}`);

  console.log('\nLookup by InChIKey (aspirin)...\n');

  const byKey = await pubchem.compoundByInchiKey('BSYNRYMUTXBXSQ-UHFFFAOYSA-N');
  console.log(`  CID: ${byKey.cid}, Formula: ${byKey.molecularFormula}`);

  console.log('\nFind CIDs by name...\n');

  const cids = await pubchem.cidsByName('ibuprofen');
  console.log(`  Found ${cids.length} CID(s): ${cids.slice(0, 5).join(', ')}`);
}

main().catch(console.error);
