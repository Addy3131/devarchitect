import { ChangeImpactAnalysis, RiskAssessment } from '@devarchitect/contracts';
import { ArchitectureGraph } from './graph.js';

export function calculateImpact(
  graph: ArchitectureGraph,
  targetFile: string
): ChangeImpactAnalysis {
  const normTarget = targetFile.replace(/\\/g, '/');
  const directDependents = graph.getDependents(normTarget);

  // Breadth-First Search to find all transitive dependents and max dependency distance
  const visited = new Set<string>();
  const queue: Array<{ id: string; distance: number }> = [];
  let maxDistance = 0;

  for (const dep of directDependents) {
    queue.push({ id: dep, distance: 1 });
    visited.add(dep);
  }

  while (queue.length > 0) {
    const { id, distance } = queue.shift()!;
    if (distance > maxDistance) {
      maxDistance = distance;
    }

    const dependentsOfDep = graph.getDependents(id);
    for (const upstream of dependentsOfDep) {
      if (!visited.has(upstream)) {
        visited.add(upstream);
        queue.push({ id: upstream, distance: distance + 1 });
      }
    }
  }

  const allDependents = Array.from(visited);
  const affectedModules = new Set<string>();
  const affectedFeatures = new Set<string>();

  for (const depId of allDependents) {
    const node = graph.getNode(depId);
    if (node) {
      if (node.feature) {
        affectedFeatures.add(node.feature);
      }
      const parts = depId.split('/');
      if (parts.length > 1) {
        affectedModules.add(parts.slice(0, 2).join('/'));
      }
    }
  }

  const targetNode = graph.getNode(normTarget);
  if (targetNode?.feature) {
    affectedFeatures.add(targetNode.feature);
  }

  // Assess Risk
  let riskAssessment: RiskAssessment = 'LOW';
  const transitiveCount = allDependents.length;
  const featureCount = affectedFeatures.size;

  if (transitiveCount > 25 || featureCount >= 4) {
    riskAssessment = 'CRITICAL';
  } else if (transitiveCount > 10 || featureCount >= 2) {
    riskAssessment = 'HIGH';
  } else if (transitiveCount > 3 || featureCount >= 1) {
    riskAssessment = 'MEDIUM';
  }

  const criticalPaths = affectedFeatures.size;
  const suggestedChecks: string[] = [];
  for (const feat of affectedFeatures) {
    suggestedChecks.push(`${feat} tests & integration flows`);
  }
  if (suggestedChecks.length === 0) {
    suggestedChecks.push(`Unit tests for ${targetNode?.name || normTarget}`);
  }

  const potentialConcerns: string[] = [];
  if (allDependents.length > 10) {
    potentialConcerns.push(
      `${normTarget} has ${allDependents.length} downstream dependents across the codebase.`
    );
  }
  if (featureCount > 2) {
    potentialConcerns.push(
      `Shared across multiple business-critical features (${Array.from(affectedFeatures).join(', ')}).`
    );
  }

  return {
    target: normTarget,
    isDirectTarget: true,
    directDependents,
    transitiveDependents: allDependents,
    affectedFeatures: Array.from(affectedFeatures),
    criticalPaths,
    riskAssessment,
    affectedModules: Array.from(affectedModules),
    suggestedChecks,
    potentialConcerns,
    dependencyDistanceMax: maxDistance,
    timestamp: new Date().toISOString(),
  };
}

