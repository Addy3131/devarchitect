import pc from 'picocolors';
import { installPreCommitHook, installPrePushHook } from '@devarchitect/core';

export async function installHooksCommand(): Promise<void> {
  const rootDir = process.cwd();

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT GIT QUALITY GATES & HOOKS INSTALLER')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

  try {
    const commitHook = installPreCommitHook(rootDir);
    const pushHook = installPrePushHook(rootDir);

    if (commitHook.success && pushHook.success) {
      console.log(pc.green(`\n  ✔ Successfully installed Git Safety Hooks:`));
      console.log(`    1. Pre-Commit Guard: ${pc.bold(commitHook.hookPath)}`);
      console.log(`    2. Pre-Push Rovo-Gate: ${pc.bold(pushHook.hookPath)}\n`);
      console.log(pc.white('  What happens now:'));
      console.log(pc.gray('    • When you commit: Blocks newly introduced circular imports or boundary debt.'));
      console.log(pc.gray('    • When you push: Scans outgoing commits for critical blast radius regressions.\n'));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n  ✖ Failed to install Git hooks: ${msg}\n`));
  }
}

