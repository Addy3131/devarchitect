import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { detectDeadCode } from '@devarchitect/analyzers';

export async function deadCodeCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph, parsedFiles } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  const result = detectDeadCode(nodes, graph.getAllEdges(), parsedFiles, discovery.entryPoints);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT DEAD CODE & UNUSED EXPORTS')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Unused Exports: ${result.unusedExports.length > 0 ? pc.yellow(String(result.unusedExports.length)) : pc.green('0')}`);
  console.log(`  Orphaned Files: ${result.orphanedFiles.length > 0 ? pc.yellow(String(result.orphanedFiles.length)) : pc.green('0')}\n`);

  if (result.unusedExports.length > 0) {
    console.log(pc.bold('  Unused Exported Symbols:'));
    for (const exp of result.unusedExports.slice(0, 20)) {
      const typeTag = exp.isTypeOnly ? pc.blue(' [type]') : '';
      console.log(`    • ${pc.bold(exp.exportName)}${typeTag} in ${pc.gray(`${exp.filePath}:${exp.line}`)}`);
    }
    if (result.unusedExports.length > 20) {
      console.log(pc.gray(`    ... and ${result.unusedExports.length - 20} more\n`));
    } else {
      console.log('');
    }
  } else {
    console.log(pc.green('  ✔ No unused exports detected.\n'));
  }

  if (result.orphanedFiles.length > 0) {
    console.log(pc.bold('  Orphaned Files (Never imported by any other file):'));
    for (const file of result.orphanedFiles.slice(0, 15)) {
      console.log(`    • ${pc.yellow(file)}`);
    }
    console.log('');
  }
}
