import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { analyzeBundleBloat } from '@devarchitect/analyzers';

export async function bloatCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { nodes } = await runProjectDiscovery(rootDir);
  const report = analyzeBundleBloat(rootDir, nodes);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT BUNDLE BLOAT & TREE-SHAKING AUDIT')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Total Bloat Flags:       ${pc.bold(String(report.totalIssues))}`);
  console.log(`  Barrel Import Traps:     ${pc.bold(String(report.barrelTrapsCount))}`);
  console.log(`  Server Modules in UI:    ${pc.bold(String(report.serverInClientCount))}`);
  console.log(`  Wildcard Icon Imports:   ${pc.bold(String(report.wildcardImportsCount))}\n`);

  if (report.totalIssues === 0) {
    console.log(pc.green('  ✔ No tree-shaking traps or client bundle bloat detected.\n'));
    return;
  }

  for (const issue of report.issues) {
    const badge =
      issue.type === 'server-in-client'
        ? pc.bgRed(pc.white(' SERVER-IN-UI '))
        : issue.type === 'barrel-trap'
        ? pc.bgYellow(pc.black(' BARREL TRAP '))
        : pc.bgMagenta(pc.black(' WILDCARD '));

    console.log(`  ${badge} ${pc.bold(issue.specifier)} in ${pc.white(issue.filePath)}:${issue.line}`);
    console.log(`    ${issue.message}`);
    console.log(`    ${pc.cyan('Suggested Fix:')} ${pc.gray(issue.suggestedFix)}\n`);
  }
}

