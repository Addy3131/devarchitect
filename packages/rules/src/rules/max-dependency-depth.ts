import { ArchitectureRule, ArchitectureRuleContext } from '../types.js';
import { ArchitectureIssue } from '@devarchitect/contracts';

export const maxDependencyDepthRule: ArchitectureRule = {
  id: 'max-dependency-depth',
  name: 'Maximum Dependency Depth',
  description: 'Flags files with excessively deep transitive dependency chains',
  defaultSeverity: 'warning',
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const issues: ArchitectureIssue[] = [];
    const maxAllowed = context.config.analysis.maxDependencyDepth || 10;

    for (const node of context.nodes) {
      // Calculate depth from this node using BFS
      let depth = 0;
      const visited = new Set<string>([node.path]);
      let currentLevel = [node.path];

      while (currentLevel.length > 0 && depth <= maxAllowed + 2) {
        const nextLevel: string[] = [];
        for (const curr of currentLevel) {
          const deps = context.graph.getDependencies(curr);
          for (const dep of deps) {
            if (!visited.has(dep) && context.graph.hasNode(dep)) {
              visited.add(dep);
              nextLevel.push(dep);
            }
          }
        }
        if (nextLevel.length > 0) {
          depth++;
        }
        currentLevel = nextLevel;
      }

      if (depth > maxAllowed) {
        issues.push({
          id: `max-depth-${node.path}`,
          ruleId: 'max-dependency-depth',
          severity: 'warning',
          message: `Transitive dependency depth (${depth}) exceeds configured maximum (${maxAllowed}).`,
          filePath: node.path,
          evidence: [`Depth: ${depth} layers deep`],
          suggestion: 'Flatten dependency tree by decoupling intermediate layers or introducing dependency inversion.',
          dimension: 'architecture',
        });
      }
    }

    return issues;
  },
};
