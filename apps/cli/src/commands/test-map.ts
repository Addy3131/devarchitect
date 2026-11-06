import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { analyzeTestMap } from '@devarchitect/analyzers';

export async function testMapCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);
  const report = analyzeTestMap(rootDir, nodes, graph);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT ARCHITECTURAL TEST GAP ANALYSIS')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Source Files:       ${pc.bold(String(report.totalSourceFiles))}`);
  console.log(`  Files with Tests:   ${pc.bold(String(report.testedSourceFiles))} (${report.coveragePercentage}%)`);
  console.log(`  Untested Files:     ${pc.bold(String(report.untestedSourceFiles))}`);
  console.log(`  Test Suites Found:  ${pc.bold(String(report.testSuitesCount))}\n`);

  if (report.criticalGaps.length === 0) {
    console.log(pc.green('  ✔ Excellent architectural test coverage! No high-risk untested files found.\n'));
    return;
  }

  console.log(pc.bold('  Top Untested Architectural Gaps (Ranked by Blast Radius & Risk Score):'));
  console.log(pc.gray('  These files have high complexity or multiple downstream consumers but 0 tests:\n'));

  for (const gap of report.criticalGaps) {
    const priorityBadge =
      gap.priority === 'CRITICAL'
        ? pc.bgRed(pc.white(pc.bold(' CRITICAL ')))
        : pc.yellow(pc.bold(' HIGH '));

    console.log(`  ${priorityBadge} ${pc.bold(gap.name)} ${pc.gray(`(${gap.type}${gap.feature ? `, slice: ${gap.feature}` : ''})`)}`);
    console.log(`    Path:            ${pc.white(gap.filePath)}`);
    console.log(`    Risk Score:      ${pc.bold(String(gap.riskScore))} | Complexity: ${gap.complexity} | Callers: ${gap.dependentsCount} | LOC: ${gap.linesOfCode}\n`);
  }

  console.log(pc.cyan('  💡 Recommendation:'));
  console.log(pc.gray(`  Add unit/integration test suites for the top critical modules above to protect against regressions.\n`));
}
