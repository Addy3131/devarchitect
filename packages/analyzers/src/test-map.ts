import fs from 'node:fs';
import path from 'node:path';
import { ProjectNode } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export interface UntestedFileRisk {
  filePath: string;
  name: string;
  type: string;
  feature?: string;
  complexity: number;
  dependentsCount: number;
  linesOfCode: number;
  riskScore: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TestMapReport {
  totalSourceFiles: number;
  testedSourceFiles: number;
  untestedSourceFiles: number;
  coveragePercentage: number;
  testSuitesCount: number;
  criticalGaps: UntestedFileRisk[];
  untestedFiles: UntestedFileRisk[];
}

export function analyzeTestMap(
  rootDir: string,
  nodes: ProjectNode[],
  graph: ArchitectureGraph
): TestMapReport {
  // 1. Separate test nodes and source nodes
  const testNodes = nodes.filter(
    n =>
      n.type === 'test' ||
      n.path.includes('.test.') ||
      n.path.includes('.spec.') ||
      n.path.includes('/tests/') ||
      n.path.includes('/__tests__/')
  );

  const sourceNodes = nodes.filter(
    n =>
      n.type !== 'test' &&
      n.type !== 'config' &&
      n.type !== 'asset' &&
      !n.path.includes('.test.') &&
      !n.path.includes('.spec.') &&
      !n.path.includes('/tests/') &&
      !n.path.includes('/__tests__/')
  );

  // 2. Map test files to what source files they import
  const testedFilesMap = new Map<string, Set<string>>(); // sourcePath -> testPaths
  const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|require\(\s*)['"]([^'"]+)['"]/g;

  for (const testNode of testNodes) {
    const fullPath = path.isAbsolute(testNode.path) ? testNode.path : path.join(rootDir, testNode.path);
    if (!fs.existsSync(fullPath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const specifier = match[1];
      if (specifier.startsWith('.')) {
        // Resolve relative import relative to test file
        const testDir = path.dirname(fullPath);
        const resolved = path.resolve(testDir, specifier);
        // Find matching source node
        for (const sNode of sourceNodes) {
          const sFull = path.isAbsolute(sNode.path) ? sNode.path : path.join(rootDir, sNode.path);
          const sWithoutExt = sFull.replace(/\.[^/.]+$/, '');
          const rWithoutExt = resolved.replace(/\.[^/.]+$/, '');
          if (sWithoutExt === rWithoutExt) {
            if (!testedFilesMap.has(sNode.path)) {
              testedFilesMap.set(sNode.path, new Set());
            }
            testedFilesMap.get(sNode.path)!.add(testNode.path);
          }
        }
      }
    }

    // Also check direct basename naming convention (e.g., Header.tsx <-> Header.test.tsx)
    const testBase = path.basename(testNode.path).replace(/\.(test|spec)\.[^/.]+$/, '');
    for (const sNode of sourceNodes) {
      const sBase = path.basename(sNode.path).replace(/\.[^/.]+$/, '');
      if (sBase === testBase) {
        if (!testedFilesMap.has(sNode.path)) {
          testedFilesMap.set(sNode.path, new Set());
        }
        testedFilesMap.get(sNode.path)!.add(testNode.path);
      }
    }
  }

  // 3. Score untested files by architectural risk
  const untestedRisks: UntestedFileRisk[] = [];

  for (const sNode of sourceNodes) {
    if (!testedFilesMap.has(sNode.path)) {
      const complexity = sNode.metrics?.complexity || 1;
      const dependents = graph.getDependents(sNode.path).length;
      const loc = sNode.metrics?.linesOfCode || 10;

      // Multiplier based on architectural role
      const roleMultiplier =
        sNode.type === 'service' ? 1.5 : sNode.type === 'hook' ? 1.3 : sNode.type === 'component' ? 1.0 : 0.8;

      const riskScore = Math.round(
        (complexity * 4 + dependents * 8 + Math.min(loc, 200) * 0.2) * roleMultiplier
      );

      const priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' =
        riskScore >= 35 || dependents >= 4
          ? 'CRITICAL'
          : riskScore >= 20 || dependents >= 2
          ? 'HIGH'
          : riskScore >= 10
          ? 'MEDIUM'
          : 'LOW';

      untestedRisks.push({
        filePath: sNode.path,
        name: sNode.name,
        type: sNode.type,
        feature: sNode.feature,
        complexity,
        dependentsCount: dependents,
        linesOfCode: loc,
        riskScore,
        priority,
      });
    }
  }

  // Sort descending by risk score
  untestedRisks.sort((a, b) => b.riskScore - a.riskScore);

  const testedCount = sourceNodes.length - untestedRisks.length;
  const coveragePercent = sourceNodes.length > 0 ? Math.round((testedCount / sourceNodes.length) * 100) : 100;
  const criticalGaps = untestedRisks.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH');

  return {
    totalSourceFiles: sourceNodes.length,
    testedSourceFiles: testedCount,
    untestedSourceFiles: untestedRisks.length,
    coveragePercentage: coveragePercent,
    testSuitesCount: testNodes.length,
    criticalGaps: criticalGaps.slice(0, 10),
    untestedFiles: untestedRisks,
  };
}

