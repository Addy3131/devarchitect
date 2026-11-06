import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { ProjectNode } from '@devarchitect/contracts';

export interface RerenderIssue {
  filePath: string;
  line: number;
  componentName: string;
  issueType:
    | 'inline-function-prop'
    | 'inline-object-prop'
    | 'unmemoized-context'
    | 'derived-state-effect'
    | 'excessive-hooks';
  message: string;
  suggestion: string;
}

export interface RerenderAnalysisResult {
  totalIssues: number;
  issues: RerenderIssue[];
  componentsAnalyzed: number;
}

export function analyzeReactRerenders(
  rootDir: string,
  nodes: ProjectNode[]
): RerenderAnalysisResult {
  const issues: RerenderIssue[] = [];
  let componentsAnalyzed = 0;

  for (const node of nodes) {
    if (
      !node.path.endsWith('.tsx') &&
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
      ts.ScriptKind.TSX
    );

    const getLine = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line + 1;

    let currentComponent = node.name.replace(/\.(tsx|jsx)$/, '');

    const visit = (n: ts.Node) => {
      // Detect function components
      if (ts.isFunctionDeclaration(n) && n.name) {
        currentComponent = n.name.text;
      }

      // 1. Detect Hook Count
      if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n)) {
        let hookCount = 0;
        n.forEachChild(function countHooks(child) {
          if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text.startsWith('use')) {
            hookCount++;
          }
          child.forEachChild(countHooks);
        });

        if (hookCount > 7) {
          issues.push({
            filePath: node.path,
            line: getLine(n.getStart()),
            componentName: currentComponent,
            issueType: 'excessive-hooks',
            message: `Component '${currentComponent}' calls ${hookCount} hooks. Heavy state orchestration leads to frequent re-renders.`,
            suggestion: 'Extract sub-logic into custom hooks or split the component into smaller presentational components.',
          });
        }
      }

      // 2. Detect Inline Function/Object passed as JSX props to non-DOM components
      if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer)) {
        const propName = n.name.getText(sourceFile);
        const expr = n.initializer.expression;
        const parentElement = n.parent.parent;
        const tagName = ts.isJsxOpeningElement(parentElement) || ts.isJsxSelfClosingElement(parentElement)
          ? parentElement.tagName.getText(sourceFile)
          : '';

        // If tag is a custom React Component (PascalCase, not native 'div', 'button', etc.)
        const isCustomComponent = /^[A-Z]/.test(tagName);

        if (isCustomComponent && expr) {
          // Inline arrow function or function expression
          if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
            issues.push({
              filePath: node.path,
              line: getLine(n.getStart()),
              componentName: currentComponent,
              issueType: 'inline-function-prop',
              message: `Inline function passed to prop '${propName}' on <${tagName} /> creates a new reference on every render.`,
              suggestion: `Wrap callback with useCallback() if <${tagName} /> is memoized or renders children.`,
            });
          }

          // Inline Object Literal or Array Literal
          if (ts.isObjectLiteralExpression(expr) || ts.isArrayLiteralExpression(expr)) {
            issues.push({
              filePath: node.path,
              line: getLine(n.getStart()),
              componentName: currentComponent,
              issueType: 'inline-object-prop',
              message: `Inline object/array passed to prop '${propName}' on <${tagName} /> creates a new reference every render.`,
              suggestion: `Move static object outside component or memoize with useMemo().`,
            });
          }
        }
      }

      // 3. Detect un-memoized Context.Provider value
      if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
        const tagName = n.tagName.getText(sourceFile);
        if (tagName.endsWith('.Provider') || tagName.endsWith('Context.Provider')) {
          for (const attr of n.attributes.properties) {
            if (ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === 'value' && attr.initializer && ts.isJsxExpression(attr.initializer)) {
              const expr = attr.initializer.expression;
              if (expr && ts.isObjectLiteralExpression(expr)) {
                issues.push({
                  filePath: node.path,
                  line: getLine(attr.getStart()),
                  componentName: currentComponent,
                  issueType: 'unmemoized-context',
                  message: `Context.Provider passes inline object literal directly to 'value'. All consuming components re-render every time parent renders.`,
                  suggestion: 'Wrap the context value in useMemo(() => ({ ... }), [dependencies]).',
                });
              }
            }
          }
        }
      }

      // 4. Detect Derived State in useEffect
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'useEffect') {
        const callback = n.arguments[0];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
          let hasSetStateCall = false;
          callback.forEachChild(function findSetState(child) {
            if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && /^set[A-Z]/.test(child.expression.text)) {
              hasSetStateCall = true;
            }
            child.forEachChild(findSetState);
          });

          if (hasSetStateCall && n.arguments.length > 1) {
            issues.push({
              filePath: node.path,
              line: getLine(n.getStart()),
              componentName: currentComponent,
              issueType: 'derived-state-effect',
              message: `useEffect calls setState to synchronize derived state. This causes an unwanted extra render cycle.`,
              suggestion: 'Calculate derived state inline during render or wrap in useMemo() instead of an effect.',
            });
          }
        }
      }

      ts.forEachChild(n, visit);
    };

    visit(sourceFile);
    componentsAnalyzed++;
  }

  return {
    totalIssues: issues.length,
    issues,
    componentsAnalyzed,
  };
}
