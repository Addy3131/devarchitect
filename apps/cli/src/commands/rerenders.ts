import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { analyzeReactRerenders } from '@devarchitect/analyzers';

export async function rerendersCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { nodes } = await runProjectDiscovery(rootDir);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT REACT RE-RENDER & PERFORMANCE ANALYZER')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  const result = analyzeReactRerenders(rootDir, nodes);

  console.log(`  Components Analyzed: ${pc.bold(String(result.componentsAnalyzed))}`);
  console.log(`  Re-render Bottlenecks: ${result.totalIssues > 0 ? pc.yellow(pc.bold(String(result.totalIssues))) : pc.green('0')}\n`);

  if (result.issues.length === 0) {
    console.log(pc.green('  ✔ No unnecessary re-render traps or hook anti-patterns detected.\n'));
    return;
  }

  // Group by issue type
  const inlineProps = result.issues.filter(i => i.issueType === 'inline-function-prop' || i.issueType === 'inline-object-prop');
  const contextIssues = result.issues.filter(i => i.issueType === 'unmemoized-context');
  const effectIssues = result.issues.filter(i => i.issueType === 'derived-state-effect');
  const excessiveHooks = result.issues.filter(i => i.issueType === 'excessive-hooks');

  if (inlineProps.length > 0) {
    console.log(pc.bold(pc.yellow(`  ⚠ Inline JSX Object/Function Allocations (${inlineProps.length}):`)));
    for (const item of inlineProps.slice(0, 10)) {
      console.log(`    • ${pc.bold(item.filePath)}:${item.line} [${pc.magenta(item.componentName)}]`);
      console.log(`      ${pc.gray(item.message)}`);
      console.log(`      ${pc.cyan('Tip:')} ${item.suggestion}`);
    }
    if (inlineProps.length > 10) {
      console.log(pc.gray(`    ... and ${inlineProps.length - 10} more`));
    }
    console.log('');
  }

  if (contextIssues.length > 0) {
    console.log(pc.bold(pc.red(`  ✖ Unmemoized Context Value Allocations (${contextIssues.length}):`)));
    for (const item of contextIssues) {
      console.log(`    • ${pc.bold(item.filePath)}:${item.line}`);
      console.log(`      ${pc.gray(item.message)}`);
      console.log(`      ${pc.cyan('Tip:')} ${item.suggestion}`);
    }
    console.log('');
  }

  if (effectIssues.length > 0) {
    console.log(pc.bold(pc.yellow(`  ⚠ Derived State in useEffect (${effectIssues.length}):`)));
    for (const item of effectIssues) {
      console.log(`    • ${pc.bold(item.filePath)}:${item.line} [${pc.magenta(item.componentName)}]`);
      console.log(`      ${pc.gray(item.message)}`);
      console.log(`      ${pc.cyan('Tip:')} ${item.suggestion}`);
    }
    console.log('');
  }

  if (excessiveHooks.length > 0) {
    console.log(pc.bold(pc.yellow(`  ⚠ Heavy State Orchestration (${excessiveHooks.length}):`)));
    for (const item of excessiveHooks) {
      console.log(`    • ${pc.bold(item.filePath)}:${item.line} [${pc.magenta(item.componentName)}]`);
      console.log(`      ${pc.gray(item.message)}`);
      console.log(`      ${pc.cyan('Tip:')} ${item.suggestion}`);
    }
    console.log('');
  }
}
