import { ProjectNode } from '@devarchitect/contracts';
import { ParsedFileResult, ParsedSymbol } from '@devarchitect/parsers';

export interface ComplexityHotspot {
  filePath: string;
  linesOfCode: number;
  complexity: number;
  risk: 'low' | 'moderate' | 'high' | 'critical';
  topSymbols: ParsedSymbol[];
}

export interface ComplexityAnalysisResult {
  averageComplexity: number;
  totalComplexity: number;
  hotspots: ComplexityHotspot[];
  oversizedFiles: Array<{ filePath: string; linesOfCode: number }>;
}

export function analyzeComplexity(
  nodes: ProjectNode[],
  parsedFiles: Map<string, ParsedFileResult>
): ComplexityAnalysisResult {
  const hotspots: ComplexityHotspot[] = [];
  const oversizedFiles: Array<{ filePath: string; linesOfCode: number }> = [];

  let totalComplexity = 0;
  let parsedCount = 0;

  for (const node of nodes) {
    const parsed = parsedFiles.get(node.path);
    if (!parsed) continue;

    parsedCount++;
    totalComplexity += parsed.complexity;

    if (parsed.linesOfCode > 250) {
      oversizedFiles.push({
        filePath: node.path,
        linesOfCode: parsed.linesOfCode,
      });
    }

    let risk: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (parsed.complexity >= 25 || parsed.linesOfCode >= 400) {
      risk = 'critical';
    } else if (parsed.complexity >= 15 || parsed.linesOfCode >= 250) {
      risk = 'high';
    } else if (parsed.complexity >= 8 || parsed.linesOfCode >= 150) {
      risk = 'moderate';
    }

    const sortedSymbols = [...parsed.symbols].sort((a, b) => b.complexity - a.complexity);

    if (risk !== 'low') {
      hotspots.push({
        filePath: node.path,
        linesOfCode: parsed.linesOfCode,
        complexity: parsed.complexity,
        risk,
        topSymbols: sortedSymbols.slice(0, 5),
      });
    }
  }

  // Sort descending by complexity
  hotspots.sort((a, b) => b.complexity - a.complexity);
  oversizedFiles.sort((a, b) => b.linesOfCode - a.linesOfCode);

  const averageComplexity = parsedCount > 0 ? Math.round((totalComplexity / parsedCount) * 10) / 10 : 0;

  return {
    averageComplexity,
    totalComplexity,
    hotspots,
    oversizedFiles,
  };
}
