import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { analyzeTypeHealth } from '@devarchitect/analyzers';

export async function typesCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph, parsedFiles } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT TYPE SYSTEM & HEALTH ANALYZER')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  const result = analyzeTypeHealth(rootDir, nodes, graph.getAllEdges(), parsedFiles);

  const scoreColor = result.typeSafetyScore >= 90 ? pc.green : result.typeSafetyScore >= 70 ? pc.yellow : pc.red;

  console.log(`  Type Safety Score:      ${scoreColor(pc.bold(`${result.typeSafetyScore}/100`))}`);
  console.log(`  Total Types Declared:   ${pc.bold(String(result.totalTypesDeclared))}`);
  console.log(`  Unused Types/Enums:     ${result.unusedTypes.length > 0 ? pc.yellow(String(result.unusedTypes.length)) : pc.green('0')}`);
  console.log(`  Unsafe 'any' Hotspots:  ${result.anyHotspots.length > 0 ? pc.red(String(result.anyHotspots.length)) : pc.green('0')}`);
  console.log(`  Duplicate Type Models:  ${result.duplicateTypes.length > 0 ? pc.yellow(String(result.duplicateTypes.length)) : pc.green('0')}\n`);

  if (result.unusedTypes.length > 0) {
    console.log(pc.bold(pc.yellow(`  ⚠ Unused Types & Interfaces (${result.unusedTypes.length}):`)));
    for (const item of result.unusedTypes.slice(0, 15)) {
      console.log(`    • ${pc.bold(item.name)} (${item.kind}) in ${pc.gray(`${item.filePath}:${item.line}`)}`);
    }
    if (result.unusedTypes.length > 15) {
      console.log(pc.gray(`    ... and ${result.unusedTypes.length - 15} more`));
    }
    console.log('');
  }

  if (result.anyHotspots.length > 0) {
    console.log(pc.bold(pc.red(`  ✖ Unsafe 'any' Type Escapes (${result.anyHotspots.length}):`)));
    for (const item of result.anyHotspots.slice(0, 10)) {
      console.log(`    • ${pc.bold(item.filePath)}:${item.line} [${pc.magenta(item.kind)}]`);
      console.log(`      ${pc.gray(item.snippet)}`);
    }
    if (result.anyHotspots.length > 10) {
      console.log(pc.gray(`    ... and ${result.anyHotspots.length - 10} more`));
    }
    console.log('');
  }

  if (result.duplicateTypes.length > 0) {
    console.log(pc.bold(pc.yellow(`  ⚠ Duplicate Type Definitions (${result.duplicateTypes.length}):`)));
    for (const item of result.duplicateTypes) {
      console.log(`    • Type '${pc.bold(item.typeName)}' declared redundantly across:`);
      for (const loc of item.locations) {
        console.log(`      - ${pc.gray(`${loc.filePath}:${loc.line}`)}`);
      }
      console.log(`      ${pc.cyan('Tip:')} Unify into a shared types module to keep contracts in sync.`);
    }
    console.log('');
  }

  if (result.unusedTypes.length === 0 && result.anyHotspots.length === 0 && result.duplicateTypes.length === 0) {
    console.log(pc.green('  ✔ Type definitions are clean, unified, and strictly typed.\n'));
  }
}
