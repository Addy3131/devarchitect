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

let statusBarItem: vscode.StatusBarItem;
let codeLensProvider: BlastRadiusCodeLensProvider;
let healthTreeProvider: ArchitectureHealthTreeProvider;
let blastTreeProvider: ActiveFileBlastRadiusTreeProvider;
let gutterDecorator: GutterDecorator;
let currentGraph: ArchitectureGraph | null = null;
let currentNodes: ProjectNode[] = [];
let currentRootDir: string = '';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  currentRootDir = workspaceFolders[0].uri.fsPath;

  // 1. Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'devarchitect.healthCheck';
  statusBarItem.text = '$(shield) DevArchitect: Initializing...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 2. Tree Views in Sidebar
  healthTreeProvider = new ArchitectureHealthTreeProvider();
  blastTreeProvider = new ActiveFileBlastRadiusTreeProvider();
  vscode.window.registerTreeDataProvider('devarchitect.healthView', healthTreeProvider);
  vscode.window.registerTreeDataProvider('devarchitect.blastView', blastTreeProvider);

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

  // 4. Register Extension Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('devarchitect.launchStudio', () => {
      const term = vscode.window.createTerminal('DevArchitect Studio');
      term.sendText('devarchitect studio');
      term.show();
    }),

    vscode.commands.registerCommand('devarchitect.healthCheck', async () => {
      await refreshArchitectureContext();
      vscode.window.showInformationMessage(
        `DevArchitect Status: Ready. Code Health evaluated.`
      );
    }),

    vscode.commands.registerCommand('devarchitect.inspectCurrentFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !currentGraph) return;

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

  // 5. Track Active Editor & Document Changes for Real-Time Gutter Updates
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      blastTreeProvider.updateFile(currentRootDir, editor.document.fileName, currentGraph);
      gutterDecorator.updateActiveEditor(editor, currentRootDir, currentGraph);
    }
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document) {
      gutterDecorator.triggerRealtimeLint(event.document, currentRootDir);
    }
  });

  // Initial Scan
  await refreshArchitectureContext();
}

async function refreshArchitectureContext() {
  if (!currentRootDir) return;

  try {
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
    statusBarItem.tooltip = `DevArchitect: Overall Code Health ${health.overallScore}/100. Violations: ${issues.length}`;

    // Update CodeLens
    codeLensProvider.updateContext(currentRootDir, graph, nodes);

    // Update Tree Views
    healthTreeProvider.update(health, issues);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      blastTreeProvider.updateFile(currentRootDir, activeEditor.document.fileName, graph);
      gutterDecorator.updateActiveEditor(activeEditor, currentRootDir, graph);
    }
  } catch (err) {
    statusBarItem.text = `$(shield) DevArchitect: Idle`;
  }
}

export function deactivate() {
  if (statusBarItem) statusBarItem.dispose();
}

