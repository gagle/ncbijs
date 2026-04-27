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

/** Configuration for the MeSH client. */
export interface MeSHConfig {
  readonly maxRetries?: number;
}

/**
 * Minimal storage interface for reading NCBI dataset records.
 *
 * This interface is structurally compatible with `ReadableStorage` from `@ncbijs/store`,
 * but defined locally to avoid a runtime dependency. Any object matching this shape works.
 */
export interface DataStorage {
  readonly getRecord: <T>(dataset: string, key: string) => Promise<T | undefined>;
  readonly searchRecords: <T>(
    dataset: string,
    query: {
      readonly field: string;
      readonly value: string;
      readonly operator?: 'eq' | 'contains' | 'starts_with';
      readonly limit?: number;
    },
  ) => Promise<ReadonlyArray<T>>;
}

/** Error thrown when an HTTP-only method is called on a storage-backed instance. */
export class StorageModeError extends Error {
  constructor(methodName: string) {
    super(`${methodName} is not available in storage mode`);
    this.name = 'StorageModeError';
  }
}
