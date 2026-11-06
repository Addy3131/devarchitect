import * as vscode from 'vscode';
import path from 'node:path';
import { ArchitectureGraph } from '@devarchitect/graph';
import { ProjectNode, ProjectHealthScore, ArchitectureIssue } from '@devarchitect/contracts';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

export function openStudioWebview(
  context: vscode.ExtensionContext,
  rootDir: string,
  graph: ArchitectureGraph | null,
  nodes: ProjectNode[],
  health: ProjectHealthScore | null,
  issues: ArchitectureIssue[]
) {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  if (currentPanel) {
    currentPanel.reveal(column);
    updateWebviewContent(currentPanel, rootDir, graph, nodes, health, issues);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'devarchitectStudio',
    'DevArchitect — Architecture Studio',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(rootDir)],
    }
  );

  currentPanel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'resources', 'icon.svg'));

  updateWebviewContent(currentPanel, rootDir, graph, nodes, health, issues);

  currentPanel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case 'openFile': {
          const filePath = path.isAbsolute(message.filePath)
            ? message.filePath
            : path.join(rootDir, message.filePath);
          vscode.workspace.openTextDocument(filePath).then((doc) => {
            vscode.window.showTextDocument(doc);
          });
          return;
        }
        case 'refresh': {
          vscode.commands.executeCommand('devarchitect.healthCheck');
          return;
        }
      }
    },
    undefined,
    context.subscriptions
  );

  currentPanel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    null,
    context.subscriptions
  );
}

function updateWebviewContent(
  panel: vscode.WebviewPanel,
  rootDir: string,
  graph: ArchitectureGraph | null,
  nodes: ProjectNode[],
  health: ProjectHealthScore | null,
  issues: ArchitectureIssue[]
) {
  const projectName = path.basename(rootDir) || 'DevArchitect Project';
  const edges = graph ? graph.getAllEdges() : [];
  const overallScore = health?.overallScore ?? 0;
  const grade = health?.grade ?? 'N/A';

  const simplifiedNodes = nodes.slice(0, 150).map((n) => ({
    id: n.path,
    label: path.basename(n.path),
    type: n.type,
    feature: n.feature || 'shared',
    layer: n.layer || 'core',
    loc: n.metrics?.linesOfCode || 0,
    complexity: n.metrics?.complexity || 0,
    dependentsCount: graph ? graph.getDependents(n.path).length : 0,
    dependenciesCount: graph ? graph.getDependencies(n.path).length : 0,
  }));

  const simplifiedEdges = edges.slice(0, 300).map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
  }));

  panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevArchitect Architecture Studio</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e2e);
      --fg: var(--vscode-editor-foreground, #cdd6f4);
      --card-bg: var(--vscode-editorWidget-background, #181825);
      --border: var(--vscode-widget-border, #313244);
      --accent: var(--vscode-button-background, #89b4fa);
      --accent-fg: var(--vscode-button-foreground, #11111b);
      --font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background-color: var(--bg);
      color: var(--fg);
      padding: 20px;
      overflow-x: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .title-group { display: flex; align-items: center; gap: 12px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
      border: 1px solid rgba(137, 180, 250, 0.3);
    }
    .grade-badge {
      font-size: 15px;
      padding: 4px 12px;
      border-radius: 8px;
      background: ${overallScore >= 80 ? 'rgba(166, 227, 161, 0.2)' : overallScore >= 60 ? 'rgba(249, 226, 175, 0.2)' : 'rgba(243, 139, 168, 0.2)'};
      color: ${overallScore >= 80 ? '#a6e3a1' : overallScore >= 60 ? '#f9e2af' : '#f38ba8'};
      font-weight: bold;
    }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }
    .stat-label { font-size: 11px; text-transform: uppercase; opacity: 0.7; margin-bottom: 4px; }
    .stat-val { font-size: 20px; font-weight: bold; }
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .search-input {
      flex: 1;
      min-width: 220px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--fg);
      padding: 8px 12px;
      border-radius: 6px;
      outline: none;
    }
    .filter-btn {
      background: var(--card-bg);
      color: var(--fg);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .filter-btn.active {
      background: var(--accent);
      color: var(--accent-fg);
      border-color: var(--accent);
    }
    .graph-container {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      height: 520px;
    }
    .canvas-panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .canvas-header {
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }
    #nodeCanvas {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 10px;
      align-content: start;
    }
    .node-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 12px;
    }
    .node-card:hover {
      border-color: #89b4fa;
      transform: translateY(-2px);
    }
    .node-card.selected {
      border-color: #f38ba8;
      box-shadow: 0 0 10px rgba(243, 139, 168, 0.4);
    }
    .node-type-component { border-left: 4px solid #cba6f7; }
    .node-type-service { border-left: 4px solid #89b4fa; }
    .node-type-hook { border-left: 4px solid #94e2d5; }
    .node-type-route { border-left: 4px solid #a6e3a1; }
    .node-type-utility { border-left: 4px solid #f9e2af; }
    .node-type-test { border-left: 4px solid #fab387; }
    .node-type-config { border-left: 4px solid #6c7086; }
    .node-title { font-weight: 600; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .node-meta { font-size: 11px; opacity: 0.7; }
    .inspector-panel {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-y: auto;
    }
    .inspector-title { font-size: 15px; font-weight: bold; margin-bottom: 12px; }
    .jump-btn {
      width: 100%;
      background: var(--accent);
      color: var(--accent-fg);
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 14px;
    }
    .blast-list { margin-top: 10px; font-size: 12px; }
    .blast-item { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  </style>
</head>
<body>
  <div class="header">
    <div class="title-group">
      <h2>DevArchitect Studio</h2>
      <span class="badge">${projectName}</span>
      <span class="grade-badge">Health: ${overallScore}/100 (${grade})</span>
    </div>
    <button class="filter-btn" onclick="triggerRefresh()">↻ Refresh Analysis</button>
  </div>

  <div class="stats-bar">
    <div class="stat-card">
      <div class="stat-label">Total Files</div>
      <div class="stat-val">${nodes.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Dependency Edges</div>
      <div class="stat-val">${edges.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Policy Violations</div>
      <div class="stat-val" style="color: ${issues.length > 0 ? '#fab387' : '#a6e3a1'};">${issues.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Architecture Grade</div>
      <div class="stat-val">${grade}</div>
    </div>
  </div>

  <div class="controls">
    <input type="text" id="searchInput" class="search-input" placeholder="Search components, services, routes..." oninput="filterNodes()">
    <button class="filter-btn active" onclick="setFilter('all', this)">All</button>
    <button class="filter-btn" onclick="setFilter('component', this)">Components</button>
    <button class="filter-btn" onclick="setFilter('service', this)">Services</button>
    <button class="filter-btn" onclick="setFilter('hook', this)">Hooks</button>
    <button class="filter-btn" onclick="setFilter('route', this)">Routes</button>
  </div>

  <div class="graph-container">
    <div class="canvas-panel">
      <div class="canvas-header">
        <span>Architecture Nodes</span>
        <span id="nodeCountLabel">Showing ${simplifiedNodes.length} nodes</span>
      </div>
      <div id="nodeCanvas"></div>
    </div>

    <div class="inspector-panel" id="inspectorPanel">
      <div class="inspector-title">Select a Node</div>
      <p style="opacity: 0.7; font-size: 13px;">Click on any component or module in the graph to inspect its blast radius, incoming callers, and dependencies.</p>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const nodes = ${JSON.stringify(simplifiedNodes)};
    const edges = ${JSON.stringify(simplifiedEdges)};
    let activeFilter = 'all';
    let selectedNode = null;

    function renderNodes() {
      const canvas = document.getElementById('nodeCanvas');
      const search = document.getElementById('searchInput').value.toLowerCase();
      canvas.innerHTML = '';

      const filtered = nodes.filter(n => {
        const matchesFilter = activeFilter === 'all' || n.type === activeFilter;
        const matchesSearch = !search || n.id.toLowerCase().includes(search) || n.label.toLowerCase().includes(search);
        return matchesFilter && matchesSearch;
      });

      document.getElementById('nodeCountLabel').innerText = 'Showing ' + filtered.length + ' nodes';

      filtered.forEach(node => {
        const el = document.createElement('div');
        el.className = 'node-card node-type-' + (node.type || 'utility') + (selectedNode === node.id ? ' selected' : '');
        el.innerHTML = \`
          <div class="node-title">\${node.label}</div>
          <div class="node-meta">Type: \${node.type} | LOC: \${node.loc}</div>
          <div class="node-meta" style="color: \${node.dependentsCount > 0 ? '#fab387' : '#a6e3a1'};">
            Blast Radius: \${node.dependentsCount} caller(s)
          </div>
        \`;
        el.onclick = () => selectNode(node);
        canvas.appendChild(el);
      });
    }

    function selectNode(node) {
      selectedNode = node.id;
      renderNodes();

      const incoming = edges.filter(e => e.target === node.id).map(e => e.source);
      const outgoing = edges.filter(e => e.source === node.id).map(e => e.target);

      const panel = document.getElementById('inspectorPanel');
      panel.innerHTML = \`
        <div class="inspector-title">\${node.label}</div>
        <div style="font-size: 12px; opacity: 0.8; word-break: break-all; margin-bottom: 12px;">\${node.id}</div>
        
        <div style="margin-bottom: 8px;"><strong>Layer:</strong> \${node.layer}</div>
        <div style="margin-bottom: 8px;"><strong>Feature:</strong> \${node.feature}</div>
        <div style="margin-bottom: 8px;"><strong>Complexity:</strong> \${node.complexity}</div>
        <div style="margin-bottom: 8px;"><strong>Lines of Code:</strong> \${node.loc}</div>

        <button class="jump-btn" onclick="openFile('\${node.id}')">Jump to File in Editor</button>

        <div style="margin-top: 16px;">
          <strong>💥 Downstream Callers (Blast Radius: \${incoming.length}):</strong>
          <div class="blast-list">
            \${incoming.length === 0 ? '<div class="blast-item" style="opacity:0.6;">0 callers (Leaf or entry point)</div>' : incoming.map(src => '<div class="blast-item" style="color:#fab387;">• ' + src + '</div>').join('')}
          </div>
        </div>

        <div style="margin-top: 16px;">
          <strong>📦 Outgoing Dependencies (\${outgoing.length}):</strong>
          <div class="blast-list">
            \${outgoing.length === 0 ? '<div class="blast-item" style="opacity:0.6;">0 dependencies</div>' : outgoing.map(tgt => '<div class="blast-item">• ' + tgt + '</div>').join('')}
          </div>
        </div>
      \`;
    }

    function openFile(filePath) {
      vscode.postMessage({ command: 'openFile', filePath });
    }

    function triggerRefresh() {
      vscode.postMessage({ command: 'refresh' });
    }

    function setFilter(type, btn) {
      activeFilter = type;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      renderNodes();
    }

    function filterNodes() {
      renderNodes();
    }

    renderNodes();
  </script>
</body>
</html>`;
}

