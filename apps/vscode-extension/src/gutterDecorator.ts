import * as vscode from 'vscode';
import path from 'node:path';
import { ArchitectureGraph } from '@devarchitect/graph';

export class GutterDecorator {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private blastDecorationType: vscode.TextEditorDecorationType;
  private warningDecorationType: vscode.TextEditorDecorationType;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('devarchitect');

    // Gutter decoration for Blast Radius
    this.blastDecorationType = vscode.window.createTextEditorDecorationType({
      overviewRulerColor: '#f97316',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    // Gutter decoration for Architecture Boundary Violations
    this.warningDecorationType = vscode.window.createTextEditorDecorationType({
      overviewRulerColor: '#ef4444',
      overviewRulerLane: vscode.OverviewRulerLane.Right,
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    });
  }

  public updateActiveEditor(editor: vscode.TextEditor, rootDir: string, graph: ArchitectureGraph | null) {
    if (!graph || !rootDir) return;
    const document = editor.document;
    const ext = path.extname(document.fileName);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return;

    const relPath = path.relative(rootDir, document.fileName).replace(/\\/g, '/');
    const dependents = graph.getDependents(relPath);

    // Decorate line 0 with Blast Radius tooltip & overview mark
    const range = new vscode.Range(0, 0, 0, Math.min(document.lineAt(0).text.length, 60));
    const hoverMessage = new vscode.MarkdownString(
      `### 💥 DevArchitect Blast Radius\n\n` +
      `**Downstream Callers:** ${dependents.length} file(s) depend on this module.\n\n` +
      (dependents.length > 0 ? `**Callers:**\n` + dependents.slice(0, 5).map(d => `- \`${d}\``).join('\n') : `*Leaf component or entry point (safe to refactor).*`)
    );
    hoverMessage.isTrusted = true;

    editor.setDecorations(this.blastDecorationType, [{ range, hoverMessage }]);
    this.validateDocumentText(document, relPath);
  }

  public triggerRealtimeLint(document: vscode.TextDocument, rootDir: string) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      const relPath = path.relative(rootDir, document.fileName).replace(/\\/g, '/');
      this.validateDocumentText(document, relPath);
    }, 250);
  }

  private validateDocumentText(document: vscode.TextDocument, relPath: string) {
    const diagnostics: vscode.Diagnostic[] = [];
    const warningDecorations: vscode.DecorationOptions[] = [];
    const isClientFile =
      relPath.includes('/components/') ||
      relPath.includes('/ui/') ||
      relPath.endsWith('.tsx') ||
      relPath.endsWith('.jsx');

    const text = document.getText();
    const lines = text.split(/\r?\n/);

    const importRegex = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?|require\(\s*)['"]([^'"]+)['"]/g;

    lines.forEach((lineText, lineIdx) => {
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(lineText)) !== null) {
        const specifier = match[1];

        // 1. Boundary Violation: UI importing database / server modules directly
        if (isClientFile && (specifier.includes('db') || specifier.includes('database') || specifier.includes('prisma'))) {
          const startCol = match.index;
          const endCol = match.index + match[0].length;
          const range = new vscode.Range(lineIdx, startCol, lineIdx, endCol);

          const diagnostic = new vscode.Diagnostic(
            range,
            `[DevArchitect]: Architectural Boundary Violation: UI components must not import database adapters directly ('${specifier}'). Use a typed service or API route.`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.source = 'DevArchitect';
          diagnostics.push(diagnostic);

          warningDecorations.push({
            range,
            hoverMessage: new vscode.MarkdownString(`🚨 **Architecture Violation**: UI Component directly importing database layer (\`${specifier}\`).`),
          });
        }

        // 2. Heavy Barrel import trap: lodash
        if (specifier === 'lodash' && lineText.includes('{')) {
          const startCol = match.index;
          const endCol = match.index + match[0].length;
          const range = new vscode.Range(lineIdx, startCol, lineIdx, endCol);

          const diagnostic = new vscode.Diagnostic(
            range,
            `[DevArchitect]: Tree-Shaking Trap: Importing from 'lodash' barrel file bloats bundle size. Prefer 'lodash/debounce' or 'lodash-es'.`,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.source = 'DevArchitect';
          diagnostics.push(diagnostic);
        }
      }

      // 3. Leftover console.log detector
      if (lineText.includes('console.log(') && !lineText.trim().startsWith('//')) {
        const col = lineText.indexOf('console.log(');
        const range = new vscode.Range(lineIdx, col, lineIdx, col + 12);
        const diagnostic = new vscode.Diagnostic(
          range,
          `[DevArchitect]: Leftover debug log 'console.log'. Run 'devarchitect fix' to clean up.`,
          vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = 'DevArchitect';
        diagnostics.push(diagnostic);
      }
    });

    this.diagnosticCollection.set(document.uri, diagnostics);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.uri.fsPath === document.uri.fsPath) {
      activeEditor.setDecorations(this.warningDecorationType, warningDecorations);
    }
  }

  public dispose() {
    this.diagnosticCollection.dispose();
    this.blastDecorationType.dispose();
    this.warningDecorationType.dispose();
  }
}
