import pc from 'picocolors';
import {
  ProjectDiscovery,
  ProjectHealthScore,
  ChangeImpactAnalysis,
  ArchitectureIssue
} from '@devarchitect/contracts';

export function formatDiscoveryOutput(discovery: ProjectDiscovery): string {
  const p = discovery.project;
  const d = discovery.detected;
  const s = discovery.stats;

  const lines: string[] = [
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    pc.bold(pc.cyan('  DEVARCHITECT PROJECT DISCOVERY')),
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    `  ${pc.gray('Project:')}          ${pc.bold(p.name)}`,
    `  ${pc.gray('Framework:')}        ${pc.bold(p.framework)}${p.frameworkVersion ? pc.gray(` (${p.frameworkVersion})`) : ''}`,
    `  ${pc.gray('Language:')}         ${p.language}`,
    `  ${pc.gray('Package Manager:')}  ${p.packageManager}`,
    `  ${pc.gray('Is Monorepo:')}      ${p.isMonorepo ? pc.green('Yes') : pc.gray('No')}`,
    '',
    pc.bold('  Detected Features:'),
    `    ${pc.gray('React')}             ${d.react ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('App Router')}        ${d.appRouter ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('Pages Router')}      ${d.pagesRouter ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('Tailwind CSS')}      ${d.tailwind ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('Zustand')}           ${d.zustand ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('TanStack Query')}    ${d.tanstackQuery ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('Redux')}             ${d.redux ? pc.green('Yes') : pc.gray('No')}`,
    `    ${pc.gray('Feature Modules')}   ${d.featureModules === 'full' ? pc.green('Full') : d.featureModules === 'partial' ? pc.yellow('Partial') : pc.gray('None')}`,
    `    ${pc.gray('Testing')}           ${d.testingFramework ? pc.green(d.testingFramework) : pc.gray('None detected')}`,
    '',
    pc.bold('  Repository Structure:'),
    `    ${pc.gray('Source files')}      ${s.sourceFiles}`,
    `    ${pc.gray('Components')}        ${s.components}`,
    `    ${pc.gray('Hooks')}             ${s.hooks}`,
    `    ${pc.gray('Services')}          ${s.services}`,
    `    ${pc.gray('Utilities')}         ${s.utilities}`,
    `    ${pc.gray('Routes')}            ${s.routes}`,
    `    ${pc.gray('Tests')}             ${s.tests}`,
    `    ${pc.gray('Lines of Code')}     ${s.linesOfCode.toLocaleString()}`,
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    pc.green('  ✔ Discovery completed successfully.'),
  ];

  return lines.join('\n');
}

export function formatHealthOutput(health: ProjectHealthScore): string {
  const statusColor = health.status === 'healthy' ? pc.green : health.status === 'warning' ? pc.yellow : pc.red;

  const lines: string[] = [
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    pc.bold(pc.cyan('  DEVARCHITECT CODE HEALTH SCORE')),
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    `  Overall Health:       ${statusColor(pc.bold(`${health.overallScore}/100`))} [${statusColor(health.status.toUpperCase())}] (Grade ${health.grade})`,
    '',
    pc.bold('  Dimensions:'),
    `    ${pc.gray('Architecture compliance')}  ${health.dimensions.architecture.score ?? 'unmeasured'}/100 (weight 25%)`,
    `    ${pc.gray('Code complexity')}          ${health.dimensions.complexity.score ?? 'unmeasured'}/100 (weight 20%)`,
    `    ${pc.gray('Dependency health')}        ${health.dimensions.dependencies.score ?? 'unmeasured'}/100 (weight 15%)`,
    `    ${pc.gray('Code duplication')}          ${health.dimensions.duplication.score ?? 'unmeasured'}/100 (weight 15%)`,
    `    ${pc.gray('Maintainability')}          ${health.dimensions.maintainability.score ?? 'unmeasured'}/100 (weight 15%)`,
    `    ${pc.gray('Testing confidence')}        ${health.dimensions.testing.score !== null ? `${health.dimensions.testing.score}/100` : pc.gray('unmeasured (10%)')}`,
    '',
    pc.bold('  Issues Summary:'),
    `    Total issues:         ${health.metrics.totalIssues}`,
    `    Errors:               ${health.metrics.errorCount > 0 ? pc.red(String(health.metrics.errorCount)) : pc.green('0')}`,
    `    Warnings:             ${health.metrics.warningCount > 0 ? pc.yellow(String(health.metrics.warningCount)) : pc.green('0')}`,
    `    Circular imports:     ${health.metrics.circularDependencies > 0 ? pc.red(String(health.metrics.circularDependencies)) : pc.green('0')}`,
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
  ];

  return lines.join('\n');
}

export function formatImpactOutput(impact: ChangeImpactAnalysis): string {
  const riskColor =
    impact.riskAssessment === 'CRITICAL'
      ? pc.bgRed(pc.white(pc.bold(' CRITICAL ')))
      : impact.riskAssessment === 'HIGH'
      ? pc.red(pc.bold('HIGH'))
      : impact.riskAssessment === 'MEDIUM'
      ? pc.yellow(pc.bold('MEDIUM'))
      : pc.green(pc.bold('LOW'));

  const lines: string[] = [
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    pc.bold(pc.cyan('  CHANGE IMPACT ANALYSIS')),
    pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')),
    `  ${pc.gray('Target:')}                ${pc.bold(impact.target)}`,
    `  ${pc.gray('Direct dependents:')}     ${impact.directDependents.length}`,
    `  ${pc.gray('Transitive dependents:')} ${impact.transitiveDependents.length}`,
    `  ${pc.gray('Affected features:')}      ${impact.affectedFeatures.length}`,
    `  ${pc.gray('Critical paths:')}        ${impact.criticalPaths}`,
    `  ${pc.gray('Risk assessment:')}       ${riskColor}`,
    '',
  ];

  if (impact.affectedModules.length > 0) {
    lines.push(pc.bold('  Affected Modules:'));
    for (const mod of impact.affectedModules) {
      lines.push(`    • ${mod}`);
    }
    lines.push('');
  }

  if (impact.suggestedChecks.length > 0) {
    lines.push(pc.bold('  Suggested checks:'));
    for (const check of impact.suggestedChecks) {
      lines.push(`    ${pc.green('✔')} ${check}`);
    }
    lines.push('');
  }

  if (impact.potentialConcerns.length > 0) {
    lines.push(pc.bold(pc.yellow('  Potential concerns:')));
    for (const concern of impact.potentialConcerns) {
      lines.push(`    ⚠ ${concern}`);
    }
    lines.push('');
  }

  lines.push(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  return lines.join('\n');
}

export function formatIssuesOutput(issues: ArchitectureIssue[]): string {
  if (issues.length === 0) {
    return pc.green('✔ No architecture policy violations found.');
  }

  const lines: string[] = [
    pc.bold(`Architecture Violations (${issues.length}):`),
    '',
  ];

  for (const issue of issues) {
    const badge =
      issue.severity === 'error'
        ? pc.red(pc.bold('[ERROR]'))
        : issue.severity === 'warning'
        ? pc.yellow(pc.bold('[WARN]'))
        : pc.blue(pc.bold('[INFO]'));

    lines.push(`  ${badge} ${pc.bold(issue.ruleId)}: ${issue.message}`);
    lines.push(`    ${pc.gray('File:')} ${issue.filePath}${issue.location ? `:${issue.location.startLine}` : ''}`);
    if (issue.evidence && issue.evidence.length > 0) {
      for (const ev of issue.evidence) {
        lines.push(`    ${pc.gray('Evidence:')} ${ev}`);
      }
    }
    if (issue.suggestion) {
      lines.push(`    ${pc.cyan('Suggestion:')} ${issue.suggestion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

