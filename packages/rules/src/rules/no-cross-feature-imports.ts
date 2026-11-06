import { ArchitectureRule, ArchitectureRuleContext } from '../types.js';
import { ArchitectureIssue } from '@devarchitect/contracts';

export const noCrossFeatureImportsRule: ArchitectureRule = {
  id: 'no-cross-feature-imports',
  name: 'No Cross-Feature Direct Imports',
  description: 'Prevents one feature slice from directly importing internal modules of another feature slice',
  defaultSeverity: 'error',
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const issues: ArchitectureIssue[] = [];
    const nodeMap = new Map(context.nodes.map(n => [n.path, n]));

    for (const edge of context.edges) {
      if (edge.isExternal) continue;

      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode?.feature && targetNode?.feature) {
        if (sourceNode.feature !== targetNode.feature) {
          issues.push({
            id: `cross-feature-${edge.source}->${edge.target}`,
            ruleId: 'no-cross-feature-imports',
            severity: 'error',
            message: `Feature '${sourceNode.feature}' directly imports from feature '${targetNode.feature}' (${edge.target}).`,
            filePath: edge.source,
            evidence: [`${edge.source} -> ${edge.target}`],
            suggestion: `Extract the shared dependency into a shared module or coordinate via an entity/widget layer.`,
            dimension: 'architecture',
          });
        }
      }
    }

    return issues;
  },
};
