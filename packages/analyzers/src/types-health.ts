import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ProjectNode, ProjectEdge } from '@devarchitect/contracts';
import { ParsedFileResult } from '@devarchitect/parsers';

export interface UnusedTypeItem {
  filePath: string;
  name: string;
  kind: 'interface' | 'type' | 'enum';
  line: number;
}

export interface AnyTypeHotspot {
  filePath: string;
  line: number;
  snippet: string;
  kind: 'explicit-any' | 'as-any-cast';
}

export interface DuplicateTypeDefinition {
  typeName: string;
  structureHash: string;
  locations: Array<{ filePath: string; line: number }>;
}

export interface TypeHealthResult {
  unusedTypes: UnusedTypeItem[];
  anyHotspots: AnyTypeHotspot[];
  duplicateTypes: DuplicateTypeDefinition[];
  totalTypesDeclared: number;
  typeSafetyScore: number; // 0 - 100
}

export function analyzeTypeHealth(
  rootDir: string,
  nodes: ProjectNode[],
  edges: ProjectEdge[],
  parsedFiles: Map<string, ParsedFileResult>
): TypeHealthResult {
  const unusedTypes: UnusedTypeItem[] = [];
  const anyHotspots: AnyTypeHotspot[] = [];
  const declaredTypesMap = new Map<string, Array<{ filePath: string; line: number; structure: string }>>();

  // Collect all imported type specifiers across the project
  const importedSpecifiers = new Set<string>();
  for (const edge of edges) {
    for (const spec of edge.specifiers) {
      importedSpecifiers.add(spec);
    }
  }

  let totalTypesDeclared = 0;

  for (const node of nodes) {
    if (
      !node.path.endsWith('.ts') &&
      !node.path.endsWith('.tsx')
    ) {
      continue;
    }

    const fullPath = path.resolve(rootDir, node.path);
    if (!fs.existsSync(fullPath)) continue;

    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      node.path,
      content,
      ts.ScriptTarget.Latest,
      true,
      node.path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const getLine = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line + 1;

    // Track local type references within the same file
    const localReferencedIdentifiers = new Set<string>();

    // Pass 1: Collect references
    const collectRefs = (n: ts.Node) => {
      if (ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName)) {
        localReferencedIdentifiers.add(n.typeName.text);
      }
      if (ts.isExpressionWithTypeArguments(n) && ts.isIdentifier(n.expression)) {
        localReferencedIdentifiers.add(n.expression.text);
      }
      ts.forEachChild(n, collectRefs);
    };
    collectRefs(sourceFile);

    // Pass 2: Check definitions and 'any' usage
    const visit = (n: ts.Node) => {
      // 1. Detect any types (: any)
      if (n.kind === ts.SyntaxKind.AnyKeyword) {
        anyHotspots.push({
          filePath: node.path,
          line: getLine(n.getStart()),
          snippet: n.parent.getText(sourceFile).slice(0, 60),
          kind: 'explicit-any',
        });
      }

      // 2. Detect 'as any' casts
      if (ts.isAsExpression(n) && n.type.kind === ts.SyntaxKind.AnyKeyword) {
        anyHotspots.push({
          filePath: node.path,
          line: getLine(n.getStart()),
          snippet: n.getText(sourceFile).slice(0, 60),
          kind: 'as-any-cast',
        });
      }

      // 3. Interface Declarations
      if (ts.isInterfaceDeclaration(n)) {
        totalTypesDeclared++;
        const name = n.name.text;
        const line = getLine(n.getStart());
        const isExported = n.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

        // Check if unused
        const isUsedLocally = localReferencedIdentifiers.has(name);
        const isImportedElsewhere = importedSpecifiers.has(name);

        if (!isUsedLocally && !isImportedElsewhere) {
          unusedTypes.push({
            filePath: node.path,
            name,
            kind: 'interface',
            line,
          });
        }

        // Track structure for duplication detection
        const structure = n.members.map(m => m.getText(sourceFile).replace(/\s+/g, '')).sort().join(';');
        if (!declaredTypesMap.has(name)) declaredTypesMap.set(name, []);
        declaredTypesMap.get(name)!.push({ filePath: node.path, line, structure });
      }

      // 4. Type Alias Declarations
      if (ts.isTypeAliasDeclaration(n)) {
        totalTypesDeclared++;
        const name = n.name.text;
        const line = getLine(n.getStart());

        const isUsedLocally = localReferencedIdentifiers.has(name);
        const isImportedElsewhere = importedSpecifiers.has(name);

        if (!isUsedLocally && !isImportedElsewhere) {
          unusedTypes.push({
            filePath: node.path,
            name,
            kind: 'type',
            line,
          });
        }
      }

      // 5. Enum Declarations
      if (ts.isEnumDeclaration(n)) {
        totalTypesDeclared++;
        const name = n.name.text;
        const line = getLine(n.getStart());

        const isUsedLocally = localReferencedIdentifiers.has(name);
        const isImportedElsewhere = importedSpecifiers.has(name);

        if (!isUsedLocally && !isImportedElsewhere) {
          unusedTypes.push({
            filePath: node.path,
            name,
            kind: 'enum',
            line,
          });
        }
      }

      ts.forEachChild(n, visit);
    };

    visit(sourceFile);
  }

  // Find duplicate type definitions across files
  const duplicateTypes: DuplicateTypeDefinition[] = [];
  for (const [name, occurrences] of declaredTypesMap.entries()) {
    if (occurrences.length > 1) {
      // If structures match
      const firstStruct = occurrences[0].structure;
      const allMatch = occurrences.every(o => o.structure === firstStruct && firstStruct.length > 5);
      if (allMatch) {
        duplicateTypes.push({
          typeName: name,
          structureHash: firstStruct,
          locations: occurrences.map(o => ({ filePath: o.filePath, line: o.line })),
        });
      }
    }
  }

  // Calculate Type Safety Score (0 - 100)
  const anyDeductions = anyHotspots.length * 4;
  const unusedDeductions = unusedTypes.length * 2;
  const duplicateDeductions = duplicateTypes.length * 5;
  const typeSafetyScore = Math.max(0, Math.min(100, 100 - (anyDeductions + unusedDeductions + duplicateDeductions)));

  return {
    unusedTypes,
    anyHotspots,
    duplicateTypes,
    totalTypesDeclared,
    typeSafetyScore,
  };
}

