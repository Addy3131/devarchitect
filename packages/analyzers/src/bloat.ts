import fs from 'node:fs';
import path from 'node:path';
import { ProjectNode } from '@devarchitect/contracts';

export interface BloatIssue {
  filePath: string;
  line: number;
  type: 'barrel-trap' | 'server-in-client' | 'wildcard-import';
  specifier: string;
  message: string;
  suggestedFix: string;
}

export interface BundleBloatReport {
  totalIssues: number;
  barrelTrapsCount: number;
  serverInClientCount: number;
  wildcardImportsCount: number;
  issues: BloatIssue[];
}

const SERVER_ONLY_MODULES = new Set([
  'fs', 'node:fs', 'fs/promises', 'node:fs/promises',
  'child_process', 'node:child_process',
  'net', 'node:net', 'tls', 'node:tls',
  'cluster', 'node:cluster',
  'bcrypt', 'bcryptjs', 'argon2',
  '@prisma/client', 'prisma', 'typeorm', 'pg', 'mysql2', 'mongodb', 'mongoose', 'knex',
  'ioredis', 'redis'
]);

export function analyzeBundleBloat(
  rootDir: string,
  nodes: ProjectNode[]
): BundleBloatReport {
  const issues: BloatIssue[] = [];

  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

  for (const node of nodes) {
    if (node.type === 'config' || node.type === 'asset' || node.type === 'test') continue;

    const fullPath = path.isAbsolute(node.path) ? node.path : path.join(rootDir, node.path);
    if (!fs.existsSync(fullPath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const isClientFile =
      node.type === 'component' ||
      node.type === 'route' ||
      node.path.includes('/components/') ||
      node.path.includes('/ui/') ||
      node.path.endsWith('.tsx') ||
      node.path.endsWith('.jsx');

    const lines = content.split(/\r?\n/);
    lines.forEach((lineText, idx) => {
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(lineText)) !== null) {
        const importClause = match[1].trim();
        const specifier = match[2].trim();

        // 1. Server-Only Modules in Client Files
        if (isClientFile && SERVER_ONLY_MODULES.has(specifier)) {
          issues.push({
            filePath: node.path,
            line: idx + 1,
            type: 'server-in-client',
            specifier,
            message: `Server-only module '${specifier}' imported in client-side file. This will break browser bundles or leak server logic.`,
            suggestedFix: `Move server operations to an API route handler or server action.`,
          });
        }

        // 2. Heavy Barrel Import Traps: lodash
        if (specifier === 'lodash' && importClause.startsWith('{')) {
          issues.push({
            filePath: node.path,
            line: idx + 1,
            type: 'barrel-trap',
            specifier,
            message: `Barrel import from 'lodash' pulls entire 70KB+ library into client bundle, defeating tree-shaking.`,
            suggestedFix: `Use direct deep import (e.g. 'lodash/debounce' or 'lodash-es').`,
          });
        }

        // 3. Massive Icon Wildcard Imports
        if (
          importClause.startsWith('* as') &&
          (specifier.includes('lucide-react') || specifier.includes('react-icons') || specifier.includes('@heroicons'))
        ) {
          issues.push({
            filePath: node.path,
            line: idx + 1,
            type: 'wildcard-import',
            specifier,
            message: `Wildcard import '* as' from icon library '${specifier}' bundles hundreds of unrendered SVGs.`,
            suggestedFix: `Import only the specific icons used: 'import { IconName } from "${specifier}"'.`,
          });
        }
      }
    });
  }

  const barrelTrapsCount = issues.filter(i => i.type === 'barrel-trap').length;
  const serverInClientCount = issues.filter(i => i.type === 'server-in-client').length;
  const wildcardImportsCount = issues.filter(i => i.type === 'wildcard-import').length;

  return {
    totalIssues: issues.length,
    barrelTrapsCount,
    serverInClientCount,
    wildcardImportsCount,
    issues,
  };
}

