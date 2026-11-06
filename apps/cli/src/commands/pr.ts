import pc from 'picocolors';
import { runProjectDiscovery, buildProjectGraph, getStagedFiles, getBranchDiffFiles } from '@devarchitect/core';
import { calculateImpact } from '@devarchitect/graph';

export interface PrCommandOptions {
  base?: string;
  staged?: boolean;
}

export async function prCommand(options: PrCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);

  const changedFiles = options.staged
    ? getStagedFiles(rootDir)
    : getBranchDiffFiles(rootDir, options.base || 'main');

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT PULL REQUEST & GIT CHANGE IMPACT')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Base Branch: ${pc.bold(options.base || 'main')} | Changed Files: ${pc.bold(String(changedFiles.length))}\n`);

  if (changedFiles.length === 0) {
    console.log(pc.green('  ✔ No uncommitted or divergent file changes detected against base branch.\n'));
    return;
  }

  const allDirectDependents = new Set<string>();
  const allTransitiveDependents = new Set<string>();
  const allAffectedFeatures = new Set<string>();
  const criticalConcerns: string[] = [];

  for (const file of changedFiles) {
    const impact = calculateImpact(graph, file);
    for (const dep of impact.directDependents) allDirectDependents.add(dep);
    for (const dep of impact.transitiveDependents) allTransitiveDependents.add(dep);
    for (const feat of impact.affectedFeatures) allAffectedFeatures.add(feat);
    if (impact.potentialConcerns.length > 0) {
      criticalConcerns.push(...impact.potentialConcerns);
    }
  }

  // Assess Cumulative Risk
  const totalImpacted = allTransitiveDependents.size;
  const riskTier =
    totalImpacted > 20 || allAffectedFeatures.size >= 4
      ? pc.bgRed(pc.white(pc.bold(' CRITICAL RISK ')))
      : totalImpacted > 8 || allAffectedFeatures.size >= 2
      ? pc.red(pc.bold('HIGH RISK'))
      : totalImpacted > 2
      ? pc.yellow(pc.bold('MEDIUM RISK'))
      : pc.green(pc.bold('LOW RISK'));

  console.log(`  Cumulative Blast Radius: ${riskTier}`);
  console.log(`  Modified Files:          ${changedFiles.length}`);
  console.log(`  Direct Callers Impacted: ${allDirectDependents.size}`);
  console.log(`  Total Downstream Impact: ${allTransitiveDependents.size} files`);
  console.log(`  Affected Business Slices:${allAffectedFeatures.size > 0 ? Array.from(allAffectedFeatures).join(', ') : 'None'}\n`);

  console.log(pc.bold('  Modified Files:'));
  for (const f of changedFiles) {
    console.log(`    • ${pc.white(f)}`);
  }
  console.log('');

  if (allAffectedFeatures.size > 0) {
    console.log(pc.bold('  Suggested Verification Checklist for this PR:'));
    for (const feat of allAffectedFeatures) {
      console.log(`    ✔ Run all ${feat} feature unit & integration tests`);
    }
    console.log('');
  }

  // Print GitHub PR Markdown summary snippet
  console.log(pc.bold(pc.gray('  --- GitHub PR Markdown Summary (Copy & Paste into PR Description) ---')));
  console.log(`
## 🏗️ DevArchitect Architectural Change Report
| Metric | Value |
| :--- | :--- |
| **Blast Radius Risk** | **${totalImpacted > 8 ? 'HIGH' : 'LOW'}** |
| **Files Modified** | ${changedFiles.length} |
| **Downstream Files Impacted** | ${totalImpacted} |
| **Affected Slices** | ${Array.from(allAffectedFeatures).join(', ') || 'Core'} |

### 🧪 Recommended PR Verification
${Array.from(allAffectedFeatures).map(f => `- [ ] ${f} integration tests`).join('\n') || '- [ ] Standard unit tests'}
`);
}

