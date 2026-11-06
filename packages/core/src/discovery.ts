import path from 'node:path';
import {
  ProjectDiscovery,
  RepositoryStats,
  Language,
  ProjectNode
} from '@devarchitect/contracts';
import { loadConfig } from '@devarchitect/config';
import { discoverFiles } from './scanner/file-discovery.js';
import { createProjectNode } from './scanner/categorizer.js';
import { readPackageJson, detectPackageManager, detectMonorepo } from './indexing/package-json-reader.js';
import { readTypeScriptConfig } from './indexing/tsconfig-reader.js';
import { defaultPluginRegistry, FrameworkPluginRegistry } from './plugins/registry.js';
import { FrameworkDetectionContext } from './plugins/types.js';

export interface DiscoveryOptions {
  pluginRegistry?: FrameworkPluginRegistry;
  respectGitignore?: boolean;
}

export async function runProjectDiscovery(
  rootDir: string = process.cwd(),
  options: DiscoveryOptions = {}
): Promise<{
  discovery: ProjectDiscovery;
  nodes: ProjectNode[];
}> {
  const absoluteRoot = path.resolve(rootDir);
  const { config } = loadConfig(absoluteRoot);

  const pkgInfo = readPackageJson(absoluteRoot);
  const tsConfigInfo = readTypeScriptConfig(absoluteRoot);
  const packageManager = detectPackageManager(absoluteRoot);
  const monorepoInfo = detectMonorepo(absoluteRoot, pkgInfo);

  // Discover all repository files based on config include/exclude
  const allFiles = await discoverFiles(absoluteRoot, {
    include: config.analysis.include,
    exclude: config.analysis.exclude,
    respectGitignore: options.respectGitignore,
  });

  const filesSet = new Set(allFiles);

  // Framework detection context
  const context: FrameworkDetectionContext = {
    rootDir: absoluteRoot,
    packageJson: pkgInfo.raw,
    fileList: allFiles,
    hasFile: (rel: string) => filesSet.has(rel.replace(/\\/g, '/')),
    hasDependency: (dep: string) => Boolean(pkgInfo.dependencies[dep]),
    hasDevDependency: (dep: string) => Boolean(pkgInfo.devDependencies[dep]),
    hasAnyDependency: (dep: string) => Boolean(pkgInfo.dependencies[dep] || pkgInfo.devDependencies[dep]),
  };

  const registry = options.pluginRegistry || defaultPluginRegistry;
  const detectionResult = await registry.detect(context);

  // Detect Language
  const hasTs = allFiles.some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
  const hasJs = allFiles.some(f => f.endsWith('.js') || f.endsWith('.jsx'));
  let language: Language = 'unknown';
  if (hasTs && hasJs) {
    language = 'Mixed';
  } else if (hasTs || tsConfigInfo.exists) {
    language = 'TypeScript';
  } else if (hasJs) {
    language = 'JavaScript';
  }

  // Build ProjectNodes and calculate repository stats
  const nodes: ProjectNode[] = [];
  const stats: RepositoryStats = {
    sourceFiles: 0,
    totalFiles: allFiles.length,
    components: 0,
    hooks: 0,
    services: 0,
    utilities: 0,
    routes: 0,
    tests: 0,
    configs: 0,
    features: 0,
    linesOfCode: 0,
  };

  const featuresSet = new Set<string>();

  for (const file of allFiles) {
    const node = createProjectNode(absoluteRoot, file);
    nodes.push(node);

    if (node.language === 'typescript' || node.language === 'typescript-react' || node.language === 'javascript' || node.language === 'javascript-react') {
      stats.sourceFiles++;
    }

    stats.linesOfCode += node.metrics.linesOfCode;

    if (node.feature) {
      featuresSet.add(node.feature);
    }

    switch (node.type) {
      case 'component':
        stats.components++;
        break;
      case 'hook':
        stats.hooks++;
        break;
      case 'service':
        stats.services++;
        break;
      case 'utility':
        stats.utilities++;
        break;
      case 'route':
        stats.routes++;
        break;
      case 'test':
        stats.tests++;
        break;
      case 'config':
        stats.configs++;
        break;
    }
  }

  stats.features = featuresSet.size;

  const discovery: ProjectDiscovery = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    project: {
      name: pkgInfo.name,
      rootDir: absoluteRoot,
      framework: detectionResult.framework,
      frameworkVersion: detectionResult.frameworkVersion,
      language,
      packageManager,
      runtime: 'node',
      isMonorepo: monorepoInfo.isMonorepo,
      workspaces: monorepoInfo.workspaces,
    },
    detected: {
      appRouter: detectionResult.features?.appRouter ?? false,
      pagesRouter: detectionResult.features?.pagesRouter ?? false,
      react: detectionResult.features?.react ?? false,
      tailwind: detectionResult.features?.tailwind ?? false,
      zustand: detectionResult.features?.zustand ?? false,
      tanstackQuery: detectionResult.features?.tanstackQuery ?? false,
      redux: detectionResult.features?.redux ?? false,
      prisma: detectionResult.features?.prisma ?? false,
      drizzle: detectionResult.features?.drizzle ?? false,
      testingFramework: detectionResult.features?.testingFramework ?? null,
      featureModules: detectionResult.features?.featureModules ?? (featuresSet.size > 0 ? 'partial' : 'none'),
      detectedLibraries: Object.keys(pkgInfo.dependencies),
    },
    stats,
    entryPoints: detectionResult.entryPoints || [],
    typeScript: tsConfigInfo,
    packageJson: pkgInfo.raw,
  };

  return {
    discovery,
    nodes,
  };
}

