import path from 'node:path';
import fs from 'node:fs';
import { ProjectNode, ProjectEdge } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';
import { defaultTypeScriptParser, ImportResolver, ParsedFileResult } from '@devarchitect/parsers';
import { IncrementalCache } from './cache/incremental-cache.js';
import { calculateFileHash } from './scanner/hasher.js';
import { TypeScriptConfigInfo } from '@devarchitect/contracts';

export interface BuildGraphOptions {
  useCache?: boolean;
}

export interface GraphBuildResult {
  graph: ArchitectureGraph;
  parsedFiles: Map<string, ParsedFileResult>;
  cacheHits: number;
  cacheMisses: number;
}

export function buildProjectGraph(
  rootDir: string,
  nodes: ProjectNode[],
  tsConfig: TypeScriptConfigInfo,
  options: BuildGraphOptions = {}
): GraphBuildResult {
  const cache = new IncrementalCache(rootDir);
  const fileList = nodes.map(n => n.path);
  const resolver = new ImportResolver(rootDir, fileList, tsConfig.pathAliases);
  const parsedFiles = new Map<string, ParsedFileResult>();

  let cacheHits = 0;
  let cacheMisses = 0;

  // 1. Parse AST for all source files (using incremental cache)
  for (const node of nodes) {
    if (!defaultTypeScriptParser.supports(node.path)) {
      continue;
    }

    const fullPath = path.resolve(rootDir, node.path);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const currentHash = calculateFileHash(fullPath);
    let parsed: ParsedFileResult | null = null;

    if (options.useCache !== false) {
      parsed = cache.get(node.path, currentHash);
    }

    if (parsed) {
      cacheHits++;
    } else {
      cacheMisses++;
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        parsed = defaultTypeScriptParser.parse(node.path, content);
        if (options.useCache !== false) {
          cache.set(node.path, currentHash, parsed);
        }
      } catch {
        continue;
      }
    }

    parsedFiles.set(node.path, parsed);
  }

  // Save updated cache
  if (options.useCache !== false) {
    cache.prune(new Set(fileList));
    cache.save();
  }

  // 2. Resolve imports and create directed ProjectEdges
  const edges: ProjectEdge[] = [];
  const nodeMap = new Map<string, ProjectNode>();
  for (const node of nodes) {
    nodeMap.set(node.path, node);
  }

  for (const [filePath, parsed] of parsedFiles.entries()) {
    const sourceNode = nodeMap.get(filePath);

    for (const imp of parsed.imports) {
      const resolved = resolver.resolve(filePath, imp.source);

      const edge: ProjectEdge = {
        source: filePath,
        target: resolved.target,
        type: 'imports',
        isExternal: resolved.isExternal,
        specifiers: imp.specifiers.map(s => s.name),
        isTypeOnly: imp.isTypeOnly,
        isDynamic: imp.isDynamic,
      };

      edges.push(edge);
    }

    // Update node metrics with parsed data
    if (sourceNode) {
      sourceNode.metrics.complexity = parsed.complexity;
      sourceNode.metrics.exportCount = parsed.exports.length;
      sourceNode.metrics.importCount = parsed.imports.length;
      sourceNode.metadata.exports = parsed.exports;
      sourceNode.metadata.symbols = parsed.symbols;
    }
  }

  // 3. Assemble and return ArchitectureGraph
  const graph = new ArchitectureGraph(nodes, edges);

  return {
    graph,
    parsedFiles,
    cacheHits,
    cacheMisses,
  };
}
