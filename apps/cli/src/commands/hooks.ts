import pc from 'picocolors';
import { installPreCommitHook } from '@devarchitect/core';

export async function installHooksCommand(): Promise<void> {
  const rootDir = process.cwd();

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT GIT PRE-COMMIT HOOK INSTALLER')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  try {
    const { success, hookPath } = installPreCommitHook(rootDir);
    if (success) {
      console.log(pc.green(`\n  ✔ Successfully installed architecture pre-commit hook at:`));
      console.log(`    ${pc.bold(hookPath)}\n`);
      console.log(pc.gray('  Any future `git commit` will automatically validate architectural policies'));
      console.log(pc.gray('  and block circular dependencies or boundary violations before they enter git!\n'));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n  ✖ Failed to install Git hook: ${msg}\n`));
  }
}

