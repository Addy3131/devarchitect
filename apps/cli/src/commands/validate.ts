import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { loadConfig, loadBaseline, saveBaseline } from '@devarchitect/config';
import { ArchitectureIssue } from '@devarchitect/contracts';
import { formatIssuesOutput } from '@devarchitect/reporting';
import { defaultRuleEngine } from '@devarchitect/rules';
import { detectCycles } from '@devarchitect/graph';

export interface ValidateCommandOptions {
  updateBaseline?: boolean;
}

export async function validateCommand(options: ValidateCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { config } = loadConfig(rootDir);
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT ARCHITECTURE VALIDATION')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Preset: ${pc.bold(config.architecture.preset)} | Nodes: ${nodes.length} | Edges: ${graph.getAllEdges().length}\n`);

  // Evaluate all rules via RuleEngine
  const issues = defaultRuleEngine.evaluate({
    graph,
    nodes,
    edges: graph.getAllEdges(),
    config,
  });

  const cycles = detectCycles(graph);
  const baseline = loadBaseline(rootDir);

  if (options.updateBaseline) {
    saveBaseline(rootDir, {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      issueCounts: {
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        circularDependencies: cycles.length,
      },
      issues: issues.map(i => ({
        ruleId: i.ruleId,
        filePath: i.filePath,
        hash: `${i.ruleId}:${i.filePath}`,
      })),
    });
    console.log(pc.green(`✔ Updated architecture baseline with ${issues.length} debt items.\n`));
    return;
  }

  // Filter against baseline if ratchet is enabled
  let newErrorsCount = 0;
  if (config.guard.baseline && baseline) {
    const baselineHashes = new Set(baseline.issues.map(b => b.hash));
    for (const issue of issues) {
      const hash = `${issue.ruleId}:${issue.filePath}`;
      if (!baselineHashes.has(hash) && issue.severity === 'error') {
        newErrorsCount++;
      }
    }
    console.log(pc.gray(`  Architecture Debt Ratchet: Baseline has ${baseline.issues.length} known debt items.`));
  } else {
    newErrorsCount = issues.filter(i => i.severity === 'error').length;
  }

  console.log(formatIssuesOutput(issues));

  if (newErrorsCount > 0 && config.guard.failOnNewErrors) {
    console.error(pc.red(`✖ Architecture check failed: ${newErrorsCount} new architectural errors detected.\n`));
    process.exit(1);
  } else {
    console.log(pc.green('✔ Architecture policy validation passed.\n'));
  }
}
