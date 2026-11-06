import path from 'node:path';
import fs from 'node:fs';
import { NodeType, ProjectNode } from '@devarchitect/contracts';
import { normalizePath } from './file-discovery.js';
import { calculateFileHash } from './hasher.js';

export interface CategorizedFileInfo {
  nodeType: NodeType;
  feature?: string;
  layer?: string;
  language: string;
  linesOfCode: number;
}

export function detectLanguage(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.tsx':
      return 'typescript-react';
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'javascript';
    case '.jsx':
      return 'javascript-react';
    case '.json':
      return 'json';
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      return 'stylesheet';
    case '.html':
      return 'html';
    case '.md':
    case '.mdx':
      return 'markdown';
    case '.vue':
      return 'vue';
    case '.svelte':
      return 'svelte';
    default:
      return 'unknown';
  }
}

export function detectLayer(normPath: string): string | undefined {
  const parts = normPath.split('/');
  // Feature-Sliced Design layers: app, processes, pages, widgets, features, entities, shared
  const fsdLayers = ['app', 'processes', 'pages', 'widgets', 'features', 'entities', 'shared'];
  for (const layer of fsdLayers) {
    const idx = parts.indexOf(layer);
    if (idx !== -1) {
      return layer;
    }
  }

  // Clean Architecture layers: domain, application, infrastructure, presentation
  const cleanLayers = ['domain', 'application', 'infrastructure', 'presentation', 'adapters', 'core'];
  for (const layer of cleanLayers) {
    const idx = parts.indexOf(layer);
    if (idx !== -1) {
      return layer;
    }
  }

  return undefined;
}

export function detectFeature(normPath: string): string | undefined {
  const parts = normPath.split('/');
  const featureDirIdx = parts.findIndex(p => p === 'features' || p === 'modules');
  if (featureDirIdx !== -1 && featureDirIdx < parts.length - 1) {
    return parts[featureDirIdx + 1];
  }
  return undefined;
}

export function categorizeFile(relativePath: string): NodeType {
  const normPath = normalizePath(relativePath).toLowerCase();
  const baseName = path.basename(relativePath);
  const ext = path.extname(relativePath).toLowerCase();

  // Tests
  if (
    normPath.includes('__tests__') ||
    normPath.includes('__mocks__') ||
    baseName.includes('.test.') ||
    baseName.includes('.spec.')
  ) {
    return 'test';
  }

  // Config files
  if (
    baseName.includes('.config.') ||
    baseName.startsWith('tsconfig') ||
    baseName === 'package.json' ||
    baseName === 'turbo.json' ||
    baseName === 'pnpm-workspace.yaml' ||
    normPath.startsWith('.devarchitect')
  ) {
    return 'config';
  }

  // Assets & styles
  if (['.css', '.scss', '.sass', '.less', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) {
    return 'asset';
  }

  // Routes
  if (
    normPath.includes('/app/') && (baseName.startsWith('page.') || baseName.startsWith('layout.') || baseName.startsWith('route.') || baseName.startsWith('loading.') || baseName.startsWith('error.')) ||
    normPath.includes('/pages/') ||
    normPath.includes('/routes/') ||
    baseName.includes('.route.')
  ) {
    return 'route';
  }

  // Hooks
  if (
    baseName.startsWith('use') &&
    (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') ||
    normPath.includes('/hooks/')
  ) {
    return 'hook';
  }

  // Services & API clients
  if (
    baseName.toLowerCase().includes('service.') ||
    baseName.toLowerCase().includes('client.') ||
    normPath.includes('/services/') ||
    normPath.includes('/service/') ||
    normPath.includes('/api/') ||
    normPath.includes('/repositories/') ||
    normPath.includes('/repository/')
  ) {
    return 'service';
  }

  // Utilities / Helpers
  if (
    baseName.toLowerCase().includes('util.') ||
    baseName.toLowerCase().includes('helper.') ||
    normPath.includes('/utils/') ||
    normPath.includes('/util/') ||
    normPath.includes('/helpers/') ||
    normPath.includes('/lib/')
  ) {
    return 'utility';
  }

  // Components (React/Vue/Svelte components)
  if (
    ext === '.tsx' ||
    ext === '.jsx' ||
    ext === '.vue' ||
    ext === '.svelte' ||
    normPath.includes('/components/') ||
    normPath.includes('/widgets/') ||
    // PascalCase name check
    (/^[A-Z][a-zA-Z0-9]+\.(ts|js|tsx|jsx)$/.test(baseName) && !baseName.toLowerCase().includes('service'))
  ) {
    return 'component';
  }

  // Features / modules index
  if (normPath.includes('/features/') || normPath.includes('/modules/')) {
    return 'module';
  }

  return 'unknown';
}

export function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split(/\r\n|\r|\n/).length;
  } catch {
    return 0;
  }
}

export function createProjectNode(
  rootDir: string,
  relativePath: string
): ProjectNode {
  const normPath = normalizePath(relativePath);
  const fullPath = path.join(rootDir, relativePath);
  const nodeType = categorizeFile(normPath);
  const feature = detectFeature(normPath);
  const layer = detectLayer(normPath);
  const language = detectLanguage(normPath);
  const loc = countLines(fullPath);
  const hash = calculateFileHash(fullPath);

  return {
    id: normPath,
    path: normPath,
    name: path.basename(normPath),
    type: nodeType,
    language,
    feature,
    layer,
    metrics: {
      complexity: null,
      linesOfCode: loc,
      dependencyCount: 0,
      dependentCount: 0,
      exportCount: 0,
      importCount: 0,
    },
    metadata: {
      hash,
    },
  };
}

