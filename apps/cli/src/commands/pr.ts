import fs from 'node:fs';
import pc from 'picocolors';
import {
  runProjectDiscovery,
  buildProjectGraph,
  getStagedFiles,
  getBranchDiffFiles,
  getOutgoingFiles
} from '@devarchitect/core';
import { calculateImpact } from '@devarchitect/graph';
import { defaultRuleEngine } from '@devarchitect/rules';
import { loadConfig } from '@devarchitect/config';

export interface PrCommandOptions {
  base?: string;
  staged?: boolean;
  prePush?: boolean;
  githubComment?: boolean;
  output?: string;
}

export async function prCommand(options: PrCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const { discovery, nodes } = await runProjectDiscovery(rootDir);
  const { graph } = buildProjectGraph(rootDir, nodes, discovery.typeScript);
  const { config } = loadConfig(rootDir);

  let changedFiles: string[] = [];
  let modeLabel = 'Branch vs ' + (options.base || 'main');

  if (options.prePush) {
    changedFiles = getOutgoingFiles(rootDir);
    modeLabel = 'Outgoing Commits (Pre-Push Scan)';
  } else if (options.staged) {
    changedFiles = getStagedFiles(rootDir);
    modeLabel = 'Staged Git Changes';
  } else {
    changedFiles = getBranchDiffFiles(rootDir, options.base || 'main');
  }

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT AI CODE REVIEW & PR BLAST RADIUS')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Mode: ${pc.bold(modeLabel)} | Changed Files: ${pc.bold(String(changedFiles.length))}\n`);

  if (changedFiles.length === 0) {
    console.log(pc.green('  ✔ No unpushed or divergent file changes detected.\n'));
    return;
  }

  const allDirectDependents = new Set<string>();
  const allTransitiveDependents = new Set<string>();
  const allAffectedFeatures = new Set<string>();
  const fileImpacts: Array<{ file: string; direct: number; transitive: number; features: string[] }> = [];

  for (const file of changedFiles) {
    const impact = calculateImpact(graph, file);
    for (const dep of impact.directDependents) allDirectDependents.add(dep);
    for (const dep of impact.transitiveDependents) allTransitiveDependents.add(dep);
    for (const feat of impact.affectedFeatures) allAffectedFeatures.add(feat);

    fileImpacts.push({
      file,
      direct: impact.directDependents.length,
      transitive: impact.transitiveDependents.length,
      features: impact.affectedFeatures,
    });
  }

  // Assess Cumulative Risk
  const totalImpacted = allTransitiveDependents.size;
  const isCritical = totalImpacted > 25 || allAffectedFeatures.size >= 4;
  const isHigh = totalImpacted > 10 || allAffectedFeatures.size >= 2;
  const isMedium = totalImpacted > 2;

  const riskTierStr = isCritical ? 'CRITICAL RISK' : isHigh ? 'HIGH RISK' : isMedium ? 'MEDIUM RISK' : 'LOW RISK';
  const riskTierColored = isCritical
    ? pc.bgRed(pc.white(pc.bold(' CRITICAL RISK ')))
    : isHigh
    ? pc.red(pc.bold('HIGH RISK'))
    : isMedium
    ? pc.yellow(pc.bold('MEDIUM RISK'))
    : pc.green(pc.bold('LOW RISK'));

  // Validate architectural rules against whole project graph
  const ruleResults = defaultRuleEngine.evaluate({
    config,
    nodes,
    edges: graph.getAllEdges(),
    graph,
  });
  const newViolations = ruleResults.filter((r: { filePath: string }) => changedFiles.includes(r.filePath));

  console.log(`  Cumulative Blast Radius: ${riskTierColored}`);
  console.log(`  Modified Files:          ${changedFiles.length}`);
  console.log(`  Direct Callers Impacted: ${allDirectDependents.size}`);
  console.log(`  Total Downstream Impact: ${allTransitiveDependents.size} files`);
  console.log(`  Affected Business Slices:${allAffectedFeatures.size > 0 ? Array.from(allAffectedFeatures).join(', ') : 'None'}`);
  console.log(`  Architecture Violations: ${newViolations.length > 0 ? pc.red(`${newViolations.length} in changed files`) : pc.green('0 (Clean)')}\n`);

  console.log(pc.bold('  Modified Files & Blast Radius:'));
  for (const fi of fileImpacts) {
    console.log(`    • ${pc.white(fi.file)} ${pc.gray(`(direct: ${fi.direct}, downstream: ${fi.transitive})`)}`);
  }
  console.log('');

  if (allAffectedFeatures.size > 0) {
    console.log(pc.bold('  Suggested Verification Checklist for this PR:'));
    for (const feat of allAffectedFeatures) {
      console.log(`    ✔ Run all ${feat} feature unit & integration tests`);
    }
    console.log('');
  }

  // Generate Rovo-Style Markdown Report
  const markdownComment = `## 🤖 DevArchitect AI Architecture & PR Review

> **Automated Engineering Intelligence Report** for pull request changes.

### 📊 Executive Summary
| Metric | Status | Details |
| :--- | :--- | :--- |
| **Blast Radius Risk** | **${riskTierStr}** | ${totalImpacted} total downstream files affected |
| **Files Modified** | **${changedFiles.length}** | Across ${allAffectedFeatures.size || 1} feature slice(s) |
| **Architecture Ratchet** | ${newViolations.length === 0 ? '✅ **PASSED**' : '❌ **FAILED**'} | ${newViolations.length} policy violations in changed files |
| **Direct Callers Impacted** | **${allDirectDependents.size}** | Immediate consumers requiring regression check |

### 🎯 Modified Files & Impact Radius
| File | Direct Dependents | Downstream Blast Radius | Affected Slices |
| :--- | :---: | :---: | :--- |
${fileImpacts.map(fi => `| \`${fi.file}\` | ${fi.direct} | ${fi.transitive} | ${fi.features.join(', ') || 'Core'} |`).join('\n')}

${newViolations.length > 0 ? `### ⚠️ Architectural Violations Detected
${newViolations.map((v: { ruleId: string; filePath: string; message: string }) => `- **${v.ruleId}** in \`${v.filePath}\`: ${v.message}`).join('\n')}
` : ''}
### 🧪 Recommended Quality Checklist
${Array.from(allAffectedFeatures).map(f => `- [ ] Run \`${f}\` slice integration tests`).join('\n') || '- [ ] Run core component test suites'}
- [ ] Verify no unhandled async promise rejections
- [ ] Run \`devarchitect fix --dry-run\` to clean up any leftover debug logs

---
*Generated automatically by [DevArchitect](https://github.com/Addy3131/devarchitect) — Understand your codebase. Engineer with confidence.*`;

  // Output handling
  if (options.output) {
    fs.writeFileSync(options.output, markdownComment, 'utf8');
    console.log(pc.green(`  ✔ Written PR review comment to: ${options.output}\n`));
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '\n' + markdownComment + '\n');
    } catch {
      // Ignore if cannot append
    }
  }

  // Pre-Push gate logic: block push if critical or violations exist
  if (options.prePush) {
    if (newViolations.length > 0) {
      console.error(pc.red(`\n  ✖ [Pre-Push Guard Failed]: ${newViolations.length} architectural policy violations detected in outgoing commits.`));
      console.error(pc.yellow(`  Run 'devarchitect validate' to inspect or fix the violations before pushing.\n`));
      process.exit(1);
    }
    if (isCritical) {
      console.warn(pc.yellow(`\n  ⚠️ [Pre-Push Warning]: Critical blast radius detected (${totalImpacted} downstream files).`));
      console.warn(pc.yellow(`  Ensure all downstream integration tests pass.\n`));
    }
  }
}

