export interface MeshQualifier {
  readonly name: string;
  readonly abbreviation: string;
}

export interface MeshDescriptor {
  readonly id: string;
  readonly name: string;
  readonly treeNumbers: ReadonlyArray<string>;
  readonly qualifiers: ReadonlyArray<Readonly<MeshQualifier>>;
  readonly pharmacologicalActions: ReadonlyArray<string>;
  readonly supplementaryConcepts: ReadonlyArray<string>;
}

export interface MeshTreeData {
  readonly descriptors: ReadonlyArray<MeshDescriptor>;
}

export interface SparqlBinding {
  readonly type: string;
  readonly value: string;
  readonly 'xml:lang'?: string | undefined;
}

export interface SparqlResult {
  readonly head: Readonly<{ vars: ReadonlyArray<string> }>;
  readonly results: Readonly<{
    bindings: ReadonlyArray<Readonly<Record<string, Readonly<SparqlBinding>>>>;
  }>;
}
