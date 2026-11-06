import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { analyzeCodeSmells } from '@devarchitect/analyzers';

export async function smellsCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { nodes } = await runProjectDiscovery(rootDir);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT CODE SMELLS & ANTI-PATTERNS')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  const result = analyzeCodeSmells(rootDir, nodes);

  console.log(`  Total Code Smells: ${result.totalSmells > 0 ? pc.yellow(pc.bold(String(result.totalSmells))) : pc.green('0')}`);
  console.log(`  Critical Errors:   ${result.errorsCount > 0 ? pc.red(pc.bold(String(result.errorsCount))) : pc.green('0')}`);
  console.log(`  Warnings:          ${result.warningsCount > 0 ? pc.yellow(String(result.warningsCount)) : pc.green('0')}\n`);

  if (result.smells.length === 0) {
    console.log(pc.green('  ✔ No critical code smells or anti-patterns detected.\n'));
    return;
  }

  // Group by category
  const categories = [
    { key: 'empty-catch', title: 'Empty Catch Blocks (Swallowed Errors)' },
    { key: 'unhandled-async', title: 'Unhandled Async Network / API Calls' },
    { key: 'hardcoded-secret', title: 'Potential Hardcoded Secrets / Tokens' },
    { key: 'god-component', title: 'Oversized Single-Responsibility Breaches' },
    { key: 'console-log', title: 'Leftover Debug Console Logs' },
  ] as const;

  for (const cat of categories) {
    const items = result.smells.filter(s => s.category === cat.key);
    if (items.length > 0) {
      console.log(pc.bold(`  ${items[0].severity === 'error' ? pc.red('✖') : pc.yellow('⚠')} ${cat.title} (${items.length}):`));
      for (const item of items.slice(0, 8)) {
        console.log(`    • ${pc.bold(item.filePath)}:${item.line}`);
        console.log(`      ${pc.gray(item.message)}`);
        console.log(`      ${pc.cyan('Fix:')} ${item.suggestion}`);
      }
      if (items.length > 8) {
        console.log(pc.gray(`    ... and ${items.length - 8} more`));
      }
      console.log('');
    }
  }
}

