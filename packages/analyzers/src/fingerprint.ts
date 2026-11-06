import crypto from 'node:crypto';
import { ProjectNode, ProjectEdge, ProjectSummary } from '@devarchitect/contracts';

export interface ModuleBoundarySummary {
  files: string[];
  internalEdges: number;
  externalEdges: number;
  publicExports: string[];
}

export interface ArchitectureFingerprint {
  version: string;
  projectName: string;
  timestamp: string;
  hash: string;
  summary: {
    modulesCount: number;
    componentCount: number;
    edgeCount: number;
    cycleCount: number;
    totalLoc: number;
  };
  boundaries: Record<string, ModuleBoundarySummary>;
  edgesSignature: string[];
}

export interface ArchitectureDriftReport {
  previousTimestamp: string;
  currentTimestamp: string;
  driftScore: number; // 0 (identical) to 100 (complete divergence)
  hasDiverged: boolean;
  changes: {
    addedEdges: string[];
    removedEdges: string[];
    newBoundaries: string[];
    removedBoundaries: string[];
    locDelta: number;
  };
}

export function createArchitectureFingerprint(
  project: ProjectSummary,
  nodes: ProjectNode[],
  edges: ProjectEdge[],
  cycleCount: number = 0
): ArchitectureFingerprint {
  const boundaries: Record<string, ModuleBoundarySummary> = {};

  // Group files by module or feature
  for (const node of nodes) {
    const key = node.feature || node.layer || 'root';
    if (!boundaries[key]) {
      boundaries[key] = {
        files: [],
        internalEdges: 0,
        externalEdges: 0,
        publicExports: [],
      };
    }
    boundaries[key].files.push(node.path);
    boundaries[key].files.sort();

    if (node.name.startsWith('index.') && Array.isArray(node.metadata.exports)) {
      for (const exp of node.metadata.exports as Array<{ name: string }>) {
        boundaries[key].publicExports.push(exp.name);
      }
      boundaries[key].publicExports.sort();
    }
  }

  // Count boundary edges
  const sortedEdges = edges
    .map(e => `${e.source} -> ${e.target}`)
    .sort();

  const totalLoc = nodes.reduce((sum, n) => sum + n.metrics.linesOfCode, 0);

  // Compute canonical SHA-256 fingerprint hash
  const canonicalRepresentation = JSON.stringify({
    boundaries,
    edges: sortedEdges,
  });

  const hash = crypto.createHash('sha256').update(canonicalRepresentation).digest('hex');

  return {
    version: '1.0.0',
    projectName: project.name,
    timestamp: new Date().toISOString(),
    hash,
    summary: {
      modulesCount: Object.keys(boundaries).length,
      componentCount: nodes.filter(n => n.type === 'component').length,
      edgeCount: edges.length,
      cycleCount,
      totalLoc,
    },
    boundaries,
    edgesSignature: sortedEdges,
  };
}

export function calculateArchitectureDrift(
  prev: ArchitectureFingerprint,
  current: ArchitectureFingerprint
): ArchitectureDriftReport {
  const prevEdges = new Set(prev.edgesSignature);
  const currentEdges = new Set(current.edgesSignature);

  const addedEdges: string[] = [];
  const removedEdges: string[] = [];

  for (const e of current.edgesSignature) {
    if (!prevEdges.has(e)) addedEdges.push(e);
  }
  for (const e of prev.edgesSignature) {
    if (!currentEdges.has(e)) removedEdges.push(e);
  }

  const prevBoundaries = new Set(Object.keys(prev.boundaries));
  const currentBoundaries = new Set(Object.keys(current.boundaries));

  const newBoundaries: string[] = [];
  const removedBoundaries: string[] = [];

  for (const b of currentBoundaries) {
    if (!prevBoundaries.has(b)) newBoundaries.push(b);
  }
  for (const b of prevBoundaries) {
    if (!currentBoundaries.has(b)) removedBoundaries.push(b);
  }

  const totalBaseEdges = Math.max(prev.edgesSignature.length, 1);
  const edgeDiffRatio = (addedEdges.length + removedEdges.length) / totalBaseEdges;
  const driftScore = Math.min(100, Math.round(edgeDiffRatio * 100));

  return {
    previousTimestamp: prev.timestamp,
    currentTimestamp: current.timestamp,
    driftScore,
    hasDiverged: prev.hash !== current.hash,
    changes: {
      addedEdges,
      removedEdges,
      newBoundaries,
      removedBoundaries,
      locDelta: current.summary.totalLoc - prev.summary.totalLoc,
    },
  };
}
