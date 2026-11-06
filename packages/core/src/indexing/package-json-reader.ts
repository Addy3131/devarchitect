import fs from 'node:fs';
import path from 'node:path';
import { PackageManager } from '@devarchitect/contracts';

export interface PackageJsonInfo {
  exists: boolean;
  name: string;
  version?: string;
  raw: Record<string, unknown>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export function readPackageJson(rootDir: string): PackageJsonInfo {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      exists: false,
      name: path.basename(rootDir),
      raw: {},
      dependencies: {},
      devDependencies: {},
      scripts: {},
    };
  }

  try {
    const rawContent = fs.readFileSync(pkgPath, 'utf8');
    const parsed = JSON.parse(rawContent);
    return {
      exists: true,
      name: parsed.name || path.basename(rootDir),
      version: parsed.version,
      raw: parsed,
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
      scripts: parsed.scripts || {},
    };
  } catch {
    return {
      exists: true,
      name: path.basename(rootDir),
      raw: {},
      dependencies: {},
      devDependencies: {},
      scripts: {},
    };
  }
}

export function detectPackageManager(rootDir: string): PackageManager {
  let currentDir = rootDir;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(currentDir, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(currentDir, 'bun.lockb')) || fs.existsSync(path.join(currentDir, 'bun.lock'))) {
      return 'bun';
    }
    if (fs.existsSync(path.join(currentDir, 'package-lock.json'))) {
      return 'npm';
    }

    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  return 'unknown';
}

export function detectMonorepo(rootDir: string, pkgInfo: PackageJsonInfo): { isMonorepo: boolean; workspaces: string[] } {
  const pnpmWorkspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
  if (fs.existsSync(pnpmWorkspacePath)) {
    return { isMonorepo: true, workspaces: ['pnpm-workspace'] };
  }

  const lernaPath = path.join(rootDir, 'lerna.json');
  if (fs.existsSync(lernaPath)) {
    return { isMonorepo: true, workspaces: ['lerna'] };
  }

  const turboPath = path.join(rootDir, 'turbo.json');
  if (fs.existsSync(turboPath)) {
    return { isMonorepo: true, workspaces: ['turborepo'] };
  }

  if (pkgInfo.raw.workspaces) {
    const workspaces = Array.isArray(pkgInfo.raw.workspaces)
      ? (pkgInfo.raw.workspaces as string[])
      : [];
    return { isMonorepo: true, workspaces };
  }

  return { isMonorepo: false, workspaces: [] };
}

