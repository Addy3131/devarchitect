import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ProjectNode, ProjectEdge } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';
import { ParsedFileResult } from '@devarchitect/parsers';

export interface ExportedContractMember {
  name: string;
  kind: 'function' | 'interface' | 'type' | 'class' | 'variable';
  line: number;
  details: string; // e.g. parameters or property names
}

export interface ConsumerCallSite {
  consumerFile: string;
  importedSymbols: string[];
  callLines: Array<{ line: number; symbol: string; codeSnippet: string }>;
}

export interface ContractSimulationReport {
  targetFile: string;
  contractMembers: ExportedContractMember[];
  directConsumersCount: number;
  transitiveConsumersCount: number;
  consumers: ConsumerCallSite[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakingChangeWarnings: string[];
  safeRefactoringGuide: string[];
}

export function simulateContractImpact(
  rootDir: string,
  targetFilePath: string,
  nodes: ProjectNode[],
  edges: ProjectEdge[],
  graph: ArchitectureGraph,
  parsedFiles: Map<string, ParsedFileResult>
): ContractSimulationReport {
  const normTarget = targetFilePath.replace(/\\/g, '/');
  const fullTargetPath = path.resolve(rootDir, normTarget);

  const contractMembers: ExportedContractMember[] = [];
  const breakingChangeWarnings: string[] = [];

  // 1. Parse target file AST to extract the public contract
  if (fs.existsSync(fullTargetPath)) {
    try {
      const content = fs.readFileSync(fullTargetPath, 'utf8');
      const sourceFile = ts.createSourceFile(
        normTarget,
        content,
        ts.ScriptTarget.Latest,
        true,
        normTarget.endsWith('.tsx') || normTarget.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const getLine = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line + 1;

      ts.forEachChild(sourceFile, node => {
        // Functions
        if (ts.isFunctionDeclaration(node) && node.name) {
          const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
          if (isExported) {
            const params = node.parameters.map(p => p.name.getText(sourceFile)).join(', ');
            contractMembers.push({
              name: node.name.text,
              kind: 'function',
              line: getLine(node.getStart()),
              details: `(${params})`,
            });
          }
        }

        // Interfaces
        if (ts.isInterfaceDeclaration(node)) {
          const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
          if (isExported) {
            const propNames = node.members.map(m => m.name?.getText(sourceFile) || 'prop').join(', ');
            contractMembers.push({
              name: node.name.text,
              kind: 'interface',
              line: getLine(node.getStart()),
              details: `{ ${propNames} }`,
            });
          }
        }

        // Type Aliases
        if (ts.isTypeAliasDeclaration(node)) {
          const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
          if (isExported) {
            contractMembers.push({
              name: node.name.text,
              kind: 'type',
              line: getLine(node.getStart()),
              details: node.type.getText(sourceFile).slice(0, 40),
            });
          }
        }

        // Exported Variables / Arrow Functions / Component Declarations
        if (ts.isVariableStatement(node)) {
          const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
          if (isExported) {
            for (const decl of node.declarationList.declarations) {
              if (ts.isIdentifier(decl.name)) {
                contractMembers.push({
                  name: decl.name.text,
                  kind: 'variable',
                  line: getLine(decl.getStart()),
                  details: decl.type ? decl.type.getText(sourceFile) : 'inferred',
                });
              }
            }
          }
        }
      });
    } catch {
      // Best effort parse
    }
  }

  // 2. Identify consumers and call sites across the codebase
  const directDependents = graph.getDependents(normTarget);
  const consumers: ConsumerCallSite[] = [];

  for (const depPath of directDependents) {
    const fullDepPath = path.resolve(rootDir, depPath);
    if (!fs.existsSync(fullDepPath)) continue;

    // Find what specifiers are imported from target in this file
    const matchingEdges = edges.filter(e => e.source === depPath && e.target === normTarget);
    const importedSymbols = Array.from(new Set(matchingEdges.flatMap(e => e.specifiers)));

    const callLines: Array<{ line: number; symbol: string; codeSnippet: string }> = [];

    try {
      const depContent = fs.readFileSync(fullDepPath, 'utf8');
      const depSource = ts.createSourceFile(
        depPath,
        depContent,
        ts.ScriptTarget.Latest,
        true,
        depPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      const getDepLine = (pos: number) => depSource.getLineAndCharacterOfPosition(pos).line + 1;

      // Scan AST for calls / usages of imported symbols
      const scanUsage = (n: ts.Node) => {
        if (ts.isIdentifier(n) && importedSymbols.includes(n.text)) {
          const parent = n.parent;
          // Check if it's a usage, not the import specifier itself
          if (!ts.isImportSpecifier(parent) && !ts.isImportClause(parent)) {
            callLines.push({
              line: getDepLine(n.getStart()),
              symbol: n.text,
              codeSnippet: parent.getText(depSource).slice(0, 80).replace(/\s+/g, ' '),
            });
          }
        }
        ts.forEachChild(n, scanUsage);
      };

      scanUsage(depSource);
    } catch {
      // Best effort scan
    }

    consumers.push({
      consumerFile: depPath,
      importedSymbols,
      callLines: callLines.slice(0, 10), // Keep top 10 call sites per file
    });
  }

  // 3. Compute Transitive Impact & Risk
  let transitiveCount = 0;
  const visited = new Set<string>(directDependents);
  const queue = [...directDependents];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    transitiveCount++;
    for (const upstream of graph.getDependents(curr)) {
      if (!visited.has(upstream)) {
        visited.add(upstream);
        queue.push(upstream);
      }
    }
  }

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (transitiveCount > 15 || directDependents.length > 8) {
    riskLevel = 'CRITICAL';
  } else if (transitiveCount > 6 || directDependents.length > 3) {
    riskLevel = 'HIGH';
  } else if (directDependents.length > 0) {
    riskLevel = 'MEDIUM';
  }

  if (contractMembers.some(m => m.kind === 'interface' || m.kind === 'type')) {
    breakingChangeWarnings.push(
      'Exported types/interfaces are shared with other modules. Renaming or removing properties will cause compiler errors.'
    );
  }
  if (consumers.length > 2) {
    breakingChangeWarnings.push(
      `Shared across ${consumers.length} direct consumers. Changing function parameters requires updating all call sites simultaneously.`
    );
  }

  const safeRefactoringGuide = [
    'Add optional parameters or overload signatures instead of changing existing parameter positions.',
    'Deprecate old interfaces before deleting them; export both new and legacy signatures during migration.',
    `Run 'devarchitect impact ${normTarget}' and 'devarchitect validate' after editing to guarantee zero regressions.`,
  ];

  return {
    targetFile: normTarget,
    contractMembers,
    directConsumersCount: directDependents.length,
    transitiveConsumersCount: transitiveCount,
    consumers,
    riskLevel,
    breakingChangeWarnings,
    safeRefactoringGuide,
  };
}
