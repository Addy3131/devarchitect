import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { detectDuplication } from '@devarchitect/analyzers';

export interface DuplicationCommandOptions {
  lines?: string;
}

export async function duplicationCommand(options: DuplicationCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const minLines = options.lines ? parseInt(options.lines, 10) : 6;
  const { nodes } = await runProjectDiscovery(rootDir);

  const result = detectDuplication(rootDir, nodes, minLines);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT CODE DUPLICATION ANALYSIS')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Duplicate Clusters:     ${result.clusters.length > 0 ? pc.yellow(String(result.clusters.length)) : pc.green('0')}`);
  console.log(`  Total Duplicate Lines:  ${result.totalDuplicateLines > 0 ? pc.yellow(String(result.totalDuplicateLines)) : pc.green('0')}`);
  console.log(`  Duplication Ratio:      ${result.duplicationPercentage > 0 ? pc.yellow(`${result.duplicationPercentage}%`) : pc.green('0%')}\n`);

  if (result.clusters.length > 0) {
    console.log(pc.bold('  Duplicate Clusters:'));
    for (let idx = 0; idx < Math.min(result.clusters.length, 10); idx++) {
      const cluster = result.clusters[idx];
      console.log(`  [Cluster #${idx + 1}] (${cluster.lineCount} lines replicated across ${cluster.instances.length} locations)`);
      for (const inst of cluster.instances) {
        console.log(`    • ${pc.bold(inst.filePath)}:${inst.startLine}-${inst.endLine}`);
      }
      console.log('');
    }
  } else {
    console.log(pc.green('  ✔ No duplicate code blocks detected.\n'));
  }
}
