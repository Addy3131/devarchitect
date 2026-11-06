import pc from 'picocolors';
import { exec } from 'node:child_process';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { defaultRuleEngine } from '@devarchitect/rules';
import { loadConfig } from '@devarchitect/config';
import {
  calculateProjectHealth,
  analyzeReactRerenders,
  analyzeTypeHealth,
  analyzeCodeSmells,
  answerCodebaseQuestion
} from '@devarchitect/analyzers';
import { startStudioServer } from '@devarchitect/reporting';

export interface StudioCommandOptions {
  port?: string;
  noOpen?: boolean;
}

export async function studioCommand(options: StudioCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { config } = loadConfig(rootDir);
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph, parsedFiles } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

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

  const rerenders = analyzeReactRerenders(rootDir, nodes);
  const typeHealth = analyzeTypeHealth(rootDir, nodes, graph.getAllEdges(), parsedFiles);
  const smells = analyzeCodeSmells(rootDir, nodes);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT STUDIO — LOCAL WEB DASHBOARD')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  const port = options.port ? parseInt(options.port, 10) : 4321;

  try {
    const { url } = await startStudioServer(
      {
        discovery,
        health,
        nodes,
        edges: graph.getAllEdges(),
        issues,
        metrics: {
          rerendersCount: rerenders.totalIssues,
          unusedTypesCount: typeHealth.unusedTypes.length,
          smellsCount: smells.totalSmells,
        },
      },
      {
        port,
        onAsk: (question: string) => {
          return answerCodebaseQuestion(rootDir, question, nodes, graph.getAllEdges(), graph);
        },
      }
    );

    console.log(pc.green(`\n  ✔ DevArchitect Studio running at: ${pc.bold(pc.underline(url))}`));
    console.log(pc.gray('  Press Ctrl+C to stop the studio server.\n'));

    // Auto-open browser unless --no-open is specified
    if (!options.noOpen) {
      const openCmd =
        process.platform === 'win32'
          ? `start ${url}`
          : process.platform === 'darwin'
          ? `open ${url}`
          : `xdg-open ${url}`;
      exec(openCmd);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ Failed to launch DevArchitect Studio: ${msg}\n`));
  }
}

