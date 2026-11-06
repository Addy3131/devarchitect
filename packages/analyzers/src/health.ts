import {
  ProjectHealthScore,
  ArchitectureIssue,
  ProjectNode
} from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export interface HealthCalculationInput {
  nodes: ProjectNode[];
  issues: ArchitectureIssue[];
  graph: ArchitectureGraph;
  hasTests: boolean;
  duplicateBlockCount?: number;
}

export function calculateProjectHealth(input: HealthCalculationInput): ProjectHealthScore {
  const { nodes, issues, graph, hasTests, duplicateBlockCount = 0 } = input;

  if (nodes.length === 0) {
    return {
      status: 'critical',
      overallScore: 0,
      grade: 'F',
      dimensions: {
        architecture: {
          score: 0,
          status: 'critical',
          weight: 0.25,
          issueCount: 0,
          summary: 'No source files detected in workspace.',
        },
        complexity: {
          score: 0,
          status: 'critical',
          weight: 0.20,
          issueCount: 0,
          summary: 'No source files detected in workspace.',
        },
        dependencies: {
          score: 0,
          status: 'critical',
          weight: 0.15,
          issueCount: 0,
          summary: 'No source files detected in workspace.',
        },
        duplication: {
          score: 0,
          status: 'critical',
          weight: 0.15,
          issueCount: 0,
          summary: 'No source files detected in workspace.',
        },
        maintainability: {
          score: 0,
          status: 'critical',
          weight: 0.15,
          issueCount: 0,
          summary: 'No source files detected in workspace.',
        },
        testing: {
          score: null,
          status: 'unmeasured',
          weight: 0.10,
          issueCount: 0,
          summary: 'No source files detected.',
        },
      },
      metrics: {
        totalIssues: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        circularDependencies: 0,
        highComplexityCount: 0,
        duplicateBlocksCount: 0,
      },
      evaluatedAt: new Date().toISOString(),
    };
  }

  const totalFiles = nodes.length;
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const circularCount = issues.filter(i => i.ruleId === 'no-circular-dependencies').length;

  // 1. Architecture Compliance (Weight 25%)
  // Penalize heavily for architectural errors and cycles
  let archScore = 100 - (errorCount * 15 + warningCount * 5 + circularCount * 20);
  archScore = Math.max(0, Math.min(100, Math.round(archScore)));

  // 2. Code Complexity (Weight 20%)
  // Proportion of files with high complexity (> 15)
  const highComplexityNodes = nodes.filter(n => (n.metrics.complexity || 0) > 15);
  const complexityRatio = highComplexityNodes.length / totalFiles;
  let complexityScore = 100 - Math.round(complexityRatio * 150);
  complexityScore = Math.max(0, Math.min(100, complexityScore));

  // 3. Dependency Health (Weight 15%)
  // Penalize for high coupling and excessive dependencies
  const highlyCoupledNodes = nodes.filter(n => graph.getDependencies(n.path).length > 12);
  const couplingRatio = highlyCoupledNodes.length / totalFiles;
  let depScore = 100 - Math.round(couplingRatio * 120 + circularCount * 15);
  depScore = Math.max(0, Math.min(100, depScore));

  // 4. Code Duplication (Weight 15%)
  let dupScore = 100 - (duplicateBlockCount * 8);
  dupScore = Math.max(0, Math.min(100, dupScore));

  // 5. Maintainability (Weight 15%)
  // Oversized files (> 250 LOC)
  const oversizedNodes = nodes.filter(n => n.metrics.linesOfCode > 250);
  const oversizedRatio = oversizedNodes.length / totalFiles;
  let maintScore = 100 - Math.round(oversizedRatio * 100);
  maintScore = Math.max(0, Math.min(100, maintScore));

  // 6. Testing Confidence (Weight 10%)
  // If no tests detected or unmeasured, show unmeasured rather than fake 0
  const testScore = hasTests ? 85 : null;

  // Calculate weighted overall score
  let weightedSum = 0;
  let totalWeight = 0;

  weightedSum += archScore * 0.25;
  totalWeight += 0.25;

  weightedSum += complexityScore * 0.20;
  totalWeight += 0.20;

  weightedSum += depScore * 0.15;
  totalWeight += 0.15;

  weightedSum += dupScore * 0.15;
  totalWeight += 0.15;

  weightedSum += maintScore * 0.15;
  totalWeight += 0.15;

  if (testScore !== null) {
    weightedSum += testScore * 0.10;
    totalWeight += 0.10;
  }

  const overallScore = Math.round(weightedSum / totalWeight);

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';

  if (overallScore >= 85) {
    status = 'healthy';
    grade = overallScore >= 92 ? 'A' : 'B';
  } else if (overallScore >= 65) {
    status = 'warning';
    grade = overallScore >= 75 ? 'C' : 'D';
  } else {
    status = 'critical';
    grade = 'F';
  }

  const getDimensionStatus = (score: number | null): 'healthy' | 'warning' | 'critical' | 'unmeasured' => {
    if (score === null) return 'unmeasured';
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  return {
    overallScore,
    status,
    grade,
    dimensions: {
      architecture: {
        score: archScore,
        status: getDimensionStatus(archScore),
        weight: 0.25,
        issueCount: issues.filter(i => i.dimension === 'architecture').length,
        summary: `Compliance score based on rule violations and circular dependencies.`,
      },
      complexity: {
        score: complexityScore,
        status: getDimensionStatus(complexityScore),
        weight: 0.20,
        issueCount: highComplexityNodes.length,
        summary: `${highComplexityNodes.length} file(s) exceed complexity threshold.`,
      },
      dependencies: {
        score: depScore,
        status: getDimensionStatus(depScore),
        weight: 0.15,
        issueCount: highlyCoupledNodes.length,
        summary: `${highlyCoupledNodes.length} file(s) exhibit high module coupling.`,
      },
      duplication: {
        score: dupScore,
        status: getDimensionStatus(dupScore),
        weight: 0.15,
        issueCount: duplicateBlockCount,
        summary: `${duplicateBlockCount} repeated code blocks detected.`,
      },
      maintainability: {
        score: maintScore,
        status: getDimensionStatus(maintScore),
        weight: 0.15,
        issueCount: oversizedNodes.length,
        summary: `${oversizedNodes.length} oversized file(s) exceeding 250 LOC.`,
      },
      testing: {
        score: testScore,
        status: getDimensionStatus(testScore),
        weight: 0.10,
        issueCount: 0,
        summary: hasTests ? 'Test framework detected' : 'Unmeasured (no test coverage report configured)',
      },
    },
    metrics: {
      totalIssues: issues.length,
      errorCount,
      warningCount,
      infoCount: issues.filter(i => i.severity === 'info').length,
      circularDependencies: circularCount,
      highComplexityCount: highComplexityNodes.length,
      duplicateBlocksCount: duplicateBlockCount,
    },
    evaluatedAt: new Date().toISOString(),
  };
}
