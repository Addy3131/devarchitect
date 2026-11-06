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

export function installPreCommitHook(rootDir: string): { success: boolean; hookPath: string } {
  const gitHooksDir = path.join(rootDir, '.git', 'hooks');
  if (!fs.existsSync(gitHooksDir)) {
    fs.mkdirSync(gitHooksDir, { recursive: true });
  }

  const hookPath = path.join(gitHooksDir, 'pre-commit');
  const scriptContent = `#!/bin/sh
# DevArchitect Pre-Commit Guard
echo "DevArchitect: Validating architecture rules on staged changes..."

# Run devarchitect validate on staged changes
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

