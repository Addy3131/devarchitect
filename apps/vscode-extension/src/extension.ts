import * as vscode from 'vscode';
import path from 'node:path';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { defaultRuleEngine } from '@devarchitect/rules';
import { loadConfig } from '@devarchitect/config';
import { calculateProjectHealth } from '@devarchitect/analyzers';
import { ArchitectureGraph } from '@devarchitect/graph';
import { ProjectNode } from '@devarchitect/contracts';
import { BlastRadiusCodeLensProvider } from './blastRadiusCodeLens.js';
import { ArchitectureHealthTreeProvider, ActiveFileBlastRadiusTreeProvider } from './healthView.js';
import { GutterDecorator } from './gutterDecorator.js';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let codeLensProvider: BlastRadiusCodeLensProvider;
let healthTreeProvider: ArchitectureHealthTreeProvider;
let blastTreeProvider: ActiveFileBlastRadiusTreeProvider;
let gutterDecorator: GutterDecorator;
let currentGraph: ArchitectureGraph | null = null;
let currentNodes: ProjectNode[] = [];
let currentRootDir: string = '';
let debounceTimer: NodeJS.Timeout | null = null;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('DevArchitect');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[DevArchitect] Initializing extension...');

  // 1. Unconditionally instantiate & register Tree Data Providers FIRST
  // This guarantees VS Code never sees "There is no data provider registered that can provide view data"
  healthTreeProvider = new ArchitectureHealthTreeProvider();
  blastTreeProvider = new ActiveFileBlastRadiusTreeProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('devarchitect.healthView', healthTreeProvider),
    vscode.window.registerTreeDataProvider('devarchitect.blastView', blastTreeProvider)
  );

  // 2. Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'devarchitect.healthCheck';
  statusBarItem.text = '$(shield) DevArchitect';
  statusBarItem.tooltip = 'DevArchitect: Click to evaluate architecture health';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 3. Real-time Gutter & Inline Warning Decorator
  gutterDecorator = new GutterDecorator();
  context.subscriptions.push(gutterDecorator);

  // 4. CodeLens Provider
  codeLensProvider = new BlastRadiusCodeLensProvider();
  const selector: vscode.DocumentSelector = [
    { language: 'typescript', scheme: 'file' },
    { language: 'typescriptreact', scheme: 'file' },
    { language: 'javascript', scheme: 'file' },
    { language: 'javascriptreact', scheme: 'file' },
  ];
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider)
  );

  // 5. Register Extension Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('devarchitect.launchStudio', () => {
      const term = vscode.window.createTerminal('DevArchitect Studio');
      term.sendText('devarchitect studio');
      term.show();
    }),

    vscode.commands.registerCommand('devarchitect.healthCheck', async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'DevArchitect: Analyzing architecture health...',
          cancellable: false,
        },
        async () => {
          await refreshArchitectureContext();
        }
      );
    }),

    vscode.commands.registerCommand('devarchitect.inspectCurrentFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !currentGraph) {
        vscode.window.showInformationMessage('DevArchitect: No active file or graph not yet initialized.');
        return;
      }

      const rel = path.relative(currentRootDir, editor.document.fileName).replace(/\\/g, '/');
      const dependents = currentGraph.getDependents(rel);

      if (dependents.length === 0) {
        vscode.window.showInformationMessage(
          `[${path.basename(rel)}] has 0 downstream dependents (Leaf component or entry point).`
        );
      } else {
        vscode.window.showWarningMessage(
          `[${path.basename(rel)}] is imported by ${dependents.length} downstream file(s): ${dependents.slice(0, 3).join(', ')}${dependents.length > 3 ? '...' : ''}`
        );
      }
    }),

    vscode.commands.registerCommand('devarchitect.validateArchitecture', () => {
      const term = vscode.window.createTerminal('DevArchitect Validation');
      term.sendText('devarchitect validate');
      term.show();
    }),

    vscode.commands.registerCommand('devarchitect.auditEnv', () => {
      const term = vscode.window.createTerminal('DevArchitect Env Audit');
      term.sendText('devarchitect env');
      term.show();
    }),

    vscode.commands.registerCommand('devarchitect.fixSmells', () => {
      const term = vscode.window.createTerminal('DevArchitect Safe Fixer');
      term.sendText('devarchitect fix --dry-run');
      term.show();
    })
  );

  // 6. Track Workspace Changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async (e) => {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        currentRootDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
        healthTreeProvider.setRootDir(currentRootDir);
        blastTreeProvider.setRootDir(currentRootDir);
        await refreshArchitectureContext();
      } else {
        currentRootDir = '';
        healthTreeProvider.setNoWorkspace();
        blastTreeProvider.setNoWorkspace();
        statusBarItem.text = '$(shield) DevArchitect';
      }
    })
  );

  // 7. Track Active Editor & Document Changes for Real-Time Gutter Updates
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && currentRootDir) {
      blastTreeProvider.updateFile(currentRootDir, editor.document.fileName, currentGraph);
      gutterDecorator.updateActiveEditor(editor, currentRootDir, currentGraph);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document && currentRootDir) {
      gutterDecorator.triggerRealtimeLint(event.document, currentRootDir);
    }
  });

  // 8. Re-evaluate architecture on file save (debounced)
  vscode.workspace.onDidSaveTextDocument((document) => {
    const ext = path.extname(document.fileName);
    if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refreshArchitectureContext();
      }, 1500);
    }
  });

  // 9. Initial scan if workspace is open
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    currentRootDir = workspaceFolders[0].uri.fsPath;
    healthTreeProvider.setRootDir(currentRootDir);
    blastTreeProvider.setRootDir(currentRootDir);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      blastTreeProvider.updateFile(currentRootDir, activeEditor.document.fileName, currentGraph);
    }

    refreshArchitectureContext().catch((err) => {
      outputChannel.appendLine(`[DevArchitect] Initial scan error: ${err}`);
    });
  } else {
    healthTreeProvider.setNoWorkspace();
    blastTreeProvider.setNoWorkspace();
  }

  outputChannel.appendLine('[DevArchitect] Extension activated successfully.');
}

async function refreshArchitectureContext() {
  if (!currentRootDir) return;

  try {
    healthTreeProvider.setLoading(true);
    statusBarItem.text = `$(loading~spin) DevArchitect: Scanning...`;

    const { config } = loadConfig(currentRootDir);
    const { discovery, nodes } = await runProjectDiscovery(currentRootDir);
    const { graph } = buildProjectGraph(currentRootDir, nodes, discovery.typeScript);

    currentGraph = graph;
    currentNodes = nodes;

    const issues = defaultRuleEngine.evaluate({
      graph,
      nodes,
      edges: graph.getAllEdges(),
      config,
    });

    const health = calculateProjectHealth({
      nodes,
      issues,
      graph,
      hasTests: Boolean(discovery.detected.testingFramework),
      duplicateBlockCount: 0,
    });

    // Update Status Bar
    statusBarItem.text = `$(shield) Health: ${health.overallScore}/100 (${health.grade})`;
    statusBarItem.tooltip = `DevArchitect: Code Health ${health.overallScore}/100. Violations: ${issues.length}. Click to refresh.`;

    // Update CodeLens
    codeLensProvider.updateContext(currentRootDir, graph, nodes);

    // Update Tree Views
    healthTreeProvider.update(health, issues);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      blastTreeProvider.updateFile(currentRootDir, activeEditor.document.fileName, graph);
      gutterDecorator.updateActiveEditor(activeEditor, currentRootDir, graph);
    }

    outputChannel.appendLine(
      `[DevArchitect] Architecture scanned: ${nodes.length} nodes, ${issues.length} violations, Health: ${health.overallScore}/100.`
    );
  } catch (err: any) {
    healthTreeProvider.setLoading(false);
    statusBarItem.text = `$(shield) DevArchitect: Ready`;
    outputChannel.appendLine(`[DevArchitect] Scan error: ${err?.message || err}`);
  }
}

export function deactivate() {
  if (statusBarItem) statusBarItem.dispose();
  if (debounceTimer) clearTimeout(debounceTimer);
}
