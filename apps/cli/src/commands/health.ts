import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { defaultRuleEngine } from '@devarchitect/rules';
import { loadConfig, CONFIG_DIR } from '@devarchitect/config';
import { calculateProjectHealth, detectDuplication } from '@devarchitect/analyzers';
import { formatHealthOutput } from '@devarchitect/reporting';

export interface HealthCommandOptions {
  json?: boolean;
}

export async function healthCommand(options: HealthCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { config } = loadConfig(rootDir);
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  // Evaluate architectural rules
  const issues = defaultRuleEngine.evaluate({
    graph,
    nodes,
    edges: graph.getAllEdges(),
    config,
  });

  // Calculate duplication
  const duplication = detectDuplication(rootDir, nodes, 6);

  // Calculate transparent health score
  const health = calculateProjectHealth({
    nodes,
    issues,
    graph,
    hasTests: Boolean(discovery.detected.testingFramework),
    duplicateBlockCount: duplication.clusters.length,
  });

  if (options.json) {
    console.log(JSON.stringify(health, null, 2));
    return;
  }

  console.log('\n' + formatHealthOutput(health) + '\n');

  // Save report to .devarchitect/reports/health.json if directory exists
  const reportsDir = path.join(rootDir, CONFIG_DIR, 'reports');
  if (fs.existsSync(reportsDir)) {
    fs.writeFileSync(path.join(reportsDir, 'health.json'), JSON.stringify(health, null, 2), 'utf8');
  }
}
