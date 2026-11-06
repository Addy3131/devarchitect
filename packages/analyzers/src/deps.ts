import fs from 'node:fs';
import path from 'node:path';
import { ProjectNode } from '@devarchitect/contracts';

export interface DependencyAuditReport {
  phantomDependencies: Array<{ package: string; importedBy: string[] }>;
  zombieDependencies: string[];
  devDepsInProduction: Array<{ package: string; importedBy: string[] }>;
  totalPackagesDeclared: number;
  totalExternalImports: number;
}

const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
  'module', 'net', 'os', 'path', 'path/posix', 'path/win32', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'stream/consumers', 'stream/promises', 'stream/web', 'string_decoder',
  'timers', 'timers/promises', 'tls', 'trace_events', 'tty', 'url', 'util',
  'util/types', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

export function analyzeDependencies(
  rootDir: string,
  nodes: ProjectNode[]
): DependencyAuditReport {
  // 1. Read package.json
  const pkgPath = path.join(rootDir, 'package.json');
  let dependencies: Record<string, string> = {};
  let devDependencies: Record<string, string> = {};
  let peerDependencies: Record<string, string> = {};

  if (fs.existsSync(pkgPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      dependencies = parsed.dependencies || {};
      devDependencies = parsed.devDependencies || {};
      peerDependencies = parsed.peerDependencies || {};
    } catch {
      // Ignore parse failure
    }
  }

  const allDeclared = new Set([
    ...Object.keys(dependencies),
    ...Object.keys(devDependencies),
    ...Object.keys(peerDependencies),
  ]);

  const prodDeclared = new Set([
    ...Object.keys(dependencies),
    ...Object.keys(peerDependencies),
  ]);

  const devDeclared = new Set(Object.keys(devDependencies));
  const workspacePackageNames = new Set<string>();

  // If monorepo, collect all package names from packages/* and apps/*
  try {
    const subDirs = ['packages', 'apps', 'examples'];
    for (const sub of subDirs) {
      const parentDir = path.join(rootDir, sub);
      if (fs.existsSync(parentDir)) {
        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subPkgPath = path.join(parentDir, entry.name, 'package.json');
            if (fs.existsSync(subPkgPath)) {
              try {
                const subParsed = JSON.parse(fs.readFileSync(subPkgPath, 'utf8'));
                if (subParsed.name) workspacePackageNames.add(subParsed.name);
                if (subParsed.dependencies) {
                  for (const d of Object.keys(subParsed.dependencies)) allDeclared.add(d);
                }
                if (subParsed.devDependencies) {
                  for (const d of Object.keys(subParsed.devDependencies)) allDeclared.add(d);
                }
              } catch {
                // Ignore
              }
            }
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  // 2. Scan all nodes for external imports
  const importUsageMap = new Map<string, Set<string>>();
  const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|export\s+(?:[\w*\s{},]*\s+from\s+)?|require\(\s*)['"]([^'"]+)['"]/g;

  for (const node of nodes) {
    if (node.type === 'config' || node.type === 'asset') continue;

    const fullPath = path.isAbsolute(node.path) ? node.path : path.join(rootDir, node.path);
    if (!fs.existsSync(fullPath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const rawSpecifier = match[1];
      const pkgName = extractPackageName(rawSpecifier);

      if (!pkgName) continue;
      if (NODE_BUILTINS.has(pkgName) || pkgName.startsWith('node:')) continue;

      if (!importUsageMap.has(pkgName)) {
        importUsageMap.set(pkgName, new Set());
      }
      importUsageMap.get(pkgName)!.add(node.path);
    }
  }

  // 3. Classify Phantom Dependencies (used in code, but not declared in package.json)
  const phantomDependencies: Array<{ package: string; importedBy: string[] }> = [];
  for (const [pkg, callers] of importUsageMap.entries()) {
    if (!allDeclared.has(pkg) && !workspacePackageNames.has(pkg)) {
      phantomDependencies.push({
        package: pkg,
        importedBy: Array.from(callers).slice(0, 5),
      });
    }
  }

  // 4. Classify Zombie Dependencies (declared in dependencies, but never imported)
  const zombieDependencies: string[] = [];
  for (const dep of Object.keys(dependencies)) {
    // Exclude types or build tools if placed in dependencies
    if (dep.startsWith('@types/')) continue;
    if (!importUsageMap.has(dep)) {
      zombieDependencies.push(dep);
    }
  }

  // 5. DevDependencies imported in production files (excluding tests)
  const devDepsInProduction: Array<{ package: string; importedBy: string[] }> = [];
  for (const [pkg, callers] of importUsageMap.entries()) {
    if (devDeclared.has(pkg) && !prodDeclared.has(pkg)) {
      const prodCallers = Array.from(callers).filter(
        c => !c.includes('.test.') && !c.includes('.spec.') && !c.includes('/tests/')
      );
      if (prodCallers.length > 0) {
        devDepsInProduction.push({
          package: pkg,
          importedBy: prodCallers.slice(0, 5),
        });
      }
    }
  }

  return {
    phantomDependencies,
    zombieDependencies,
    devDepsInProduction,
    totalPackagesDeclared: allDeclared.size,
    totalExternalImports: importUsageMap.size,
  };
}

function extractPackageName(specifier: string): string | null {
  const trimmed = specifier.trim();

  // Ignore relative, absolute, internal aliases, or non-package strings
  if (
    trimmed.startsWith('.') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('@/') ||
    trimmed.startsWith('~/') ||
    trimmed.startsWith('#') ||
    trimmed.includes(' ') ||
    trimmed.includes('$') ||
    trimmed.includes('(') ||
    trimmed.includes(')') ||
    trimmed.includes('*') ||
    trimmed.includes('\n') ||
    trimmed.includes('\r')
  ) {
    return null;
  }

  // Handle scoped packages: @org/name/... -> @org/name
  if (trimmed.startsWith('@')) {
    const parts = trimmed.split('/');
    if (parts.length >= 2) {
      const candidate = `${parts[0]}/${parts[1]}`;
      return isValidNpmPackageName(candidate) ? candidate : null;
    }
    return null;
  }

  // Standard package: pkg/subpath -> pkg
  const candidate = trimmed.split('/')[0];
  return isValidNpmPackageName(candidate) ? candidate : null;
}

function isValidNpmPackageName(name: string): boolean {
  return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i.test(name);
}
