import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function getStagedFiles(rootDir: string): string[] {
  try {
    const output = execSync('git diff --cached --name-only', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return output
      .split(/\r\n|\r|\n/)
      .map(s => s.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function getBranchDiffFiles(rootDir: string, baseBranch = 'main'): string[] {
  try {
    // Try diff against base branch or HEAD~1
    let output = '';
    try {
      output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    } catch {
      output = execSync('git diff --name-only HEAD', {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    }
    return output
      .split(/\r\n|\r|\n/)
      .map(s => s.trim().replace(/\\/g, '/'))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Get files modified in outgoing commits that have not been pushed yet.
 * Used by pre-push hooks to intercept changes before they hit remote.
 */
export function getOutgoingFiles(rootDir: string, remote = 'origin'): string[] {
  try {
    let output = '';
    try {
      // Outgoing commits vs upstream tracking branch
      output = execSync('git log @{u}..HEAD --name-only --format=""', {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    } catch {
      // Fallback: compare with remote main or HEAD~1
      try {
        output = execSync(`git log ${remote}/main..HEAD --name-only --format=""`, {
          cwd: rootDir,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      } catch {
        output = execSync('git diff --name-only HEAD~1 HEAD', {
          cwd: rootDir,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      }
    }
    const set = new Set(
      output
        .split(/\r\n|\r|\n/)
        .map(s => s.trim().replace(/\\/g, '/'))
        .filter(Boolean)
    );
    return Array.from(set);
  } catch {
    return [];
  }
}

export function installPreCommitHook(rootDir: string): { success: boolean; hookPath: string } {
  const gitHooksDir = path.join(rootDir, '.git', 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  const hookPath = path.join(gitHooksDir, 'pre-commit');
  const scriptContent = `#!/bin/sh
# DevArchitect Pre-Commit Guard (Local Safety Net)
echo "🛡️ DevArchitect: Validating architecture rules on staged changes..."

if command -v devarchitect >/dev/null 2>&1; then
  devarchitect validate || {
    echo "✖ DevArchitect: Commit rejected due to architecture policy violations."
    echo "Tip: Run 'devarchitect validate' to inspect or 'devarchitect validate --update-baseline' to accept baseline debt."
    exit 1
  }
fi
exit 0
`;

  fs.writeFileSync(hookPath, scriptContent, { mode: 0o755 });
  return { success: true, hookPath };
}

/**
 * Installs Git pre-push hook to intercept outgoing commits before pushing to remote (like Bitbucket Rovo).
 */
export function installPrePushHook(rootDir: string): { success: boolean; hookPath: string } {
  const gitHooksDir = path.join(rootDir, '.git', 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  const hookPath = path.join(gitHooksDir, 'pre-push');
  const scriptContent = `#!/bin/sh
# DevArchitect Pre-Push AI Guardrail (Rovo-Style Quality Gate)
echo "🚀 DevArchitect: Scanning outgoing commits before push..."

if command -v devarchitect >/dev/null 2>&1; then
  devarchitect pr --pre-push || {
    echo ""
    echo "🚨 [DevArchitect Push Blocked]: High architectural risk or policy violations detected."
    echo "Review your blast radius with 'devarchitect pr' or run 'devarchitect fix --dry-run'."
    exit 1
  }
fi
exit 0
`;

  fs.writeFileSync(hookPath, scriptContent, { mode: 0o755 });
  return { success: true, hookPath };
}

