import { ArchitectureRule, ArchitectureRuleContext } from '../types.js';
import { ArchitectureIssue } from '@devarchitect/contracts';

export const enforcePublicApiRule: ArchitectureRule = {
  id: 'enforce-public-api',
  name: 'Enforce Public API Boundaries',
  description: 'Requires consumers to import features/modules through their public index entry point',
  defaultSeverity: 'warning',
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const issues: ArchitectureIssue[] = [];
    const nodeMap = new Map(context.nodes.map(n => [n.path, n]));

    for (const edge of context.edges) {
      if (edge.isExternal) continue;

      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      // If source and target belong to different modules or features
      if (sourceNode?.feature && targetNode?.feature && sourceNode.feature !== targetNode.feature) {
        // Deep import check: e.g. importing src/features/X/components/Y instead of src/features/X or src/features/X/index
        const isIndex = targetNode.name === 'index.ts' || targetNode.name === 'index.tsx' || targetNode.name === 'index.js';
        if (!isIndex) {
          issues.push({
            id: `public-api-${edge.source}->${edge.target}`,
            ruleId: 'enforce-public-api',
            severity: 'warning',
            message: `Deep import into feature '${targetNode.feature}': '${edge.target}' should be accessed via the feature's public API.`,
            filePath: edge.source,
            evidence: [`${edge.source} -> ${edge.target}`],
            suggestion: `Export the needed functionality from 'src/features/${targetNode.feature}/index.ts' and import from there.`,
            dimension: 'architecture',
          });
        }
      }
    }

    return issues;
  },
};
