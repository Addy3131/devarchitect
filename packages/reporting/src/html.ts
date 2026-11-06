import { ProjectDiscovery, ProjectHealthScore, ChangeImpactAnalysis, ArchitectureIssue } from '@devarchitect/contracts';

export interface HtmlReportData {
  discovery: ProjectDiscovery;
  health?: ProjectHealthScore;
  issues?: ArchitectureIssue[];
  mermaidGraph?: string;
}

export function generateHtmlReport(data: HtmlReportData): string {
  const { discovery, health, issues = [], mermaidGraph } = data;
  const p = discovery.project;
  const s = discovery.stats;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevArchitect Report — ${p.name}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --green: #22c55e;
      --yellow: #eab308;
      --red: #ef4444;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
    }
    .card-title {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th, td {
      text-align: left;
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h1 style="margin:0 0 0.5rem 0;">DevArchitect Architecture Report</h1>
        <div style="color:var(--text-muted);">Project: <strong>${p.name}</strong> • Framework: <strong>${p.framework}</strong> • Generated: ${new Date(discovery.timestamp).toLocaleString()}</div>
      </div>
      <div>
        <span class="badge">v0.1.0</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Source Files</div>
      <div class="card-value">${s.sourceFiles}</div>
    </div>
    <div class="card">
      <div class="card-title">Components</div>
      <div class="card-value">${s.components}</div>
    </div>
    <div class="card">
      <div class="card-title">Hooks & Services</div>
      <div class="card-value">${s.hooks + s.services}</div>
    </div>
    <div class="card">
      <div class="card-title">Lines of Code</div>
      <div class="card-value">${s.linesOfCode.toLocaleString()}</div>
    </div>
  </div>

  ${health ? `
  <div class="card" style="margin-bottom: 2rem;">
    <h2 style="margin-top:0;">Project Health Score: ${health.overallScore}/100 [${health.status.toUpperCase()}]</h2>
    <div class="grid" style="margin-bottom: 0;">
      <div>Architecture: <strong>${health.dimensions.architecture.score ?? 'unmeasured'}/100</strong></div>
      <div>Complexity: <strong>${health.dimensions.complexity.score ?? 'unmeasured'}/100</strong></div>
      <div>Dependencies: <strong>${health.dimensions.dependencies.score ?? 'unmeasured'}/100</strong></div>
      <div>Duplication: <strong>${health.dimensions.duplication.score ?? 'unmeasured'}/100</strong></div>
      <div>Maintainability: <strong>${health.dimensions.maintainability.score ?? 'unmeasured'}/100</strong></div>
      <div>Testing: <strong>${health.dimensions.testing.score !== null ? `${health.dimensions.testing.score}/100` : 'unmeasured'}</strong></div>
    </div>
  </div>
  ` : ''}

  ${issues.length > 0 ? `
  <div class="card">
    <h2 style="margin-top:0;">Architecture Issues (${issues.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Rule</th>
          <th>Message</th>
          <th>File</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map(iss => `
          <tr>
            <td style="color:${iss.severity === 'error' ? 'var(--red)' : iss.severity === 'warning' ? 'var(--yellow)' : 'var(--accent)'}; font-weight:bold;">${iss.severity.toUpperCase()}</td>
            <td><code>${iss.ruleId}</code></td>
            <td>${iss.message}</td>
            <td><code>${iss.filePath}</code></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
</body>
</html>
`;
}

