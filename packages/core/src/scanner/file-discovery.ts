import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import ignore, { Ignore } from 'ignore';

export interface FileDiscoveryOptions {
  include?: string[];
  exclude?: string[];
  respectGitignore?: boolean;
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function loadGitignore(rootDir: string): Ignore | null {
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    const ig = ignore();
    ig.add(content);
    return ig;
  } catch {
    return null;
  }
}

export async function discoverFiles(
  rootDir: string,
  options: FileDiscoveryOptions = {}
): Promise<string[]> {
  const include = options.include && options.include.length > 0
    ? options.include
    : ['**/*'];

  const defaultExcludes = [
    '**/node_modules/**',
    '**/.git/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/.devarchitect/cache/**',
    '**/.devarchitect/reports/**',
    '**/*.log'
  ];

  const exclude = Array.from(new Set([
    ...defaultExcludes,
    ...(options.exclude || [])
  ]));

  const ig = options.respectGitignore !== false ? loadGitignore(rootDir) : null;

  const entries = await fg(include, {
    cwd: rootDir,
    ignore: exclude,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  });

  const normalized = entries.map(normalizePath);

  if (!ig) {
    return normalized.sort();
  }

  // Filter using .gitignore
  const filtered = normalized.filter(file => !ig.ignores(file));
  return filtered.sort();
}

