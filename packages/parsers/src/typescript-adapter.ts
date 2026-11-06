import ts from 'typescript';
import {
  ParserAdapter,
  ParsedFileResult,
  ParsedImport,
  ParsedExport,
  ParsedSymbol,
  ParsedImportSpecifier
} from './types.js';

export class TypeScriptParserAdapter implements ParserAdapter {
  public id = 'typescript-ast';
  public name = 'TypeScript / JavaScript AST Parser';

  public supports(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return (
      ext.endsWith('.ts') ||
      ext.endsWith('.tsx') ||
      ext.endsWith('.js') ||
      ext.endsWith('.jsx') ||
      ext.endsWith('.mjs') ||
      ext.endsWith('.cjs')
    );
  }

  public parse(filePath: string, content: string): ParsedFileResult {
    const scriptTarget = ts.ScriptTarget.Latest;
    const isJsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      scriptTarget,
      true,
      isJsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const imports: ParsedImport[] = [];
    const exports: ParsedExport[] = [];
    const symbols: ParsedSymbol[] = [];
    let fileComplexity = 1;

    const getLineNumber = (pos: number): number => {
      return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
    };

    const countComplexityInNode = (node: ts.Node): number => {
      let count = 0;
      switch (node.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression: // ternary
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.CaseClause:
        case ts.SyntaxKind.CatchClause:
          count++;
          break;
        case ts.SyntaxKind.BinaryExpression: {
          const binExpr = node as ts.BinaryExpression;
          const op = binExpr.operatorToken.kind;
          if (
            op === ts.SyntaxKind.AmpersandAmpersandToken ||
            op === ts.SyntaxKind.BarBarToken ||
            op === ts.SyntaxKind.QuestionQuestionToken
          ) {
            count++;
          }
          break;
        }
      }
      return count;
    };

    const visit = (node: ts.Node) => {
      // Calculate complexity points
      fileComplexity += countComplexityInNode(node);

      // 1. Static Imports: import ... from '...'
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const source = moduleSpecifier.text;
          const isTypeOnly = node.importClause?.isTypeOnly ?? false;
          const specifiers: ParsedImportSpecifier[] = [];

          if (node.importClause) {
            // Default import: import Header from './Header'
            if (node.importClause.name) {
              specifiers.push({
                name: node.importClause.name.text,
                isDefault: true,
                isTypeOnly,
              });
            }

            // Named or namespace bindings
            if (node.importClause.namedBindings) {
              // Namespace: import * as React from 'react'
              if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                specifiers.push({
                  name: node.importClause.namedBindings.name.text,
                  isNamespace: true,
                  isTypeOnly,
                });
              } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                // Named: import { useState, useEffect } from 'react'
                for (const element of node.importClause.namedBindings.elements) {
                  specifiers.push({
                    name: element.name.text,
                    alias: element.propertyName?.text,
                    isTypeOnly: element.isTypeOnly || isTypeOnly,
                  });
                }
              }
            }
          }

          imports.push({
            source,
            specifiers,
            isTypeOnly,
            isDynamic: false,
            line: getLineNumber(node.getStart()),
          });
        }
      }

      // 2. Dynamic Imports: import('...')
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          imports.push({
            source: arg.text,
            specifiers: [],
            isTypeOnly: false,
            isDynamic: true,
            line: getLineNumber(node.getStart()),
          });
        }
      }

      // 3. Export Declarations: export { a, b } from './c'
      if (ts.isExportDeclaration(node)) {
        const isTypeOnly = node.isTypeOnly;
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          // Re-export from another file
          imports.push({
            source: node.moduleSpecifier.text,
            specifiers: [],
            isTypeOnly,
            isDynamic: false,
            line: getLineNumber(node.getStart()),
          });
        }

        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            exports.push({
              name: element.name.text,
              isDefault: false,
              isTypeOnly: element.isTypeOnly || isTypeOnly,
              line: getLineNumber(element.getStart()),
            });
          }
        }
      }

      // 4. Export Default Assignment: export default ...
      if (ts.isExportAssignment(node)) {
        exports.push({
          name: 'default',
          isDefault: true,
          isTypeOnly: false,
          line: getLineNumber(node.getStart()),
        });
      }

      // 5. Function Declaration
      if (ts.isFunctionDeclaration(node)) {
        const name = node.name?.text || 'anonymous';
        const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;

        let funcComplexity = 1;
        node.forEachChild(function visitFunc(child) {
          funcComplexity += countComplexityInNode(child);
          child.forEachChild(visitFunc);
        });

        symbols.push({
          name,
          kind: 'function',
          line: getLineNumber(node.getStart()),
          complexity: funcComplexity,
        });

        if (isExported) {
          exports.push({
            name: isDefault ? 'default' : name,
            isDefault,
            isTypeOnly: false,
            line: getLineNumber(node.getStart()),
          });
          if (isDefault && name !== 'anonymous') {
            exports.push({
              name,
              isDefault: true,
              isTypeOnly: false,
              line: getLineNumber(node.getStart()),
            });
          }
        }
      }

      // 6. Class Declaration
      if (ts.isClassDeclaration(node)) {
        const name = node.name?.text || 'anonymous';
        const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;

        symbols.push({
          name,
          kind: 'class',
          line: getLineNumber(node.getStart()),
          complexity: 1,
        });

        if (isExported) {
          exports.push({
            name: isDefault ? 'default' : name,
            isDefault,
            isTypeOnly: false,
            line: getLineNumber(node.getStart()),
          });
          if (isDefault && name !== 'anonymous') {
            exports.push({
              name,
              isDefault: true,
              isTypeOnly: false,
              line: getLineNumber(node.getStart()),
            });
          }
        }
      }

      // 7. Variable Statements (const a = ..., export const b = ...)
      if (ts.isVariableStatement(node)) {
        const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const name = decl.name.text;
            symbols.push({
              name,
              kind: 'variable',
              line: getLineNumber(decl.getStart()),
              complexity: 1,
            });

            if (isExported) {
              exports.push({
                name,
                isDefault: false,
                isTypeOnly: false,
                line: getLineNumber(decl.getStart()),
              });
            }
          }
        }
      }

      // 8. Interface Declaration
      if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.text;
        const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        symbols.push({
          name,
          kind: 'interface',
          line: getLineNumber(node.getStart()),
          complexity: 1,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: false,
            isTypeOnly: true,
            line: getLineNumber(node.getStart()),
          });
        }
      }

      // 9. Type Alias
      if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.text;
        const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
        symbols.push({
          name,
          kind: 'type',
          line: getLineNumber(node.getStart()),
          complexity: 1,
        });

        if (isExported) {
          exports.push({
            name,
            isDefault: false,
            isTypeOnly: true,
            line: getLineNumber(node.getStart()),
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    const linesOfCode = content.split(/\r\n|\r|\n/).length;

    return {
      filePath,
      imports,
      exports,
      symbols,
      linesOfCode,
      complexity: fileComplexity,
    };
  }
}

export const defaultTypeScriptParser = new TypeScriptParserAdapter();

