import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { toMermaidFlowchart, toDotFormat, detectCycles } from '@devarchitect/graph';
import { CONFIG_DIR } from '@devarchitect/config';

export interface GraphCommandOptions {
  format?: 'mermaid' | 'dot' | 'json';
  output?: string;
  focus?: string;
  depth?: string;
}

export async function graphCommand(options: GraphCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  const format = options.format || 'mermaid';
  const cycles = detectCycles(graph);
  const edges = graph.getAllEdges();
  const allNodes = graph.getAllNodes();

  let formattedOutput = '';

  if (format === 'mermaid') {
    formattedOutput = toMermaidFlowchart(graph);
  } else if (format === 'dot') {
    formattedOutput = toDotFormat(graph);
  } else if (format === 'json') {
    formattedOutput = JSON.stringify(graph.toProjectGraph(rootDir), null, 2);
  }

  if (options.output) {
    const outPath = path.resolve(rootDir, options.output);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, formattedOutput, 'utf8');
    console.log(pc.green(`✔ Exported architecture graph (${format}) to ${pc.bold(outPath)}\n`));
  } else {
    console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log(pc.bold(pc.cyan(`  DEVARCHITECT ARCHITECTURE GRAPH (${format.toUpperCase()})`)));
    console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log(`  Nodes: ${pc.bold(String(allNodes.length))} | Edges: ${pc.bold(String(edges.length))} | Cycles: ${cycles.length > 0 ? pc.red(String(cycles.length)) : pc.green('0')}\n`);
    console.log(formattedOutput);
    console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log(pc.gray(`  Tip: Use --output graph.${format === 'mermaid' ? 'mmd' : format} to save to file\n`));
  }
}
