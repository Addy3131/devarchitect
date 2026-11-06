import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ProjectNode } from '@devarchitect/contracts';

export interface CodeSmell {
  filePath: string;
  line: number;
  category:
    | 'unhandled-async'
    | 'empty-catch'
    | 'direct-mutation'
    | 'god-component'
    | 'hardcoded-secret'
    | 'console-log';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion: string;
}

export interface SmellAnalysisResult {
  totalSmells: number;
  errorsCount: number;
  warningsCount: number;
  smells: CodeSmell[];
}

export function analyzeCodeSmells(
  rootDir: string,
  nodes: ProjectNode[]
): SmellAnalysisResult {
  const smells: CodeSmell[] = [];

  for (const node of nodes) {
    if (
      !node.path.endsWith('.ts') &&
      !node.path.endsWith('.tsx') &&
      !node.path.endsWith('.js') &&
      !node.path.endsWith('.jsx')
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
      node.path.endsWith('.tsx') || node.path.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    const getLine = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line + 1;

    // 1. God Component check based on LOC
    if (node.metrics.linesOfCode > 350) {
      smells.push({
        filePath: node.path,
        line: 1,
        category: 'god-component',
        severity: 'warning',
        message: `File has ${node.metrics.linesOfCode} lines of code. It exceeds single-responsibility maintainability thresholds.`,
        suggestion: 'Break this module down into smaller components, custom hooks, or utility services.',
      });
    }

    const visit = (n: ts.Node) => {
      // 2. Empty Catch Block (swallowing errors)
      if (ts.isCatchClause(n)) {
        if (n.block.statements.length === 0) {
          smells.push({
            filePath: node.path,
            line: getLine(n.getStart()),
            category: 'empty-catch',
            severity: 'error',
            message: 'Empty catch block silently swallows exceptions. Errors will fail silently without logs or fallback state.',
            suggestion: 'Log the error, rethrow it, or set fallback error state in the catch block.',
          });
        }
      }

      // 3. Unhandled fetch / async calls in functions without try/catch
      if (ts.isCallExpression(n)) {
        const exprText = n.expression.getText(sourceFile);
        if (exprText === 'fetch' || exprText.endsWith('.get') || exprText.endsWith('.post')) {
          // Check if enclosed in try-catch or has .catch
          let enclosedInTry = false;
          let hasCatchHandler = false;

          let parent = n.parent;
          while (parent) {
            if (ts.isTryStatement(parent)) {
              enclosedInTry = true;
              break;
            }
            if (ts.isCallExpression(parent)) {
              const callText = parent.expression.getText(sourceFile);
              if (callText.endsWith('.catch')) {
                hasCatchHandler = true;
                break;
              }
            }
            parent = parent.parent;
          }

          if (!enclosedInTry && !hasCatchHandler) {
            smells.push({
              filePath: node.path,
              line: getLine(n.getStart()),
              category: 'unhandled-async',
              severity: 'warning',
              message: `Async call '${exprText}()' lacks try/catch or .catch() handler. Network or server failures will cause unhandled rejections.`,
              suggestion: 'Wrap in try/catch block or append .catch() to handle network error states gracefully.',
            });
          }
        }
      }

      // 4. Hardcoded Secrets or sensitive tokens
      if (ts.isStringLiteral(n)) {
        const text = n.text;
        if (
          /^(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})/.test(text) ||
          /(api[_-]?key|secret[_-]?key|auth[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9_-]{16,}["']/i.test(text)
        ) {
          smells.push({
            filePath: node.path,
            line: getLine(n.getStart()),
            category: 'hardcoded-secret',
            severity: 'error',
            message: 'Potential hardcoded API secret or credential detected in source code.',
            suggestion: 'Store credentials in environment variables (process.env) and load via .env files.',
          });
        }
      }

      // 5. Console.log left in production code
      if (ts.isCallExpression(n)) {
        const callText = n.expression.getText(sourceFile);
        if (callText === 'console.log' && !node.path.includes('.test.') && !node.path.includes('__tests__')) {
          smells.push({
            filePath: node.path,
            line: getLine(n.getStart()),
            category: 'console-log',
            severity: 'info',
            message: `console.log statement left in source code.`,
            suggestion: 'Remove debug console logs before production or use a dedicated logging service.',
          });
        }
      }

      ts.forEachChild(n, visit);
    };

    visit(sourceFile);
  }

  const errorsCount = smells.filter(s => s.severity === 'error').length;
  const warningsCount = smells.filter(s => s.severity === 'warning').length;

  return {
    totalSmells: smells.length,
    errorsCount,
    warningsCount,
    smells,
  };
}

