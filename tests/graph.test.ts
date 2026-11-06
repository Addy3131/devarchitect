import { describe, it, expect } from 'vitest';
import {
  ArchitectureGraph,
  detectCycles,
  calculateImpact,
  toMermaidFlowchart,
} from '../packages/graph/src/index.js';
import { ProjectNode } from '../packages/contracts/src/index.js';

describe('Graph Engine & Impact Calculation', () => {
  const createMockNode = (id: string, name: string, feature?: string): ProjectNode => ({
    id,
    path: id,
    name,
    type: 'service',
    language: 'typescript',
    feature,
    metrics: {
      complexity: 5,
      linesOfCode: 50,
      dependencyCount: 0,
      dependentCount: 0,
      exportCount: 1,
      importCount: 1,
    },
    metadata: {},
  });

  it('detects circular dependencies accurately', () => {
    const nodeA = createMockNode('src/A.ts', 'A.ts');
    const nodeB = createMockNode('src/B.ts', 'B.ts');
    const nodeC = createMockNode('src/C.ts', 'C.ts');

    const graph = new ArchitectureGraph([nodeA, nodeB, nodeC]);
    // Cycle: A -> B -> C -> A
    graph.addEdge({ source: 'src/A.ts', target: 'src/B.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });
    graph.addEdge({ source: 'src/B.ts', target: 'src/C.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });
    graph.addEdge({ source: 'src/C.ts', target: 'src/A.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });

    const cycles = detectCycles(graph);
    expect(cycles.length).toBe(1);
    expect(cycles[0].length).toBe(3);
    expect(cycles[0].path).toContain('src/A.ts');
  });

  it('calculates blast radius and transitive dependents', () => {
    // Tree: Target (UserService) <- useAuth (hook) <- LoginPage (feature: auth)
    //                          <- useCheckout (hook) <- CheckoutPage (feature: checkout)
    const userService = createMockNode('src/services/UserService.ts', 'UserService.ts');
    const useAuth = createMockNode('src/hooks/useAuth.ts', 'useAuth.ts', 'auth');
    const loginPage = createMockNode('src/features/auth/LoginPage.tsx', 'LoginPage.tsx', 'auth');
    const useCheckout = createMockNode('src/features/checkout/useCheckout.ts', 'useCheckout.ts', 'checkout');
    const checkoutPage = createMockNode('src/features/checkout/CheckoutPage.tsx', 'CheckoutPage.tsx', 'checkout');

    const graph = new ArchitectureGraph([
      userService,
      useAuth,
      loginPage,
      useCheckout,
      checkoutPage
    ]);

    // useAuth imports UserService
    graph.addEdge({ source: 'src/hooks/useAuth.ts', target: 'src/services/UserService.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });
    // LoginPage imports useAuth
    graph.addEdge({ source: 'src/features/auth/LoginPage.tsx', target: 'src/hooks/useAuth.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });
    // useCheckout imports UserService
    graph.addEdge({ source: 'src/features/checkout/useCheckout.ts', target: 'src/services/UserService.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });
    // CheckoutPage imports useCheckout
    graph.addEdge({ source: 'src/features/checkout/CheckoutPage.tsx', target: 'src/features/checkout/useCheckout.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });

    const impact = calculateImpact(graph, 'src/services/UserService.ts');

    expect(impact.directDependents.length).toBe(2);
    expect(impact.transitiveDependents.length).toBe(4);
    expect(impact.affectedFeatures).toContain('auth');
    expect(impact.affectedFeatures).toContain('checkout');
    expect(impact.riskAssessment).toBe('HIGH');
  });

  it('generates valid Mermaid flowchart syntax', () => {
    const nodeA = createMockNode('src/A.ts', 'A.ts');
    const nodeB = createMockNode('src/B.ts', 'B.ts');
    const graph = new ArchitectureGraph([nodeA, nodeB]);
    graph.addEdge({ source: 'src/A.ts', target: 'src/B.ts', type: 'imports', isExternal: false, specifiers: [], isTypeOnly: false, isDynamic: false });

    const mermaid = toMermaidFlowchart(graph);
    expect(mermaid).toContain('flowchart TD');
    expect(mermaid).toContain('src_A_ts');
    expect(mermaid).toContain('src_B_ts');
  });
});

