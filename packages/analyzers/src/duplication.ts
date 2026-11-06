import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ProjectNode } from '@devarchitect/contracts';

export interface DuplicateCluster {
  hash: string;
  lineCount: number;
  instances: Array<{
    filePath: string;
    startLine: number;
    endLine: number;
    snippet: string;
  }>;
}

export interface DuplicationAnalysisResult {
  clusters: DuplicateCluster[];
  totalDuplicateLines: number;
  duplicationPercentage: number;
}

export function detectDuplication(
  rootDir: string,
  nodes: ProjectNode[],
  minLines: number = 6
): DuplicationAnalysisResult {
  const blockHashMap = new Map<string, Array<{ filePath: string; startLine: number; endLine: number; snippet: string }>>();

  for (const node of nodes) {
    if (node.type === 'config' || node.type === 'asset' || node.type === 'test') {
      continue;
    }

    const fullPath = path.resolve(rootDir, node.path);
    if (!fs.existsSync(fullPath)) continue;

    let lines: string[];
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      lines = content.split(/\r\n|\r|\n/);
    } catch {
      continue;
    }

    // Filter out imports and trivial empty lines
    const normalizedLines = lines.map(line => line.trim());

    for (let i = 0; i <= normalizedLines.length - minLines; i++) {
      const window = normalizedLines.slice(i, i + minLines);

      // Skip blocks that are mostly imports, comments, or braces
      const nonTrivial = window.filter(l =>
        l.length > 2 &&
        !l.startsWith('import ') &&
        !l.startsWith('export ') &&
        !l.startsWith('//') &&
        !l.startsWith('/*') &&
        l !== '{' &&
        l !== '}' &&
        l !== '};'
      );

      if (nonTrivial.length < Math.floor(minLines * 0.75)) {
        continue;
      }

      const hash = crypto.createHash('md5').update(window.join('\n')).digest('hex');

      if (!blockHashMap.has(hash)) {
        blockHashMap.set(hash, []);
      }

      const instances = blockHashMap.get(hash)!;
      // Prevent overlapping blocks within same file
      const alreadyInFile = instances.some(inst => inst.filePath === node.path && Math.abs(inst.startLine - (i + 1)) < minLines);
      if (!alreadyInFile) {
        instances.push({
          filePath: node.path,
          startLine: i + 1,
          endLine: i + minLines,
          snippet: window.slice(0, 3).join('\n') + '\n...',
        });
      }
    }
  }

  const clusters: DuplicateCluster[] = [];
  let totalDuplicateLines = 0;

  for (const [hash, instances] of blockHashMap.entries()) {
    if (instances.length > 1) {
      clusters.push({
        hash,
        lineCount: minLines,
        instances,
      });
      totalDuplicateLines += (instances.length - 1) * minLines;
    }
  }

  const totalLoc = nodes.reduce((acc, n) => acc + n.metrics.linesOfCode, 0) || 1;
  const duplicationPercentage = Math.round((totalDuplicateLines / totalLoc) * 1000) / 10;

  return {
    clusters,
    totalDuplicateLines,
    duplicationPercentage,
  };
}
