import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { autoFixCodeIssues } from '@devarchitect/analyzers';

export interface FixCommandOptions {
  dryRun?: boolean;
  consoleLogs?: boolean;
  emptyCatches?: boolean;
}

export async function fixCommand(options: FixCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { nodes } = await runProjectDiscovery(rootDir);
  const targetFiles = nodes.map(n => n.path);

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan(`  DEVARCHITECT AUTOMATED SAFE CODE FIXER ${options.dryRun ? '[DRY RUN PREVIEW]' : ''}`)));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  const result = autoFixCodeIssues(rootDir, targetFiles, {
    dryRun: options.dryRun,
    fixConsoleLogs: options.consoleLogs !== false,
    fixEmptyCatches: options.emptyCatches !== false,
  });

  console.log(`  Actions Generated: ${result.actions.length > 0 ? pc.bold(String(result.actions.length)) : pc.green('0')}`);
  console.log(`  Files Modified:    ${result.modifiedFiles.length > 0 ? pc.bold(String(result.modifiedFiles.length)) : pc.green('0')}\n`);

  if (result.actions.length === 0) {
    console.log(pc.green('  ✔ No auto-fixable code smells or leftover debug logs found.\n'));
    return;
  }

  console.log(pc.bold('  Proposed Auto-Remediations:'));
  for (const action of result.actions.slice(0, 15)) {
    console.log(`    ${pc.green('✔')} ${pc.bold(action.filePath)} [${pc.cyan(action.category)}]`);
    console.log(`      ${pc.gray(action.description)}`);
    console.log(`      - ${pc.red(action.originalSnippet)}`);
    console.log(`      + ${pc.green(action.fixedSnippet)}`);
  }
  if (result.actions.length > 15) {
    console.log(pc.gray(`    ... and ${result.actions.length - 15} more actions`));
  }
  console.log('');

  if (options.dryRun) {
    console.log(pc.yellow('  [DRY RUN] No files were changed on disk. Run without --dry-run to apply changes.\n'));
  } else {
    console.log(pc.green(`  ✔ Successfully applied ${result.actions.length} safe code fixes across ${result.modifiedFiles.length} files.\n`));
  }
}

