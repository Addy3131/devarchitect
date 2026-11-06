import { describe, it, expect } from 'vitest';
import { ArchitectureGraph } from '../packages/graph/src/index.js';
import { ArchitectureRuleEngine, ALL_BUILTIN_RULES } from '../packages/rules/src/index.js';
import { DEFAULT_CONFIG } from '../packages/config/src/index.js';
import { ProjectNode } from '../packages/contracts/src/index.js';

describe('Architecture Rule Engine & Policies', () => {
  const engine = new ArchitectureRuleEngine();

  const createMockNode = (id: string, type: any, feature?: string): ProjectNode => ({
    id,
    path: id,
    name: id.split('/').pop()!,
    type,
    language: 'typescript',
    feature,
    metrics: { complexity: 1, linesOfCode: 20, dependencyCount: 0, dependentCount: 0, exportCount: 1, importCount: 1 },
    metadata: {},
  });

  it('detects circular dependency violations', () => {
    const nodeA = createMockNode('src/A.ts', 'service');
    const nodeB = createMockNode('src/B.ts', 'service');
    const graph = new ArchitectureGraph([nodeA, nodeB]);
    graph.addEdge({ source: 'src/A.ts', target: 'src/B.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });
    graph.addEdge({ source: 'src/B.ts', target: 'src/A.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });

    const issues = engine.evaluate({
      graph,
      nodes: [nodeA, nodeB],
      edges: graph.getAllEdges(),
      config: DEFAULT_CONFIG,
    });

    const cycleIssue = issues.find(i => i.ruleId === 'no-circular-dependencies');
    expect(cycleIssue).toBeDefined();
    expect(cycleIssue?.severity).toBe('error');
  });

  it('detects cross-feature violations in feature-sliced preset', () => {
    const checkoutNode = createMockNode('src/features/checkout/CheckoutForm.tsx', 'component', 'checkout');
    const cartNode = createMockNode('src/features/cart/CartDrawer.tsx', 'component', 'cart');
    const graph = new ArchitectureGraph([checkoutNode, cartNode]);

    // checkoutForm illegally directly imports internal cartDrawer
    graph.addEdge({
      source: checkoutNode.path,
      target: cartNode.path,
      type: 'imports',
      isExternal: false,
      specifiers: ['CartDrawer'],
      isTypeOnly: false,
      isDynamic: false,
    });

    const issues = engine.evaluate({
      graph,
      nodes: [checkoutNode, cartNode],
      edges: graph.getAllEdges(),
      config: {
        ...DEFAULT_CONFIG,
        architecture: {
          ...DEFAULT_CONFIG.architecture,
          preset: 'feature-sliced',
        },
      },
    });

    const crossIssue = issues.find(i => i.ruleId === 'no-cross-feature-imports');
    expect(crossIssue).toBeDefined();
    expect(crossIssue?.message).toContain("Feature 'checkout' directly imports from feature 'cart'");
  });

  it('detects UI components importing database drivers directly', () => {
    const uiNode = createMockNode('src/components/UserCard.tsx', 'component');
    const graph = new ArchitectureGraph([uiNode]);
    graph.addEdge({
      source: uiNode.path,
      target: '@prisma/client',
      type: 'imports',
      isExternal: true,
      specifiers: ['PrismaClient'],
      isTypeOnly: false,
      isDynamic: false,
    });

    const issues = engine.evaluate({
      graph,
      nodes: [uiNode],
      edges: graph.getAllEdges(),
      config: DEFAULT_CONFIG,
    });

    const dbIssue = issues.find(i => i.ruleId === 'no-ui-to-database');
    expect(dbIssue).toBeDefined();
    expect(dbIssue?.severity).toBe('error');
  });
});

