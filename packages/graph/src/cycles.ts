import { ArchitectureGraph } from './graph.js';

export interface CircularDependencyCycle {
  id: string;
  path: string[];
  length: number;
}

export function detectCycles(graph: ArchitectureGraph): CircularDependencyCycle[] {
  const nodes = graph.getAllNodes().map(n => n.id);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const currentPath: string[] = [];
  const rawCycles: string[][] = [];

  function dfs(nodeId: string) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    currentPath.push(nodeId);

    const dependencies = graph.getDependencies(nodeId);
    for (const dep of dependencies) {
      if (!graph.hasNode(dep)) {
        continue;
      }

      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recursionStack.has(dep)) {
        // Cycle detected: slice from dep index to end and append dep
        const cycleStartIndex = currentPath.indexOf(dep);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex).concat(dep);
          rawCycles.push(cycle);
        }
      }
    }

    currentPath.pop();
    recursionStack.delete(nodeId);
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  // Deduplicate cycles (e.g. A->B->A and B->A->B are the same cycle)
  const uniqueCyclesMap = new Map<string, string[]>();

  for (const cycle of rawCycles) {
    // Normalizing cycle by sorting members or finding minimal canonical rotation
    const members = cycle.slice(0, -1);
    if (members.length === 0) continue;

    // Find the lexicographically smallest member to start canonical representation
    let minIdx = 0;
    for (let i = 1; i < members.length; i++) {
      if (members[i] < members[minIdx]) {
        minIdx = i;
      }
    }

    const rotated = [...members.slice(minIdx), ...members.slice(0, minIdx)];
    const key = rotated.join(' -> ');

    if (!uniqueCyclesMap.has(key)) {
      uniqueCyclesMap.set(key, [...rotated, rotated[0]]);
    }
  }

  return Array.from(uniqueCyclesMap.entries()).map(([key, cyclePath]) => ({
    id: `cycle-${key}`,
    path: cyclePath,
    length: cyclePath.length - 1,
  }));
}

