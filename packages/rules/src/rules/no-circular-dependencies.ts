import { ArchitectureRule, ArchitectureRuleContext } from '../types.js';
import { ArchitectureIssue } from '@devarchitect/contracts';
import { detectCycles } from '@devarchitect/graph';

export const noCircularDependenciesRule: ArchitectureRule = {
  id: 'no-circular-dependencies',
  name: 'No Circular Dependencies',
  description: 'Disallows circular dependency import cycles between modules',
  defaultSeverity: 'error',
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const cycles = detectCycles(context.graph);
    const issues: ArchitectureIssue[] = [];

    for (const cycle of cycles) {
      issues.push({
        id: cycle.id,
        ruleId: 'no-circular-dependencies',
        severity: 'error',
        message: `Circular dependency cycle detected: ${cycle.path.join(' -> ')}`,
        filePath: cycle.path[0],
        evidence: cycle.path,
        suggestion: 'Refactor shared types or functions into a separate utility or shared module.',
        dimension: 'architecture',
      });
    }

    return issues;
  },
};
