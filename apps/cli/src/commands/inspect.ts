import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { NodeType } from '@devarchitect/contracts';

export interface InspectCommandOptions {
  type?: NodeType;
  feature?: string;
}

export async function inspectCommand(options: InspectCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);

  let filtered = nodes;
  if (options.type) {
    filtered = filtered.filter(n => n.type === options.type);
  }
  if (options.feature) {
    filtered = filtered.filter(n => n.feature === options.feature);
  }

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT REPOSITORY INSPECTION')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Project: ${pc.bold(discovery.project.name)} (${discovery.project.framework})`);
  console.log(`  Matched items: ${pc.bold(String(filtered.length))}\n`);

  if (filtered.length === 0) {
    console.log(pc.yellow('  No matching files found.'));
    return;
  }

  // Group by type
  const grouped = new Map<string, typeof filtered>();
  for (const item of filtered) {
    if (!grouped.has(item.type)) {
      grouped.set(item.type, []);
    }
    grouped.get(item.type)!.push(item);
  }

  for (const [type, items] of grouped.entries()) {
    console.log(pc.bold(`  ${type.toUpperCase()} (${items.length}):`));
    for (const item of items.slice(0, 25)) {
      const featTag = item.feature ? pc.magenta(` [${item.feature}]`) : '';
      const layerTag = item.layer ? pc.blue(` (${item.layer})`) : '';
      console.log(`    • ${pc.white(item.path)}${featTag}${layerTag} ${pc.gray(`${item.metrics.linesOfCode} LOC`)}`);
    }
    if (items.length > 25) {
      console.log(pc.gray(`    ... and ${items.length - 25} more`));
    }
    console.log('');
  }
}

