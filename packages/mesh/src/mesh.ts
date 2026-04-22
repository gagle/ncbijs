import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './mesh-client';
import type { MeSHClientConfig } from './mesh-client';
import type {
  MeSHConfig,
  MeshDescriptor,
  MeshTreeData,
  SparqlResult,
} from './interfaces/mesh.interface';

const SPARQL_URL = 'https://id.nlm.nih.gov/mesh/sparql';
const LOOKUP_URL = 'https://id.nlm.nih.gov/mesh/lookup/descriptor';
const REQUESTS_PER_SECOND = 3;

/** Client for navigating and querying the NLM Medical Subject Headings (MeSH) vocabulary. */
export class MeSH {
  private readonly descriptorById: ReadonlyMap<string, MeshDescriptor>;
  private readonly descriptorByLowercaseName: ReadonlyMap<string, MeshDescriptor>;
  private readonly descriptorByTreeNumber: ReadonlyMap<string, MeshDescriptor>;
  private readonly sortedTreeNumbers: ReadonlyArray<string>;
  private readonly _clientConfig: MeSHClientConfig;

  constructor(treeData: MeshTreeData, config?: MeSHConfig) {
    this._clientConfig = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
    const byId = new Map<string, MeshDescriptor>();
    const byName = new Map<string, MeshDescriptor>();
    const byTree = new Map<string, MeshDescriptor>();

    for (const descriptor of treeData.descriptors) {
      byId.set(descriptor.id, descriptor);
      byName.set(descriptor.name.toLowerCase(), descriptor);
      for (const treeNumber of descriptor.treeNumbers) {
        byTree.set(treeNumber, descriptor);
      }
    }

    this.descriptorById = byId;
    this.descriptorByLowercaseName = byName;
    this.descriptorByTreeNumber = byTree;
    this.sortedTreeNumbers = [...byTree.keys()].sort();
  }

  /** Find a MeSH descriptor by its unique ID or name. */
  public lookup(descriptorIdOrName: string): MeshDescriptor | null {
    return (
      this.descriptorById.get(descriptorIdOrName) ??
      this.descriptorByLowercaseName.get(descriptorIdOrName.toLowerCase()) ??
      null
    );
  }

  /** Return the names of a descriptor and all its descendant terms in the MeSH tree. */
  public expand(term: string): ReadonlyArray<string> {
    const descriptor = this.resolveDescriptor(term);
    const names = new Set<string>([descriptor.name]);

    for (const treeNumber of descriptor.treeNumbers) {
      const prefix = treeNumber + '.';
      for (const candidate of this.sortedTreeNumbers) {
        if (candidate.startsWith(prefix)) {
          const descendant = this.descriptorByTreeNumber.get(candidate);
          if (descendant) {
            names.add(descendant.name);
          }
        }
      }
    }

    return [...names];
  }

  /** Return the names of all ancestor terms above the given descriptor in the MeSH tree. */
  public ancestors(term: string): ReadonlyArray<string> {
    const descriptor = this.resolveDescriptor(term);
    const names = new Set<string>();

    for (const treeNumber of descriptor.treeNumbers) {
      const segments = treeNumber.split('.');
      for (let depth = 1; depth < segments.length; depth++) {
        const ancestorTreeNumber = segments.slice(0, depth).join('.');
        const ancestor = this.descriptorByTreeNumber.get(ancestorTreeNumber);
        if (ancestor) {
          names.add(ancestor.name);
        }
      }
    }

    return [...names];
  }

  /** Return the names of the immediate child terms below the given descriptor in the MeSH tree. */
  public children(term: string): ReadonlyArray<string> {
    const descriptor = this.resolveDescriptor(term);
    const names = new Set<string>();

    for (const treeNumber of descriptor.treeNumbers) {
      const prefix = treeNumber + '.';
      for (const candidate of this.sortedTreeNumbers) {
        if (candidate.startsWith(prefix) && !candidate.slice(prefix.length).includes('.')) {
          const child = this.descriptorByTreeNumber.get(candidate);
          if (child) {
            names.add(child.name);
          }
        }
      }
    }

    return [...names];
  }

  /** Return ancestor names along all tree paths from root to the given descriptor. */
  public treePath(term: string): ReadonlyArray<string> {
    const descriptor = this.resolveDescriptor(term);
    const allPaths: Array<string> = [];

    for (const treeNumber of descriptor.treeNumbers) {
      const segments = treeNumber.split('.');
      for (let depth = 1; depth <= segments.length; depth++) {
        const ancestorTreeNumber = segments.slice(0, depth).join('.');
        const ancestor = this.descriptorByTreeNumber.get(ancestorTreeNumber);
        if (ancestor) {
          allPaths.push(ancestor.name);
        }
      }
    }

    return allPaths;
  }

  /** Convert a MeSH term (with optional qualifier) into a PubMed MeSH search query string. */
  public toQuery(term: string): string {
    const slashIndex = term.indexOf('/');

    if (slashIndex !== -1) {
      const baseTerm = term.slice(0, slashIndex);
      const qualifierAbbreviation = term.slice(slashIndex + 1);
      const descriptor = this.resolveDescriptor(baseTerm);
      const qualifier = descriptor.qualifiers.find(
        (q) => q.abbreviation.toLowerCase() === qualifierAbbreviation.toLowerCase(),
      );
      const qualifierName = qualifier ? qualifier.name : qualifierAbbreviation;
      return `"${descriptor.name}/${qualifierName}"[Mesh]`;
    }

    const descriptor = this.resolveDescriptor(term);
    return `"${descriptor.name}"[Mesh]`;
  }

  /** Execute a SPARQL query against the NLM MeSH SPARQL endpoint. */
  public async sparql(query: string): Promise<SparqlResult> {
    const url = new URL(SPARQL_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('format', 'JSON');

    return fetchJson<SparqlResult>(url.toString(), this._clientConfig);
  }

  /** Search for MeSH descriptors online via the NLM lookup API. */
  public async lookupOnline(query: string): Promise<ReadonlyArray<MeshDescriptor>> {
    const url = new URL(LOOKUP_URL);
    url.searchParams.set('label', query);
    url.searchParams.set('match', 'contains');
    url.searchParams.set('limit', '10');

    const results = await fetchJson<
      ReadonlyArray<{
        resource: string;
        label: string;
      }>
    >(url.toString(), this._clientConfig);

    return results.map((result) => ({
      id: extractDescriptorId(result.resource),
      name: result.label,
      treeNumbers: [],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    }));
  }

  private resolveDescriptor(term: string): MeshDescriptor {
    const descriptor = this.lookup(term);
    if (!descriptor) {
      throw new Error(`Unknown MeSH term: ${term}`);
    }
    return descriptor;
  }
}

function extractDescriptorId(resourceUri: string): string {
  const lastSlash = resourceUri.lastIndexOf('/');
  return lastSlash !== -1 ? resourceUri.slice(lastSlash + 1) : resourceUri;
}
