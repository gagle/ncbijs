/** A MeSH subheading qualifier that can be applied to a descriptor. */
export interface MeshQualifier {
  readonly name: string;
  readonly abbreviation: string;
}

/** A MeSH descriptor with its tree numbers, qualifiers, and related concepts. */
export interface MeshDescriptor {
  readonly id: string;
  readonly name: string;
  readonly treeNumbers: ReadonlyArray<string>;
  readonly qualifiers: ReadonlyArray<Readonly<MeshQualifier>>;
  readonly pharmacologicalActions: ReadonlyArray<string>;
  readonly supplementaryConcepts: ReadonlyArray<string>;
}

/** Container for the full set of MeSH descriptors used to initialize the MeSH client. */
export interface MeshTreeData {
  readonly descriptors: ReadonlyArray<MeshDescriptor>;
}

/** A single variable binding from a SPARQL query result. */
export interface SparqlBinding {
  readonly type: string;
  readonly value: string;
  readonly 'xml:lang'?: string;
}

/** Response from a SPARQL query containing variable names and result bindings. */
export interface SparqlResult {
  readonly head: Readonly<{ vars: ReadonlyArray<string> }>;
  readonly results: Readonly<{
    bindings: ReadonlyArray<Readonly<Record<string, Readonly<SparqlBinding>>>>;
  }>;
}
