import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  analyzeReactRerenders,
  analyzeTypeHealth,
  analyzeCodeSmells,
  simulateContractImpact
} from '../packages/analyzers/src/index.js';
import { runProjectDiscovery, buildProjectGraph } from '../packages/core/src/index.js';

describe('Advanced Analyzers & Safety Simulators', () => {
  const reactExampleDir = path.resolve(__dirname, '../examples/react-basic');

  it('analyzes React re-renders and allocations', async () => {
    const { nodes } = await runProjectDiscovery(reactExampleDir);
    const result = analyzeReactRerenders(reactExampleDir, nodes);

    expect(result.componentsAnalyzed).toBeGreaterThanOrEqual(1);
    expect(result.issues).toBeDefined();
  });

  it('analyzes TypeScript health and any usage', async () => {
    const { discovery, nodes } = await runProjectDiscovery(reactExampleDir);
    const { graph, parsedFiles } = buildProjectGraph(reactExampleDir, nodes, discovery.typeScript);

    const result = analyzeTypeHealth(reactExampleDir, nodes, graph.getAllEdges(), parsedFiles);
    expect(result.typeSafetyScore).toBeGreaterThanOrEqual(80);
    expect(result.totalTypesDeclared).toBeGreaterThanOrEqual(1);
  });

  it('analyzes code smells and anti-patterns', async () => {
    const { nodes } = await runProjectDiscovery(reactExampleDir);
    const result = analyzeCodeSmells(reactExampleDir, nodes);

    expect(result.totalSmells).toBeDefined();
    expect(Array.isArray(result.smells)).toBe(true);
  });

  it('simulates contract impact and maps downstream consumers before modification', async () => {
    const { discovery, nodes } = await runProjectDiscovery(reactExampleDir);
    const { graph, parsedFiles } = buildProjectGraph(reactExampleDir, nodes, discovery.typeScript);

    const report = simulateContractImpact(
      reactExampleDir,
      'src/services/productService.ts',
      nodes,
      graph.getAllEdges(),
      graph,
      parsedFiles
    );

    expect(report.targetFile).toBe('src/services/productService.ts');
    expect(report.contractMembers.length).toBeGreaterThanOrEqual(1);
    // At least one exported member
    expect(report.contractMembers.some(m => m.name === 'fetchProducts')).toBe(true);
    // useProducts imports productService
    expect(report.consumers.length).toBeGreaterThanOrEqual(1);
    expect(report.consumers.some(c => c.consumerFile.includes('useProducts'))).toBe(true);
    expect(report.safeRefactoringGuide.length).toBeGreaterThan(0);
  });
});
