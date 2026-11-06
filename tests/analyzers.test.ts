import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../packages/graph/src/index.js';
import {
  calculateProjectHealth,
  analyzeComplexity,
  detectDeadCode,
  createArchitectureFingerprint,
  calculateArchitectureDrift
} from '../packages/analyzers/src/index.js';
import { ProjectNode, ProjectSummary } from '../packages/contracts/src/index.js';

describe('Code Analyzers', () => {
  const createMockNode = (id: string, complexity = 2, loc = 50): ProjectNode => ({
    id,
    path: id,
    name: id.split('/').pop()!,
    type: 'component',
    language: 'typescript',
    metrics: { complexity, linesOfCode: loc, dependencyCount: 0, dependentCount: 0, exportCount: 1, importCount: 1 },
    metadata: {},
  });

  it('calculates transparent health score', () => {
    const nodeA = createMockNode('src/A.tsx', 5, 50);
    const nodeB = createMockNode('src/B.tsx', 4, 60);
    const graph = new ArchitectureGraph([nodeA, nodeB]);

    const health = calculateProjectHealth({
      nodes: [nodeA, nodeB],
      issues: [],
      graph,
      hasTests: true,
      duplicateBlockCount: 0,
    });

    expect(health.overallScore).toBeGreaterThanOrEqual(90);
    expect(health.status).toBe('healthy');
    expect(health.grade).toBe('A');
    expect(health.dimensions.architecture.score).toBe(100);
  });

  it('detects complexity hotspots', () => {
    const node = createMockNode('src/Complex.tsx', 30, 400);
    const parsedFiles = new Map([
      ['src/Complex.tsx', {
        filePath: 'src/Complex.tsx',
        imports: [],
        exports: [],
        symbols: [{ name: 'megaFunction', kind: 'function' as const, line: 10, complexity: 28 }],
        linesOfCode: 400,
        complexity: 30,
      }],
    ]);

    const result = analyzeComplexity([node], parsedFiles);
    expect(result.hotspots.length).toBe(1);
    expect(result.hotspots[0].risk).toBe('critical');
    expect(result.oversizedFiles.length).toBe(1);
  });

  it('detects dead code and unused exports', () => {
    const nodeA = createMockNode('src/components/Header.tsx', 2, 20);
    const nodeB = createMockNode('src/services/math.ts', 2, 20);

    const edges = [{
      source: 'src/components/Header.tsx',
      target: 'src/services/math.ts',
      type: 'imports' as const,
      isExternal: false,
      specifiers: ['add'],
      isTypeOnly: false,
      isDynamic: false,
    }];

    const parsedFiles = new Map([
      ['src/services/math.ts', {
        filePath: 'src/services/math.ts',
        imports: [],
        exports: [
          { name: 'add', isDefault: false, isTypeOnly: false, line: 2 },
          { name: 'unusedSubtract', isDefault: false, isTypeOnly: false, line: 5 },
        ],
        symbols: [],
        linesOfCode: 20,
        complexity: 2,
      }],
    ]);

    const result = detectDeadCode([nodeA, nodeB], edges, parsedFiles, ['src/main.tsx']);
    expect(result.unusedExports.some(e => e.exportName === 'unusedSubtract')).toBe(true);
    expect(result.unusedExports.some(e => e.exportName === 'add')).toBe(false);
  });

  it('generates fingerprint and detects architecture drift', () => {
    const project: ProjectSummary = {
      name: 'test-app',
      rootDir: '/app',
      framework: 'react',
      language: 'TypeScript',
      packageManager: 'pnpm',
      runtime: 'node',
      isMonorepo: false,
      workspaces: [],
    };

    const nodeA = createMockNode('src/features/auth/Login.tsx', 2, 20);
    nodeA.feature = 'auth';
    const nodeB = createMockNode('src/features/cart/Cart.tsx', 2, 20);
    nodeB.feature = 'cart';

    const edge1 = { source: 'src/features/auth/Login.tsx', target: 'src/components/Button.tsx', type: 'imports' as const, isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false };

    const fp1 = createArchitectureFingerprint(project, [nodeA, nodeB], [edge1], 0);
    expect(fp1.hash).toBeDefined();

    // Now introduce an architectural change (drift): add new cross-feature edge
    const edge2 = { source: 'src/features/auth/Login.tsx', target: 'src/features/cart/Cart.tsx', type: 'imports' as const, isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false };
    const fp2 = createArchitectureFingerprint(project, [nodeA, nodeB], [edge1, edge2], 0);

    const drift = calculateArchitectureDrift(fp1, fp2);
    expect(drift.hasDiverged).toBe(true);
    expect(drift.changes.addedEdges.length).toBe(1);
    expect(drift.driftScore).toBeGreaterThan(0);
  });
});

