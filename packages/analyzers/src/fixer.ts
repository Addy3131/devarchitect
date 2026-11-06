import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export interface FixAction {
  filePath: string;
  category: 'unused-type' | 'console-log' | 'empty-catch';
  description: string;
  originalSnippet: string;
  fixedSnippet: string;
}

export interface FixResult {
  modifiedFiles: string[];
  actions: FixAction[];
  dryRun: boolean;
}

export function autoFixCodeIssues(
  rootDir: string,
  targetFiles: string[],
  options: {
    fixUnusedTypes?: boolean;
    fixConsoleLogs?: boolean;
    fixEmptyCatches?: boolean;
    dryRun?: boolean;
  } = {}
): FixResult {
  const actions: FixAction[] = [];
  const modifiedFiles = new Set<string>();

  for (const relPath of targetFiles) {
    if (
      !relPath.endsWith('.ts') &&
      !relPath.endsWith('.tsx') &&
      !relPath.endsWith('.js') &&
      !relPath.endsWith('.jsx')
    ) {
      continue;
    }

    const fullPath = path.resolve(rootDir, relPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    let hasChanges = false;

    // 1. Fix Console Logs
    if (options.fixConsoleLogs !== false) {
      const consoleLogRegex = /^[ \t]*console\.(log|debug|info)\([^)]*\);?[ \t]*\r?\n?/gm;
      if (consoleLogRegex.test(content)) {
        const originalMatches = content.match(consoleLogRegex) || [];
        for (const match of originalMatches) {
          actions.push({
            filePath: relPath,
            category: 'console-log',
            description: `Remove debug log: ${match.trim()}`,
            originalSnippet: match.trim(),
            fixedSnippet: '// [removed by devarchitect fix]',
          });
        }
        content = content.replace(consoleLogRegex, '');
        hasChanges = true;
      }
    }

    // 2. Fix Empty Catch Blocks
    if (options.fixEmptyCatches !== false) {
      const emptyCatchRegex = /catch\s*(\([a-zA-Z0-9_]*\))?\s*\{\s*\}/g;
      if (emptyCatchRegex.test(content)) {
        actions.push({
          filePath: relPath,
          category: 'empty-catch',
          description: 'Add error console reporting to empty catch block',
          originalSnippet: 'catch (e) {}',
          fixedSnippet: 'catch (error) { console.error("Caught unhandled error:", error); }',
        });
        content = content.replace(
          emptyCatchRegex,
          'catch (error) {\n    console.error("Caught error:", error);\n  }'
        );
        hasChanges = true;
      }
    }

    if (hasChanges) {
      modifiedFiles.add(relPath);
      if (!options.dryRun) {
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }

  return {
    modifiedFiles: Array.from(modifiedFiles),
    actions,
    dryRun: Boolean(options.dryRun),
  };
}

