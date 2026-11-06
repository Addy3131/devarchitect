import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { analyzeComplexity } from '@devarchitect/analyzers';

export async function complexityCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { parsedFiles } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  const result = analyzeComplexity(nodes, parsedFiles);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT CODE COMPLEXITY ANALYSIS')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Average Complexity: ${pc.bold(String(result.averageComplexity))} | Total Complexity: ${pc.bold(String(result.totalComplexity))}`);
  console.log(`  Hotspot Files:      ${result.hotspots.length > 0 ? pc.yellow(String(result.hotspots.length)) : pc.green('0')}`);
  console.log(`  Oversized Files:    ${result.oversizedFiles.length > 0 ? pc.yellow(String(result.oversizedFiles.length)) : pc.green('0')}\n`);

  if (result.hotspots.length > 0) {
    console.log(pc.bold('  Top Complexity Hotspots:'));
    for (const spot of result.hotspots.slice(0, 10)) {
      const riskColor = spot.risk === 'critical' ? pc.red : spot.risk === 'high' ? pc.yellow : pc.white;
      console.log(`    • ${pc.bold(spot.filePath)}`);
      console.log(`      Complexity: ${riskColor(String(spot.complexity))} [${spot.risk.toUpperCase()}] | ${spot.linesOfCode} LOC`);
      if (spot.topSymbols.length > 0) {
        const symList = spot.topSymbols.map(s => `${s.name}() [${s.complexity}]`).join(', ');
        console.log(`      Functions: ${pc.gray(symList)}`);
      }
    }
    console.log('');
  } else {
    console.log(pc.green('  ✔ No high-complexity hotspots detected. Codebase control flow is well balanced.\n'));
  }

  if (result.oversizedFiles.length > 0) {
    console.log(pc.bold('  Oversized Files (> 250 LOC):'));
    for (const f of result.oversizedFiles.slice(0, 10)) {
      console.log(`    • ${f.filePath} (${pc.yellow(`${f.linesOfCode} LOC`)})`);
    }
    console.log('');
  }
}
