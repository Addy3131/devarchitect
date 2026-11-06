import * as vscode from 'vscode';
import path from 'node:path';
import fs from 'node:fs';
import { runProjectDiscovery, buildProjectGraph, findSubprojectPackages } from '@devarchitect/core';
import { defaultRuleEngine } from '@devarchitect/rules';
import { loadConfig } from '@devarchitect/config';
import { calculateProjectHealth } from '@devarchitect/analyzers';
import { ArchitectureGraph } from '@devarchitect/graph';
import { ProjectNode, ProjectHealthScore, ArchitectureIssue } from '@devarchitect/contracts';
import { BlastRadiusCodeLensProvider } from './blastRadiusCodeLens.js';
import { ArchitectureHealthTreeProvider, ActiveFileBlastRadiusTreeProvider } from './healthView.js';
import { GutterDecorator } from './gutterDecorator.js';
import { openStudioWebview } from './studioWebview.js';

let extensionContext: vscode.ExtensionContext;
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let codeLensProvider: BlastRadiusCodeLensProvider;
let healthTreeProvider: ArchitectureHealthTreeProvider;
let blastTreeProvider: ActiveFileBlastRadiusTreeProvider;
let gutterDecorator: GutterDecorator;
let currentGraph: ArchitectureGraph | null = null;
let currentNodes: ProjectNode[] = [];
let currentHealth: ProjectHealthScore | null = null;
let currentIssues: ArchitectureIssue[] = [];
let currentRootDir: string = '';
let currentTargetDir: string = '';
let debounceTimer: NodeJS.Timeout | null = null;

export async function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  outputChannel = vscode.window.createOutputChannel('DevArchitect');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('[DevArchitect] Initializing extension...');

  // 1. Unconditionally instantiate & register Tree Data Providers FIRST
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
      openStudioWebview(
        extensionContext,
        currentTargetDir || currentRootDir,
        currentGraph,
        currentNodes,
        currentHealth,
        currentIssues
      );
    }),

    vscode.commands.registerCommand('devarchitect.openStudioWebview', () => {
      openStudioWebview(
        extensionContext,
        currentTargetDir || currentRootDir,
        currentGraph,
        currentNodes,
        currentHealth,
        currentIssues
      );
    }),

    vscode.commands.registerCommand('devarchitect.healthCheck', async () => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'DevArchitect: Analyzing codebase architecture...',
          cancellable: false,
        },
        async () => {
          await refreshArchitectureContext();
        }
      );
    }),

    vscode.commands.registerCommand('devarchitect.refreshBlastRadius', () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && (currentTargetDir || currentRootDir)) {
        blastTreeProvider.updateFile(currentTargetDir || currentRootDir, activeEditor.document.fileName, currentGraph);
      } else {
        blastTreeProvider.refresh();
      }
    }),

    vscode.commands.registerCommand('devarchitect.selectProjectRoot', async () => {
      await promptSelectProjectRoot();
    }),

    vscode.commands.registerCommand('devarchitect.inspectCurrentFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !currentGraph) {
        vscode.window.showInformationMessage('DevArchitect: No active file or graph not yet initialized.');
        return;
      }

      const activeDir = currentTargetDir || currentRootDir;
      const rel = path.relative(activeDir, editor.document.fileName).replace(/\\/g, '/');
      const dependents = currentGraph.getDependents(rel);

      if (dependents.length === 0) {
        vscode.window.showInformationMessage(
          `[${path.basename(rel)}] has 0 downstream callers (Leaf component or entry point).`
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
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        currentRootDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
        currentTargetDir = currentRootDir;
        healthTreeProvider.setRootDir(currentRootDir, currentTargetDir);
        blastTreeProvider.setRootDir(currentTargetDir);
        await refreshArchitectureContext();
      } else {
        currentRootDir = '';
        currentTargetDir = '';
        healthTreeProvider.setNoWorkspace();
        blastTreeProvider.setNoWorkspace();
        statusBarItem.text = '$(shield) DevArchitect';
      }
    })
  );

  // 7. Track Active Editor & Document Changes for Real-Time Updates
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && (currentTargetDir || currentRootDir)) {
      const activeDir = currentTargetDir || currentRootDir;
      blastTreeProvider.updateFile(activeDir, editor.document.fileName, currentGraph);
      gutterDecorator.updateActiveEditor(editor, activeDir, currentGraph);
    }
  });

  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document && (currentTargetDir || currentRootDir)) {
      const activeDir = currentTargetDir || currentRootDir;
      gutterDecorator.triggerRealtimeLint(event.document, activeDir);
    }
  });

  // 8. Re-evaluate architecture on file save (debounced)
  vscode.workspace.onDidSaveTextDocument((document) => {
    const ext = path.extname(document.fileName);
    if (['.ts', '.tsx', '.js', '.jsx', '.json'].includes(ext)) {
      const activeDir = currentTargetDir || currentRootDir;
      if (activeDir) {
        blastTreeProvider.updateFile(activeDir, document.fileName, currentGraph);
      }

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
    currentTargetDir = currentRootDir;
    healthTreeProvider.setRootDir(currentRootDir, currentTargetDir);
    blastTreeProvider.setRootDir(currentTargetDir);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      blastTreeProvider.updateFile(currentTargetDir, activeEditor.document.fileName, currentGraph);
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

async function promptSelectProjectRoot() {
  if (!currentRootDir) return;

  const candidates: Array<{ label: string; description: string; dir: string }> = [
    {
      label: `$(root-folder) Workspace Root (${path.basename(currentRootDir)})`,
      description: currentRootDir,
      dir: currentRootDir,
    },
  ];

  // Discover subfolders with package.json or tsconfig
  try {
    const subprojects = findSubprojectPackages(currentRootDir);
    for (const sub of subprojects) {
      candidates.push({
        label: `$(folder) ${sub.name}`,
        description: path.relative(currentRootDir, sub.dir),
        dir: sub.dir,
      });
    }

    const entries = fs.readdirSync(currentRootDir, { withFileTypes: true });
    const ignored = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', '.turbo', '.vscode', '.agents', '.claude', '.devarchitect']);
    for (const entry of entries) {
      if (entry.isDirectory() && !ignored.has(entry.name)) {
        const full = path.join(currentRootDir, entry.name);
        const hasTs = fs.existsSync(path.join(full, 'tsconfig.json'));
        if (hasTs && !candidates.some((c) => c.dir === full)) {
          candidates.push({
            label: `$(file-code) ${entry.name}`,
            description: `TypeScript project in ${entry.name}`,
            dir: full,
          });
        }
      }
    }
  } catch {
    // Ignore scan errors
  }

  const selected = await vscode.window.showQuickPick(candidates, {
    placeHolder: 'Select target project or subfolder for DevArchitect analysis',
    title: 'DevArchitect: Target Project Scope',
  });

  if (selected) {
    currentTargetDir = selected.dir;
    healthTreeProvider.setRootDir(currentRootDir, currentTargetDir);
    blastTreeProvider.setRootDir(currentTargetDir);
    vscode.window.showInformationMessage(`DevArchitect target scoped to: ${selected.label}`);
    await refreshArchitectureContext();
  }
}

async function refreshArchitectureContext() {
  const activeDir = currentTargetDir || currentRootDir;
  if (!activeDir) return;

  try {
    healthTreeProvider.setLoading(true);
    statusBarItem.text = `$(loading~spin) DevArchitect: Scanning...`;

    let scanDir = activeDir;
    let { config } = loadConfig(scanDir);
    let { discovery, nodes } = await runProjectDiscovery(scanDir);

    // If 0 nodes found at current target, automatically check if a subproject exists (e.g. futurotec-latest)
    if (nodes.length === 0 && scanDir === currentRootDir) {
      const subprojects = findSubprojectPackages(currentRootDir);
      if (subprojects.length > 0) {
        scanDir = subprojects[0].dir;
        currentTargetDir = scanDir;
        healthTreeProvider.setRootDir(currentRootDir, currentTargetDir);
        blastTreeProvider.setRootDir(currentTargetDir);
        const subResult = await runProjectDiscovery(scanDir);
        discovery = subResult.discovery;
        nodes = subResult.nodes;
        config = loadConfig(scanDir).config;
        outputChannel.appendLine(
          `[DevArchitect] Auto-targeted nested subproject: ${path.basename(scanDir)} (${nodes.length} files found)`
        );
      }
    }

    const { graph } = buildProjectGraph(scanDir, nodes, discovery.typeScript);

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

    currentHealth = health;
    currentIssues = issues;

    // Update Status Bar
    if (nodes.length === 0) {
      statusBarItem.text = `$(shield) Health: 0/100 (0 files)`;
      statusBarItem.tooltip = `DevArchitect: 0 source files found. Click to switch project subfolder.`;
    } else {
      statusBarItem.text = `$(shield) Health: ${health.overallScore}/100 (${health.grade})`;
      statusBarItem.tooltip = `DevArchitect: [${path.basename(scanDir)}] Health ${health.overallScore}/100. Violations: ${issues.length}. Click to refresh.`;
    }

    // Update CodeLens
    codeLensProvider.updateContext(scanDir, graph, nodes);

    // Update Tree Views
    healthTreeProvider.update(health, issues, nodes.length);

    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      blastTreeProvider.updateFile(scanDir, activeEditor.document.fileName, graph);
      gutterDecorator.updateActiveEditor(activeEditor, scanDir, graph);
    }

    outputChannel.appendLine(
      `[DevArchitect] Scanned [${path.basename(scanDir)}]: ${nodes.length} files, ${issues.length} violations, Health: ${health.overallScore}/100.`
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
