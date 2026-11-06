import { ArchitectureRule, ArchitectureRuleContext } from '../types.js';
import { ArchitectureIssue } from '@devarchitect/contracts';

export const noUnresolvedImportsRule: ArchitectureRule = {
  id: 'no-unresolved-imports',
  name: 'No Unresolved Local Imports',
  description: 'Flags local relative or aliased imports that cannot be resolved to any file',
  defaultSeverity: 'error',
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const issues: ArchitectureIssue[] = [];

    for (const edge of context.edges) {
      if (edge.isExternal) continue;

      if (!context.graph.hasNode(edge.target)) {
        issues.push({
          id: `unresolved-${edge.source}->${edge.target}`,
          ruleId: 'no-unresolved-imports',
          severity: 'error',
          message: `Cannot resolve import '${edge.target}' from '${edge.source}'. File does not exist.`,
          filePath: edge.source,
          evidence: [`Import specifier '${edge.target}' not found in project`],
          suggestion: 'Check file path, spelling, or ensure file exists.',
          dimension: 'dependencies',
        });
      }
    }

    return issues;
  },
};
