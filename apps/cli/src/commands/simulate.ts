import path from 'node:path';
import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph } from '@devarchitect/core';
import { simulateContractImpact } from '@devarchitect/analyzers';

export async function simulateCommand(targetPath?: string): Promise<void> {
  const rootDir = process.cwd();

  if (!targetPath) {
    console.error(pc.red('\n✖ Error: Please specify a target file path to simulate change impact.'));
    console.log(pc.gray('  Example: devarchitect simulate src/services/api.ts\n'));
    process.exit(1);
  }

  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph, parsedFiles } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  const normalizedTarget = path.relative(rootDir, path.resolve(rootDir, targetPath)).replace(/\\/g, '/');

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT PRE-FLIGHT CONTRACT BREAK SIMULATOR')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  const report = simulateContractImpact(
    rootDir,
    normalizedTarget,
    nodes,
    graph.getAllEdges(),
    graph,
    parsedFiles
  );

  const riskBadge =
    report.riskLevel === 'CRITICAL'
      ? pc.bgRed(pc.white(pc.bold(' CRITICAL RISK ')))
      : report.riskLevel === 'HIGH'
      ? pc.red(pc.bold('HIGH RISK'))
      : report.riskLevel === 'MEDIUM'
      ? pc.yellow(pc.bold('MEDIUM RISK'))
      : pc.green(pc.bold('LOW RISK'));

  console.log(`  Target:                 ${pc.bold(report.targetFile)}`);
  console.log(`  Change Risk Level:      ${riskBadge}`);
  console.log(`  Exported Public APIs:   ${pc.bold(String(report.contractMembers.length))}`);
  console.log(`  Direct Callers (Files): ${pc.bold(String(report.directConsumersCount))}`);
  console.log(`  Transitive Dependents:  ${pc.bold(String(report.transitiveConsumersCount))}\n`);

  if (report.contractMembers.length > 0) {
    console.log(pc.bold('  Exposed Public Contract (What downstream code relies on):'));
    for (const mem of report.contractMembers) {
      console.log(`    • ${pc.white(mem.kind)} ${pc.bold(mem.name)} ${pc.cyan(mem.details)} ${pc.gray(`(line ${mem.line})`)}`);
    }
    console.log('');
  }

  if (report.consumers.length > 0) {
    console.log(pc.bold('  Downstream Consumers & Active Call Sites:'));
    for (const consumer of report.consumers) {
      console.log(`    ${pc.yellow('→')} ${pc.bold(consumer.consumerFile)}`);
      console.log(`      Imports: ${pc.cyan(consumer.importedSymbols.join(', '))}`);
      for (const call of consumer.callLines.slice(0, 3)) {
        console.log(`        line ${call.line}: ${pc.gray(call.codeSnippet)}`);
      }
    }
    console.log('');
  } else {
    console.log(pc.green('  ✔ No external consumers depend on this module. Safe to refactor or delete.\n'));
  }

  if (report.breakingChangeWarnings.length > 0) {
    console.log(pc.bold(pc.red('  ⚠ Potential Breaking Impacts:')));
    for (const w of report.breakingChangeWarnings) {
      console.log(`    ✖ ${w}`);
    }
    console.log('');
  }

  console.log(pc.bold('  Safe Refactoring Playbook:'));
  for (const step of report.safeRefactoringGuide) {
    console.log(`    ✔ ${pc.gray(step)}`);
  }
  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')));
}

