import { ProjectNode, ProjectEdge } from '@devarchitect/contracts';
import { ParsedFileResult } from '@devarchitect/parsers';

export interface UnusedExportItem {
  filePath: string;
  exportName: string;
  line: number;
  isTypeOnly: boolean;
}

export interface DeadCodeAnalysisResult {
  unusedExports: UnusedExportItem[];
  orphanedFiles: string[];
}

export function detectDeadCode(
  nodes: ProjectNode[],
  edges: ProjectEdge[],
  parsedFiles: Map<string, ParsedFileResult>,
  entryPoints: string[] = []
): DeadCodeAnalysisResult {
  const entrySet = new Set(entryPoints.map(e => e.replace(/\\/g, '/')));

  // Map: targetFile -> Set of imported specifiers
  const importedSpecifiersMap = new Map<string, Set<string>>();
  // Set of files that are imported by at least one other file
  const importedFiles = new Set<string>();

  for (const edge of edges) {
    if (edge.isExternal) continue;

    importedFiles.add(edge.target);

    if (!importedSpecifiersMap.has(edge.target)) {
      importedSpecifiersMap.set(edge.target, new Set());
    }

    const set = importedSpecifiersMap.get(edge.target)!;
    for (const spec of edge.specifiers) {
      set.add(spec);
    }
  }

  const unusedExports: UnusedExportItem[] = [];
  const orphanedFiles: string[] = [];

  for (const node of nodes) {
    const isEntry = entrySet.has(node.path) ||
      node.type === 'route' ||
      node.type === 'config' ||
      node.type === 'test' ||
      node.path.includes('index.html');

    // Check orphaned file
    if (!isEntry && !importedFiles.has(node.path)) {
      orphanedFiles.push(node.path);
    }

    // Check unused exports
    const parsed = parsedFiles.get(node.path);
    if (!parsed || isEntry) continue;

    const importedForThisFile = importedSpecifiersMap.get(node.path) || new Set<string>();

    for (const exp of parsed.exports) {
      // Default exports or named exports
      if (exp.name === 'default') {
        if (!importedForThisFile.has('default') && importedForThisFile.size === 0) {
          unusedExports.push({
            filePath: node.path,
            exportName: 'default',
            line: exp.line,
            isTypeOnly: exp.isTypeOnly,
          });
        }
      } else {
        if (!importedForThisFile.has(exp.name)) {
          unusedExports.push({
            filePath: node.path,
            exportName: exp.name,
            line: exp.line,
            isTypeOnly: exp.isTypeOnly,
          });
        }
      }
    }
  }

  return {
    unusedExports,
    orphanedFiles,
  };
}
