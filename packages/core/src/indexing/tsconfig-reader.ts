import fs from 'node:fs';
import path from 'node:path';
import { TypeScriptConfigInfo, PathAlias } from '@devarchitect/contracts';

export function readTypeScriptConfig(rootDir: string): TypeScriptConfigInfo {
  const possiblePaths = [
    path.join(rootDir, 'tsconfig.json'),
    path.join(rootDir, 'tsconfig.app.json'),
  ];

  let configPath: string | undefined;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      configPath = p;
      break;
    }
  }

  if (!configPath) {
    try {
      const entries = fs.readdirSync(rootDir, { withFileTypes: true });
      const ignoreDirs = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', '.turbo', '.vscode', '.agents', '.claude', '.devarchitect']);
      for (const entry of entries) {
        if (entry.isDirectory() && !ignoreDirs.has(entry.name)) {
          const subTs = path.join(rootDir, entry.name, 'tsconfig.json');
          if (fs.existsSync(subTs)) {
            configPath = subTs;
            break;
          }
        }
      }
    } catch {
      // Ignore reading errors
    }
  }

  if (!configPath) {
    return {
      exists: false,
      pathAliases: [],
    };
  }

  try {
    const rawContent = fs.readFileSync(configPath, 'utf8');
    // Strip comments (simple JSON with comments stripping)
    const stripped = rawContent.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
    const parsed = JSON.parse(stripped);
    const compilerOptions = parsed.compilerOptions || {};

    const pathAliases: PathAlias[] = [];
    if (compilerOptions.paths && typeof compilerOptions.paths === 'object') {
      for (const [prefix, targets] of Object.entries(compilerOptions.paths)) {
        if (Array.isArray(targets)) {
          pathAliases.push({
            prefix,
            targets: targets.map(t => String(t)),
          });
        }
      }
    }

    return {
      exists: true,
      configPath: path.relative(rootDir, configPath).replace(/\\/g, '/'),
      target: compilerOptions.target,
      module: compilerOptions.module,
      strict: compilerOptions.strict,
      pathAliases,
    };
  } catch {
    return {
      exists: true,
      configPath: path.relative(rootDir, configPath).replace(/\\/g, '/'),
      pathAliases: [],
    };
  }
}

