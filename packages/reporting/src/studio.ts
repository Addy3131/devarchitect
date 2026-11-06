import http from 'node:http';
import { ProjectDiscovery, ProjectHealthScore, ProjectNode, ProjectEdge, ArchitectureIssue } from '@devarchitect/contracts';

export interface StudioServerOptions {
  port?: number;
  openBrowser?: boolean;
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
  };
}

export function startStudioServer(
  data: StudioData,
  options: StudioServerOptions = {}
): Promise<{ port: number; url: string; server: http.Server }> {
  const preferredPort = options.port || 4321;

  const htmlContent = generateStudioAppHtml(data);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/data') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(data));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevArchitect Studio — ${p.name}</title>
  <style>
    :root {
      --bg: #0b0f19;
      --panel: #111827;
      --card: #1f2937;
      --border: #374151;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --green: #22c55e;
      --yellow: #eab308;
      --red: #ef4444;
      --purple: #a855f7;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { font-size: 1.25rem; font-weight: 700; color: var(--accent); }
    .nav-tabs { display: flex; gap: 1rem; }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 0.4rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 600;
    }
    .tab-btn.active {
      background: var(--card);
      color: var(--accent);
      border-color: var(--border);
    }
    .main-container {
      display: flex;
      flex: 1;
      height: calc(100vh - 60px);
    }
    .sidebar {
      width: 340px;
      background: var(--panel);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .canvas-area {
      flex: 1;
      position: relative;
      background: radial-gradient(#1f2937 1px, transparent 1px);
      background-size: 24px 24px;
      background-color: var(--bg);
      overflow: hidden;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    .metric-value { font-size: 1.75rem; font-weight: 700; }
    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .node-item {
      padding: 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid var(--border);
      background: var(--card);
      margin-bottom: 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .node-item:hover, .node-item.selected {
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.1);
    }
    #graphCanvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    .search-box {
      width: 100%;
      padding: 0.5rem;
      border-radius: 0.375rem;
      border: 1px solid var(--border);
      background: var(--bg);
      color: #fff;
    }
  </style>
</head>
<body>
  <header>
    <div style="display:flex; align-items:center; gap: 1rem;">
      <span class="logo">DevArchitect Studio</span>
      <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent);">${p.name} (${p.framework})</span>
    </div>
    <div class="nav-tabs">
      <button class="tab-btn active">Architecture Map</button>
      <button class="tab-btn" onclick="alert('Viewing health score: ${h.overallScore}/100')">Code Health (${h.grade})</button>
    </div>
  </header>

  <div class="main-container">
    <div class="sidebar">
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase;">Project Health</div>
            <div class="metric-value" style="color:${h.overallScore >= 80 ? 'var(--green)' : 'var(--yellow)'};">${h.overallScore}/100</div>
          </div>
          <div class="badge" style="background:${h.overallScore >= 80 ? 'var(--green)' : 'var(--yellow)'}; color:#000; font-weight:bold; font-size:1rem;">
            Grade ${h.grade}
          </div>
        </div>
      </div>

      <div class="card">
        <div style="font-size:0.8rem; color:var(--text-muted); text-transform:uppercase; margin-bottom:0.5rem;">Repository Overview</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; font-size:0.85rem;">
          <div>Nodes: <strong>${data.nodes.length}</strong></div>
          <div>Edges: <strong>${data.edges.length}</strong></div>
          <div>LOC: <strong>${data.discovery.stats.linesOfCode.toLocaleString()}</strong></div>
          <div>Violations: <strong>${data.issues.length}</strong></div>
        </div>
      </div>

      <div>
        <input type="text" id="filterInput" class="search-box" placeholder="Filter nodes / search components..." oninput="filterNodes()" />
      </div>

      <div id="nodesList" style="flex:1; overflow-y:auto;">
        ${data.nodes.map(n => `
          <div class="node-item" onclick="selectNode('${n.path}')">
            <div>
              <div style="font-weight:600;">${n.name}</div>
              <div style="color:var(--text-muted); font-size:0.75rem;">${n.path}</div>
            </div>
            <span class="badge" style="background:#374151;">${n.type}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="canvas-area">
      <canvas id="graphCanvas"></canvas>
      <div style="position:absolute; bottom:1rem; right:1rem; background:rgba(17,24,39,0.9); padding:0.75rem; border-radius:0.5rem; border:1px solid var(--border); font-size:0.8rem;">
        Click any node to highlight dependents & blast radius
      </div>
    </div>
  </div>

  <script>
    const nodes = ${JSON.stringify(data.nodes)};
    const edges = ${JSON.stringify(data.edges)};
    let selectedNodeId = null;

    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      draw();
    }
    window.addEventListener('resize', resizeCanvas);

    // Layout nodes in columns by layer/type
    const nodeCoords = new Map();
    function layoutGraph() {
      const typeGroups = { route: [], component: [], hook: [], service: [], utility: [], other: [] };
      nodes.forEach(n => {
        if (typeGroups[n.type]) typeGroups[n.type].push(n);
        else typeGroups.other.push(n);
      });

      const cols = Object.keys(typeGroups).filter(k => typeGroups[k].length > 0);
      const colWidth = canvas.width / (cols.length + 1);

      cols.forEach((colKey, colIdx) => {
        const group = typeGroups[colKey];
        const rowHeight = canvas.height / (group.length + 1);
        group.forEach((node, rowIdx) => {
          nodeCoords.set(node.path, {
            x: (colIdx + 1) * colWidth,
            y: (rowIdx + 1) * rowHeight,
            radius: 20,
            node
          });
        });
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      layoutGraph();

      // Draw edges
      edges.forEach(e => {
        const src = nodeCoords.get(e.source);
        const tgt = nodeCoords.get(e.target);
        if (!src || !tgt) return;

        const isHighlight = selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = isHighlight ? '#38bdf8' : 'rgba(75, 85, 99, 0.4)';
        ctx.lineWidth = isHighlight ? 2.5 : 1;
        ctx.stroke();
      });

      // Draw nodes
      nodeCoords.forEach(({ x, y, radius, node }) => {
        const isSelected = selectedNodeId === node.path;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? radius + 4 : radius, 0, Math.PI * 2);
        ctx.fillStyle = node.type === 'component' ? '#38bdf8' : node.type === 'service' ? '#22c55e' : node.type === 'hook' ? '#a855f7' : '#eab308';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : '#1f2937';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f9fafb';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, x, y + radius + 14);
      });
    }

    function selectNode(id) {
      selectedNodeId = id;
      draw();
    }

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let found = null;
      nodeCoords.forEach(({ x, y, radius, node }) => {
        const dist = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);
        if (dist <= radius) found = node.path;
      });

      selectedNodeId = found;
      draw();
    });

    setTimeout(resizeCanvas, 50);
  </script>
</body>
</html>`;
}

