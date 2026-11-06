import path from 'node:path';
import fs from 'node:fs';
import { PathAlias } from '@devarchitect/contracts';

export interface ResolveImportResult {
  isExternal: boolean;
  target: string; // canonical relative path if internal, package name if external
  resolvedPath?: string; // full absolute path if internal
}

export class ImportResolver {
  private knownFiles: Set<string>;
  private pathAliases: PathAlias[];
  private rootDir: string;

  constructor(rootDir: string, fileList: string[] = [], pathAliases: PathAlias[] = []) {
    this.rootDir = path.resolve(rootDir);
    this.knownFiles = new Set(fileList.map(f => this.normalize(f)));
    this.pathAliases = pathAliases;
  }

  private normalize(p: string): string {
    return p.replace(/\\/g, '/');
  }

  public resolve(importerRelativePath: string, specifier: string): ResolveImportResult {
    // 1. External package checks (e.g., 'react', 'lodash', '@tanstack/react-query')
    // Relative starts with '.' or '/'
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.' || specifier === '..';
    const isAlias = this.pathAliases.some(alias => {
      const prefix = alias.prefix.replace(/\*$/, '');
      return specifier.startsWith(prefix);
    });

    if (!isRelative && !isAlias) {
      // Treat as external package
      return {
        isExternal: true,
        target: specifier,
      };
    }

    let candidateBase: string | null = null;

    if (isRelative) {
      const importerDir = path.dirname(importerRelativePath);
      candidateBase = path.join(importerDir, specifier);
    } else if (isAlias) {
      // Apply path alias
      for (const alias of this.pathAliases) {
        const prefix = alias.prefix.replace(/\*$/, '');
        if (specifier.startsWith(prefix)) {
          const remainder = specifier.slice(prefix.length);
          const targetTemplate = alias.targets[0] || '';
          const targetBase = targetTemplate.replace(/\*$/, '');
          candidateBase = path.join(targetBase, remainder);
          break;
        }
      }
    }

    if (!candidateBase) {
      return { isExternal: true, target: specifier };
    }

    candidateBase = this.normalize(candidateBase);

    // Try extensions and index files
    const extensionsToTry = [
      '',
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '/index.ts',
      '/index.tsx',
      '/index.js',
      '/index.jsx'
    ];

    // If candidate ends with .js or .jsx, also try .ts and .tsx (TypeScript ESM pattern)
    if (candidateBase.endsWith('.js') || candidateBase.endsWith('.jsx')) {
      const stem = candidateBase.replace(/\.(js|jsx)$/, '');
      extensionsToTry.unshift(
        stem + '.ts',
        stem + '.tsx',
        stem + '/index.ts',
        stem + '/index.tsx'
      );
    }

    for (const ext of extensionsToTry) {
      const testPath = ext.startsWith(candidateBase.replace(/\.(js|jsx)$/, ''))
        ? ext
        : this.normalize(candidateBase + ext);

      // Check if known file
      if (this.knownFiles.has(testPath)) {
        return {
          isExternal: false,
          target: testPath,
          resolvedPath: path.resolve(this.rootDir, testPath),
        };
      }

      // Check if file exists on disk
      const absoluteTest = path.resolve(this.rootDir, testPath);
      if (fs.existsSync(absoluteTest) && fs.statSync(absoluteTest).isFile()) {
        const rel = this.normalize(path.relative(this.rootDir, absoluteTest));
        return {
          isExternal: false,
          target: rel,
          resolvedPath: absoluteTest,
        };
      }
    }

    // Unresolved local import
    return {
      isExternal: false,
      target: candidateBase,
    };
  }
}

