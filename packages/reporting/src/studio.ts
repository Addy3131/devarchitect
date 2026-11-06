import http from 'node:http';
import { ProjectDiscovery, ProjectHealthScore, ProjectNode, ProjectEdge, ArchitectureIssue } from '@devarchitect/contracts';

export interface StudioServerOptions {
  port?: number;
  openBrowser?: boolean;
  onAsk?: (question: string) => Promise<any> | any;
}

export interface StudioData {
  discovery: ProjectDiscovery;
  health: ProjectHealthScore;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  issues: ArchitectureIssue[];
  metrics: {
    rerendersCount: number;
    unusedTypesCount: number;
    smellsCount: number;
    rerenderDetails?: Array<{ file: string; component: string; message: string; severity: string }>;
    smellDetails?: Array<{ file: string; smell: string; message: string; line: number }>;
  };
}

export function startStudioServer(
  data: StudioData,
  options: StudioServerOptions = {}
): Promise<{ port: number; url: string; server: http.Server }> {
  const preferredPort = options.port || 4321;
  const htmlContent = generateStudioAppHtml(data);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (parsedUrl.pathname === '/api/data') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(data));
        return;
      }

      if (parsedUrl.pathname === '/api/ask') {
        const question = parsedUrl.searchParams.get('q') || '';
        let answer = null;
        if (options.onAsk && question.trim()) {
          try {
            answer = await options.onAsk(question);
          } catch (err) {
            answer = { error: String(err) };
          }
        } else {
          answer = {
            question,
            topic: 'Codebase Intelligence',
            summary: 'Enter a question to query the codebase architecture.',
            flowSteps: [],
            relatedFiles: [],
          };
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(answer));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
    });

    server.listen(preferredPort, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : preferredPort;
      const url = `http://localhost:${port}`;
      resolve({ port, url, server });
    });

    server.on('error', err => {
      reject(err);
    });
  });
}

function generateStudioAppHtml(data: StudioData): string {
  const p = data.discovery.project;
  const h = data.health;
  const featureList = Array.from(new Set(data.nodes.map(n => n.feature).filter(Boolean)));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevArchitect Studio — ${p.name || 'Architecture Workspace'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    :root {
      --bg: #090d16;
      --bg-panel: #0e1526;
      --bg-card: #141e34;
      --border: rgba(255, 255, 255, 0.08);
      --border-accent: rgba(0, 240, 255, 0.3);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --cyan: #00f0ff;
      --cyan-dim: rgba(0, 240, 255, 0.12);
      --purple: #a855f7;
      --purple-dim: rgba(168, 85, 247, 0.12);
      --green: #10b981;
      --green-dim: rgba(16, 185, 129, 0.12);
      --amber: #f59e0b;
      --amber-dim: rgba(245, 158, 11, 0.12);
      --red: #ef4444;
      --red-dim: rgba(239, 68, 68, 0.12);
      --pink: #ec4899;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      user-select: none;
    }

    /* Top Navigation Header */
    header {
      background: rgba(14, 21, 38, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--cyan), var(--purple));
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #000;
      font-size: 0.9rem;
    }
    .brand-title {
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: -0.02em;
      background: linear-gradient(180deg, #fff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      color: var(--green);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
    }
    .nav-tabs {
      display: flex;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.25rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.45rem 0.9rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .nav-btn:hover {
      color: #fff;
    }
    .nav-btn.active {
      background: var(--bg-card);
      color: var(--cyan);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    /* Subheader Stats strip */
    .stats-strip {
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border);
      padding: 0.5rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
    }
    .stats-group {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }
    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .stat-item span { color: var(--text-muted); }
    .stat-item strong { color: #fff; font-weight: 600; }
    .health-badge {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.8rem;
      background: ${h.overallScore >= 80 ? 'var(--green-dim)' : 'var(--amber-dim)'};
      color: ${h.overallScore >= 80 ? 'var(--green)' : 'var(--amber)'};
      border: 1px solid ${h.overallScore >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
    }

    /* Main Workspace Layout */
    .workspace {
      display: flex;
      flex: 1;
      height: calc(100vh - 105px);
      position: relative;
    }
    .view-container {
      flex: 1;
      position: relative;
      display: none;
      height: 100%;
    }
    .view-container.active {
      display: flex;
    }

    /* Canvas View */
    #graphContainer {
      flex: 1;
      height: 100%;
      background: radial-gradient(circle at 50% 50%, #111a33 0%, var(--bg) 100%);
      position: relative;
    }
    #networkCanvas {
      width: 100%;
      height: 100%;
    }

    /* Canvas Floating Controls */
    .canvas-controls {
      position: absolute;
      top: 1rem;
      left: 1rem;
      display: flex;
      gap: 0.5rem;
      z-index: 20;
      background: rgba(14, 21, 38, 0.85);
      backdrop-filter: blur(8px);
      padding: 0.4rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    .filter-input {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.4rem 0.8rem;
      border-radius: 6px;
      font-size: 0.8rem;
      outline: none;
      width: 220px;
      font-family: inherit;
    }
    .filter-input:focus { border-color: var(--cyan); }
    .select-dropdown {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.4rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      outline: none;
      cursor: pointer;
      font-family: inherit;
    }
    .ctrl-btn {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: #fff;
      padding: 0.4rem 0.7rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ctrl-btn:hover { background: rgba(0, 240, 255, 0.15); border-color: var(--cyan); }

    /* Canvas Legend */
    .canvas-legend {
      position: absolute;
      bottom: 1rem;
      left: 1rem;
      background: rgba(14, 21, 38, 0.85);
      backdrop-filter: blur(8px);
      padding: 0.6rem 0.8rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      display: flex;
      gap: 0.8rem;
      font-size: 0.75rem;
      z-index: 20;
    }
    .legend-item { display: flex; align-items: center; gap: 0.35rem; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; }

    /* Slide-out Inspector Panel */
    .inspector-panel {
      width: 380px;
      background: var(--bg-panel);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      z-index: 30;
      overflow-y: auto;
      padding: 1.25rem;
      gap: 1rem;
      transition: all 0.2s ease;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
    }
    .file-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      word-break: break-all;
    }
    .file-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
      word-break: break-all;
    }
    .card-section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.9rem;
    }
    .card-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.6rem;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .metric-box {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.5rem;
    }
    .metric-num { font-size: 1.2rem; font-weight: 700; color: #fff; }
    .metric-lbl { font-size: 0.7rem; color: var(--text-muted); }

    .tag-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      max-height: 180px;
      overflow-y: auto;
    }
    .tag-item {
      font-size: 0.78rem;
      font-family: 'JetBrains Mono', monospace;
      padding: 0.35rem 0.5rem;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tag-item:hover {
      border-color: var(--cyan);
      background: var(--cyan-dim);
      color: var(--cyan);
    }
    .blast-badge {
      background: var(--red-dim);
      color: var(--red);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    /* Q&A Console Tab */
    .qa-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      max-width: 900px;
      margin: 1.5rem auto;
      width: 100%;
      height: calc(100% - 3rem);
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .qa-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.2);
    }
    .qa-chat-area {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .qa-message {
      display: flex;
      gap: 0.75rem;
    }
    .qa-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: bold;
    }
    .qa-avatar.bot { background: linear-gradient(135deg, var(--cyan), var(--purple)); color: #000; }
    .qa-avatar.user { background: var(--border); color: #fff; }
    .qa-bubble {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .qa-flow-step {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      background: rgba(0,0,0,0.3);
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      margin-top: 0.4rem;
      border-left: 2px solid var(--cyan);
    }
    .qa-input-bar {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      background: rgba(0,0,0,0.3);
      display: flex;
      gap: 0.75rem;
    }
    .qa-input {
      flex: 1;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #fff;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
    }
    .qa-input:focus { border-color: var(--cyan); }
    .qa-submit {
      background: linear-gradient(135deg, var(--cyan), #0099ff);
      color: #000;
      border: none;
      border-radius: 8px;
      padding: 0 1.25rem;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.9rem;
    }

    /* Violations & Quality Tables */
    .table-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th {
      text-align: left;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.4);
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
      font-weight: 600;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <div class="brand">
      <div class="brand-logo">DA</div>
      <div>
        <div class="brand-title">DevArchitect Studio</div>
      </div>
      <div class="status-pill">
        <div class="status-dot"></div>
        LIVE ENGINE
      </div>
    </div>

    <div class="nav-tabs">
      <button class="nav-btn active" onclick="switchTab('graph')">🗺️ Architecture Canvas</button>
      <button class="nav-btn" onclick="switchTab('violations')">🛡️ Violations (${data.issues.length})</button>
      <button class="nav-btn" onclick="switchTab('quality')">⚡ Re-renders & Smells (${data.metrics.rerendersCount + data.metrics.smellsCount})</button>
      <button class="nav-btn" onclick="switchTab('qa')">🤖 Ask DevArchitect</button>
    </div>
  </header>

  <!-- Subheader Stats Bar -->
  <div class="stats-strip">
    <div class="stats-group">
      <div class="stat-item">
        <span>Project:</span> <strong>${p.name || 'Repository'}</strong>
      </div>
      <div class="stat-item">
        <span>Framework:</span> <strong>${p.framework || 'Node.js'}</strong>
      </div>
      <div class="stat-item">
        <span>Nodes:</span> <strong>${data.nodes.length}</strong>
      </div>
      <div class="stat-item">
        <span>Edges:</span> <strong>${data.edges.length}</strong>
      </div>
      <div class="stat-item">
        <span>Total LOC:</span> <strong>${data.discovery.stats.linesOfCode.toLocaleString()}</strong>
      </div>
    </div>
    <div class="stats-group">
      <div class="health-badge">
        Code Health: ${h.overallScore}/100 (Grade ${h.grade})
      </div>
    </div>
  </div>

  <!-- Workspace Container -->
  <div class="workspace">
    <!-- VIEW 1: Graph Canvas View -->
    <div id="view-graph" class="view-container active">
      <div id="graphContainer">
        <!-- Floating Canvas Controls -->
        <div class="canvas-controls">
          <input type="text" id="searchInput" class="filter-input" placeholder="Search components, hooks, slices..." oninput="handleSearch()" />
          <select id="sliceSelect" class="select-dropdown" onchange="handleSliceFilter()">
            <option value="ALL">All Feature Slices</option>
            ${featureList.map(f => `<option value="${f}">${f}</option>`).join('')}
          </select>
          <button class="ctrl-btn" onclick="fitNetwork()">Fit to Screen</button>
          <button class="ctrl-btn" id="physicsToggle" onclick="togglePhysics()">Freeze Layout</button>
        </div>

        <div id="networkCanvas"></div>

        <!-- Legend -->
        <div class="canvas-legend">
          <div class="legend-item"><div class="legend-dot" style="background:var(--cyan)"></div> UI Component</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--purple)"></div> Hook / State</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div> Service / API</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--amber)"></div> Utility</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--pink)"></div> Route / Page</div>
          <div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div> Blast Radius</div>
        </div>
      </div>

      <!-- Slide-out Inspector Drawer -->
      <div class="inspector-panel" id="inspector">
        <div class="panel-header">
          <div>
            <div class="file-title" id="inspName">Select a node</div>
            <div class="file-path" id="inspPath">Click any node in the canvas to inspect its blast radius</div>
          </div>
          <span id="inspTypeBadge" class="status-pill" style="display:none;"></span>
        </div>

        <div class="card-section">
          <div class="card-title">Code Metrics</div>
          <div class="metric-grid">
            <div class="metric-box">
              <div class="metric-num" id="inspLoc">-</div>
              <div class="metric-lbl">Lines of Code</div>
            </div>
            <div class="metric-box">
              <div class="metric-num" id="inspComplexity">-</div>
              <div class="metric-lbl">Cyclomatic Complexity</div>
            </div>
          </div>
        </div>

        <div class="card-section">
          <div class="card-title">
            <span>Downstream Blast Radius</span>
            <span id="inspBlastCount" class="blast-badge">0 Dependents</span>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">
            Files that import this file and could break if this contract changes:
          </p>
          <div id="inspDependentsList" class="tag-list">
            <div style="font-size:0.75rem; color:var(--text-muted);">None (Leaf node or entry point)</div>
          </div>
        </div>

        <div class="card-section">
          <div class="card-title">Direct Dependencies</div>
          <div id="inspDependenciesList" class="tag-list">
            <div style="font-size:0.75rem; color:var(--text-muted);">No outgoing imports</div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: Violations Tab -->
    <div id="view-violations" class="view-container">
      <div class="table-container">
        <div style="margin-bottom:1rem;">
          <h2 style="font-size:1.25rem;">Architectural Policy Violations</h2>
          <p style="color:var(--text-muted); font-size:0.85rem;">Enforcing Clean Architecture & Feature-Sliced Design boundary rules</p>
        </div>
        ${data.issues.length === 0 ? `
          <div style="background:var(--green-dim); border:1px solid rgba(16,185,129,0.3); padding:1.5rem; border-radius:8px; color:var(--green);">
            ✔ Zero architectural policy violations detected! Perfect boundary isolation.
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Rule ID</th>
                <th>File Path</th>
                <th>Violation Message</th>
              </tr>
            </thead>
            <tbody>
              ${data.issues.map(i => `
                <tr>
                  <td><span class="status-pill" style="background:${i.severity === 'error' ? 'var(--red-dim)' : 'var(--amber-dim)'}; color:${i.severity === 'error' ? 'var(--red)' : 'var(--amber)'};">${i.severity.toUpperCase()}</span></td>
                  <td><strong>${i.ruleId}</strong></td>
                  <td style="font-family:'JetBrains Mono', monospace;">${i.filePath}</td>
                  <td>${i.message}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>

    <!-- VIEW 3: Quality & Re-renders Tab -->
    <div id="view-quality" class="view-container">
      <div class="table-container">
        <div style="margin-bottom:1rem;">
          <h2 style="font-size:1.25rem;">React Re-renders, Unsafe Types & Code Smells</h2>
          <p style="color:var(--text-muted); font-size:0.85rem;">Detects inline JSX object allocations, hook traps, and unhandled async promises</p>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:1rem; margin-bottom:1.5rem;">
          <div class="card-section">
            <div class="card-title">Re-render Traps</div>
            <div style="font-size:1.75rem; font-weight:700; color:var(--cyan);">${data.metrics.rerendersCount}</div>
          </div>
          <div class="card-section">
            <div class="card-title">Unused / Loose Types</div>
            <div style="font-size:1.75rem; font-weight:700; color:var(--purple);">${data.metrics.unusedTypesCount}</div>
          </div>
          <div class="card-section">
            <div class="card-title">Code Smells & Promises</div>
            <div style="font-size:1.75rem; font-weight:700; color:var(--amber);">${data.metrics.smellsCount}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 4: Grounded Codebase Q&A Tab -->
    <div id="view-qa" class="view-container">
      <div class="qa-container">
        <div class="qa-header">
          <h3 style="font-size:1.1rem; font-weight:700;">Ask DevArchitect Codebase Intelligence</h3>
          <p style="color:var(--text-muted); font-size:0.8rem; margin-top:0.2rem;">
            Answers are synthesized deterministically from your AST graph with zero hallucinations.
          </p>
        </div>
        <div class="qa-chat-area" id="qaMessages">
          <div class="qa-message">
            <div class="qa-avatar bot">DA</div>
            <div class="qa-bubble">
              👋 Hi! I have indexed your repository (${data.nodes.length} files, ${data.edges.length} dependency edges).
              <br><br>
              <strong>Sample questions you can ask me:</strong>
              <div style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.6rem;">
                <button class="ctrl-btn" onclick="askPreset('How is checkout architected?')">How is checkout architected?</button>
                <button class="ctrl-btn" onclick="askPreset('Who uses productService?')">Who uses productService?</button>
                <button class="ctrl-btn" onclick="askPreset('What are the most complex files?')">What are the most complex files?</button>
                <button class="ctrl-btn" onclick="askPreset('Where is CheckoutForm?')">Where is CheckoutForm?</button>
              </div>
            </div>
          </div>
        </div>
        <div class="qa-input-bar">
          <input type="text" id="qaInput" class="qa-input" placeholder="Ask about architecture, data flow, dependencies, or components..." onkeydown="if(event.key==='Enter') submitQuestion()" />
          <button class="qa-submit" onclick="submitQuestion()">Ask</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const rawNodes = ${JSON.stringify(data.nodes)};
    const rawEdges = ${JSON.stringify(data.edges)};

    let network = null;
    let physicsEnabled = true;

    // Node Type to Color mapping
    const typeColors = {
      component: { bg: '#00f0ff', border: '#00c4d1', highlight: '#ffffff' },
      hook:      { bg: '#a855f7', border: '#9333ea', highlight: '#ffffff' },
      service:   { bg: '#10b981', border: '#059669', highlight: '#ffffff' },
      utility:   { bg: '#f59e0b', border: '#d97706', highlight: '#ffffff' },
      route:     { bg: '#ec4899', border: '#db2777', highlight: '#ffffff' },
      default:   { bg: '#64748b', border: '#475569', highlight: '#ffffff' },
    };

    function initNetwork() {
      const container = document.getElementById('networkCanvas');

      const visNodes = rawNodes.map(n => {
        const c = typeColors[n.type] || typeColors.default;
        const size = Math.max(14, Math.min(32, 14 + (n.metrics?.linesOfCode || 10) / 15));
        return {
          id: n.path,
          label: n.name,
          color: {
            background: c.bg,
            border: c.border,
            highlight: { background: c.bg, border: '#ffffff' }
          },
          shape: 'dot',
          size: size,
          font: { color: '#f8fafc', face: 'Plus Jakarta Sans', size: 12 },
          data: n
        };
      });

      const visEdges = rawEdges.map((e, idx) => ({
        id: 'e_' + idx,
        from: e.source,
        to: e.target,
        arrows: 'to',
        color: { color: 'rgba(255, 255, 255, 0.15)', highlight: '#00f0ff' },
        width: 1.2
      }));

      const options = {
        nodes: {
          borderWidth: 2,
          shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10 }
        },
        edges: {
          smooth: { type: 'continuous' }
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -40,
            centralGravity: 0.008,
            springLength: 100,
            springConstant: 0.08
          },
          stabilization: { iterations: 120 }
        },
        interaction: {
          hover: true,
          tooltipDelay: 100
        }
      };

      network = new vis.Network(container, { nodes: visNodes, edges: visEdges }, options);

      // Node selection click handler -> Highlight blast radius & fill inspector
      network.on('click', function(params) {
        if (params.nodes.length > 0) {
          const selectedPath = params.nodes[0];
          selectNode(selectedPath);
        }
      });
    }

    function selectNode(filePath) {
      const node = rawNodes.find(n => n.path === filePath);
      if (!node) return;

      // Update Inspector Panel
      document.getElementById('inspName').textContent = node.name;
      document.getElementById('inspPath').textContent = node.path;
      document.getElementById('inspLoc').textContent = node.metrics?.linesOfCode || '0';
      document.getElementById('inspComplexity').textContent = node.metrics?.complexity ?? 'N/A';

      const typeBadge = document.getElementById('inspTypeBadge');
      typeBadge.style.display = 'inline-block';
      typeBadge.textContent = node.type.toUpperCase() + (node.feature ? ' (' + node.feature + ')' : '');

      // Calculate Dependents (who imports this?)
      const dependents = rawEdges.filter(e => e.target === filePath).map(e => e.source);
      document.getElementById('inspBlastCount').textContent = dependents.length + ' Dependents';

      const depList = document.getElementById('inspDependentsList');
      if (dependents.length === 0) {
        depList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted);">None (Leaf node or entry point)</div>';
      } else {
        depList.innerHTML = dependents.map(d => '<div class="tag-item" onclick="selectNode(\\'' + d + '\\')">💥 ' + d + '</div>').join('');
      }

      // Calculate Dependencies (what does this import?)
      const dependencies = rawEdges.filter(e => e.source === filePath).map(e => e.target);
      const outgoingList = document.getElementById('inspDependenciesList');
      if (dependencies.length === 0) {
        outgoingList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted);">No outgoing imports</div>';
      } else {
        outgoingList.innerHTML = dependencies.map(d => '<div class="tag-item" onclick="selectNode(\\'' + d + '\\')">📦 ' + d + '</div>').join('');
      }

      // Highlight network with glowing blast radius:
      // Dependents = RED/AMBER, Dependencies = GREEN, Selected = CYAN
      if (network) {
        const highlightIds = [filePath, ...dependents, ...dependencies];
        network.selectNodes(highlightIds);
      }
    }

    function fitNetwork() {
      if (network) network.fit({ animation: { duration: 500 } });
    }

    function togglePhysics() {
      if (!network) return;
      physicsEnabled = !physicsEnabled;
      network.setOptions({ physics: { enabled: physicsEnabled } });
      document.getElementById('physicsToggle').textContent = physicsEnabled ? 'Freeze Layout' : 'Resume Physics';
    }

    function handleSearch() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      if (!q || !network) return;
      const matched = rawNodes.find(n => n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q));
      if (matched) {
        selectNode(matched.path);
        network.focus(matched.path, { scale: 1.2, animation: { duration: 400 } });
      }
    }

    function handleSliceFilter() {
      const val = document.getElementById('sliceSelect').value;
      if (!network) return;
      if (val === 'ALL') {
        network.fit();
        return;
      }
      const matched = rawNodes.filter(n => n.feature === val).map(n => n.path);
      if (matched.length > 0) {
        network.selectNodes(matched);
      }
    }

    function switchTab(tabId) {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));

      event.currentTarget.classList.add('active');
      document.getElementById('view-' + tabId).classList.add('active');

      if (tabId === 'graph' && network) {
        setTimeout(() => network.redraw(), 100);
      }
    }

    // Codebase Q&A Flow
    async function submitQuestion() {
      const input = document.getElementById('qaInput');
      const q = input.value.trim();
      if (!q) return;

      appendChatMessage('user', q);
      input.value = '';

      try {
        const res = await fetch('/api/ask?q=' + encodeURIComponent(q));
        const data = await res.json();

        let botHtml = '<strong>' + (data.topic || 'Architecture Insight') + '</strong><br>' + data.summary;
        if (data.flowSteps && data.flowSteps.length > 0) {
          botHtml += '<br><br><strong>Execution Flow:</strong>';
          data.flowSteps.forEach(step => {
            botHtml += '<div class="qa-flow-step">' + step + '</div>';
          });
        }
        if (data.relatedFiles && data.relatedFiles.length > 0) {
          botHtml += '<br><strong>Referenced Files:</strong><br>';
          data.relatedFiles.forEach(f => {
            botHtml += '<button class="ctrl-btn" style="margin:2px;" onclick="goToNode(\\'' + f + '\\')">' + f + '</button> ';
          });
        }
        appendChatMessage('bot', botHtml);
      } catch (err) {
        appendChatMessage('bot', 'Error querying architecture engine: ' + err.message);
      }
    }

    function askPreset(q) {
      document.getElementById('qaInput').value = q;
      submitQuestion();
    }

    function goToNode(filePath) {
      switchTab('graph');
      document.querySelector('.nav-btn').classList.add('active');
      selectNode(filePath);
      if (network) network.focus(filePath, { scale: 1.2, animation: { duration: 400 } });
    }

    function appendChatMessage(sender, html) {
      const container = document.getElementById('qaMessages');
      const msg = document.createElement('div');
      msg.className = 'qa-message';
      msg.innerHTML = '<div class="qa-avatar ' + sender + '">' + (sender === 'bot' ? 'DA' : 'ME') + '</div><div class="qa-bubble">' + html + '</div>';
      container.appendChild(msg);
      container.scrollTop = container.scrollHeight;
    }

    window.addEventListener('load', () => {
      initNetwork();
      if (rawNodes.length > 0) {
        selectNode(rawNodes[0].path);
      }
    });
  </script>
</body>
</html>`;
}
