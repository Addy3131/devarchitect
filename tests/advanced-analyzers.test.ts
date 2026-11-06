import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  analyzeReactRerenders,
  analyzeTypeHealth,
  analyzeCodeSmells,
  simulateContractImpact,
  answerCodebaseQuestion,
  analyzeEnvironmentVariables,
  analyzeDependencies,
  analyzeBundleBloat,
  analyzeTestMap
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

  it('answers architecture, dependency, location, and complexity questions with high accuracy', async () => {
    const { discovery, nodes } = await runProjectDiscovery(reactExampleDir);
    const { graph } = buildProjectGraph(reactExampleDir, nodes, discovery.typeScript);

    // 1. Feature Architecture Question
    const q1 = answerCodebaseQuestion(reactExampleDir, 'How is checkout architected?', nodes, graph.getAllEdges(), graph);
    expect(q1.topic).toContain('CHECKOUT');
    expect(q1.relatedFiles.some(f => f.includes('checkout'))).toBe(true);
    expect(q1.confidence).toBe('High');

    // 2. Downstream Dependents Question
    const q2 = answerCodebaseQuestion(reactExampleDir, 'Who uses productService?', nodes, graph.getAllEdges(), graph);
    expect(q2.topic).toContain('productService');
    expect(q2.relatedFiles.some(f => f.includes('useProducts'))).toBe(true);

    // 3. Location Question
    const q3 = answerCodebaseQuestion(reactExampleDir, 'Where is CheckoutForm?', nodes, graph.getAllEdges(), graph);
    expect(q3.topic).toContain('CheckoutForm');
    expect(q3.flowSteps.some(s => s.includes('Primary Location'))).toBe(true);

    // 4. Complexity Hotspots Question
    const q4 = answerCodebaseQuestion(reactExampleDir, 'What are the most complex files?', nodes, graph.getAllEdges(), graph);
    expect(q4.topic).toContain('Complexity Hotspots');
    expect(q4.relatedFiles.length).toBeGreaterThan(0);
  });

  it('audits environment variables and prevents client secret leaks', async () => {
    const { nodes } = await runProjectDiscovery(reactExampleDir);
    const report = analyzeEnvironmentVariables(reactExampleDir, nodes);

    expect(Array.isArray(report.usedVariables)).toBe(true);
    expect(Array.isArray(report.clientSecretLeaks)).toBe(true);
    expect(report.clientSecretLeaks.length).toBe(0);
  });

  it('detects phantom dependencies and zombie packages', async () => {
    const { nodes } = await runProjectDiscovery(reactExampleDir);
    const report = analyzeDependencies(reactExampleDir, nodes);

    expect(report.totalPackagesDeclared).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(report.phantomDependencies)).toBe(true);
    expect(Array.isArray(report.zombieDependencies)).toBe(true);
  });

  it('audits bundle bloat and tree-shaking traps', async () => {
    const { nodes } = await runProjectDiscovery(reactExampleDir);
    const report = analyzeBundleBloat(reactExampleDir, nodes);

    expect(report.totalIssues).toBeDefined();
    expect(report.barrelTrapsCount).toBeGreaterThanOrEqual(0);
    expect(report.serverInClientCount).toBeGreaterThanOrEqual(0);
  });

  it('analyzes architectural test coverage gaps and maps untested files', async () => {
    const { discovery, nodes } = await runProjectDiscovery(reactExampleDir);
    const { graph } = buildProjectGraph(reactExampleDir, nodes, discovery.typeScript);
    const report = analyzeTestMap(reactExampleDir, nodes, graph);

    expect(report.totalSourceFiles).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(report.untestedFiles)).toBe(true);
    expect(report.coveragePercentage).toBeDefined();
  });
});

