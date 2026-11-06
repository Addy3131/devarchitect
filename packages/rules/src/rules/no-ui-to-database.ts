import { ArchitectureRule, ArchitectureRuleContext } from '../types.js';
import { ArchitectureIssue } from '@devarchitect/contracts';

const DATABASE_PACKAGES = new Set([
  '@prisma/client',
  'prisma',
  'drizzle-orm',
  'typeorm',
  'mongoose',
  'pg',
  'mysql2',
  'sqlite3',
  'better-sqlite3',
  'knex',
  'sequelize'
]);

export const noUiToDatabaseRule: ArchitectureRule = {
  id: 'no-ui-to-database',
  name: 'No UI to Database Direct Imports',
  description: 'Prevents UI components and client hooks from importing database ORMs and drivers',
  defaultSeverity: 'error',
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[] {
    const issues: ArchitectureIssue[] = [];
    const nodeMap = new Map(context.nodes.map(n => [n.path, n]));

    for (const edge of context.edges) {
      if (!edge.isExternal) continue;

      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode && (sourceNode.type === 'component' || sourceNode.type === 'hook')) {
        if (DATABASE_PACKAGES.has(edge.target)) {
          issues.push({
            id: `ui-to-db-${edge.source}->${edge.target}`,
            ruleId: 'no-ui-to-database',
            severity: 'error',
            message: `UI ${sourceNode.type} '${edge.source}' directly imports database driver '${edge.target}'.`,
            filePath: edge.source,
            evidence: [`${edge.source} imports ${edge.target}`],
            suggestion: 'Move database queries to a backend API route, server action, or service layer.',
            dimension: 'architecture',
          });
        }
      }
    }

    return issues;
  },
};
