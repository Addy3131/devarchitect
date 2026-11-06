import { ProjectNode, ProjectEdge, ProjectGraph } from '@devarchitect/contracts';

export class ArchitectureGraph {
  private nodesMap: Map<string, ProjectNode> = new Map();
  private edgesList: ProjectEdge[] = [];
  // Adjacency: source -> targets (who do I depend on?)
  private outgoing: Map<string, Set<string>> = new Map();
  // Reverse adjacency: target -> sources (who depends on me?)
  private incoming: Map<string, Set<string>> = new Map();

  constructor(nodes: ProjectNode[] = [], edges: ProjectEdge[] = []) {
    for (const node of nodes) {
      this.addNode(node);
    }
    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  public addNode(node: ProjectNode): void {
    this.nodesMap.set(node.id, node);
    if (!this.outgoing.has(node.id)) {
      this.outgoing.set(node.id, new Set());
    }
    if (!this.incoming.has(node.id)) {
      this.incoming.set(node.id, new Set());
    }
  }

  public getNode(id: string): ProjectNode | undefined {
    return this.nodesMap.get(id);
  }

  public hasNode(id: string): boolean {
    return this.nodesMap.has(id);
  }

  public getAllNodes(): ProjectNode[] {
    return Array.from(this.nodesMap.values());
  }

  public addEdge(edge: ProjectEdge): void {
    this.edgesList.push(edge);

    if (!this.outgoing.has(edge.source)) {
      this.outgoing.set(edge.source, new Set());
    }
    this.outgoing.get(edge.source)!.add(edge.target);

    if (!this.incoming.has(edge.target)) {
      this.incoming.set(edge.target, new Set());
    }
    this.incoming.get(edge.target)!.add(edge.source);
  }

  public getAllEdges(): ProjectEdge[] {
    return this.edgesList;
  }

  /**
   * Get direct dependencies of a node (files that this node imports)
   */
  public getDependencies(nodeId: string): string[] {
    return Array.from(this.outgoing.get(nodeId) || []);
  }

  /**
   * Get direct dependents of a node (files that import this node)
   */
  public getDependents(nodeId: string): string[] {
    return Array.from(this.incoming.get(nodeId) || []);
  }

  public toProjectGraph(rootPath: string = ''): ProjectGraph {
    const nodesRecord: Record<string, ProjectNode> = {};
    for (const [id, node] of this.nodesMap.entries()) {
      nodesRecord[id] = {
        ...node,
        metrics: {
          ...node.metrics,
          dependencyCount: this.outgoing.get(id)?.size || 0,
          dependentCount: this.incoming.get(id)?.size || 0,
        },
      };
    }

    return {
      version: '1.0.0',
      nodes: nodesRecord,
      edges: this.edgesList,
      rootPath,
      timestamp: new Date().toISOString(),
    };
  }
}

