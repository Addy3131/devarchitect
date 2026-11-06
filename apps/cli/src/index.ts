import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { analyzeCommand } from './commands/analyze.js';
import { inspectCommand } from './commands/inspect.js';
import { doctorCommand } from './commands/doctor.js';
import { impactCommand } from './commands/impact.js';
import { validateCommand } from './commands/validate.js';
import { graphCommand } from './commands/graph.js';
import { healthCommand } from './commands/health.js';
import { complexityCommand } from './commands/complexity.js';
import { deadCodeCommand } from './commands/deadcode.js';
import { duplicationCommand } from './commands/duplication.js';
import { fingerprintCommand, driftCommand } from './commands/fingerprint.js';
import { generateCommand } from './commands/generate.js';
import { rulesCommand } from './commands/rules.js';
import { rerendersCommand } from './commands/rerenders.js';
import { typesCommand } from './commands/types.js';
import { smellsCommand } from './commands/smells.js';
import { simulateCommand } from './commands/simulate.js';
import { prCommand } from './commands/pr.js';
import { installHooksCommand } from './commands/hooks.js';
import { fixCommand } from './commands/fix.js';
import { studioCommand } from './commands/studio.js';
import { askCommand } from './commands/ask.js';

export function runCli(argv: string[] = process.argv): void {
  const program = new Command();

  program
    .name('devarchitect')
    .description('DevArchitect — Understand your codebase. Improve its architecture. Engineer with confidence.')
    .version('0.1.0');

  program
    .command('init')
    .description('Initialize DevArchitect configuration for this repository')
    .option('-p, --preset <preset>', 'Architecture preset (feature-sliced, clean-architecture, layered, modular-monolith, custom, recommended)')
    .option('-f, --force', 'Overwrite existing configuration')
    .action(async (options) => {
      await initCommand(options);
    });

  program
    .command('analyze')
    .description('Analyze repository structure, framework, and metrics')
    .option('--json', 'Output discovery results as JSON')
    .option('-o, --output <file>', 'Save output to a file')
    .option('--html', 'Generate standalone HTML architecture report')
    .action(async (options) => {
      await analyzeCommand(options);
    });

  program
    .command('inspect')
    .description('Inspect components, hooks, services, and modules in the repository')
    .option('-t, --type <type>', 'Filter by node type (component, hook, service, utility, route, test, module)')
    .option('--feature <feature>', 'Filter by feature slice name')
    .action(async (options) => {
      await inspectCommand(options);
    });

  program
    .command('doctor')
    .description('Diagnose codebase configuration, TypeScript settings, and health diagnostics')
    .action(async () => {
      await doctorCommand();
    });

  program
    .command('impact [target]')
    .description('Calculate dependency blast radius and change impact for a file')
    .option('--staged', 'Analyze all currently staged Git files')
    .action(async (target, options) => {
      await impactCommand(target, options);
    });

  program
    .command('validate')
    .description('Validate repository against architecture policies')
    .option('--update-baseline', 'Record current architecture violations in baseline to ratchet technical debt')
    .action(async (options) => {
      await validateCommand(options);
    });

  program
    .command('graph')
    .description('Visualize repository architecture dependency graph')
    .option('-f, --format <format>', 'Graph format: mermaid, dot, json', 'mermaid')
    .option('-o, --output <file>', 'Export graph to file')
    .action(async (options) => {
      await graphCommand(options);
    });

  program
    .command('health')
    .description('Calculate transparent 0-100 codebase health score')
    .option('--json', 'Output health metrics as JSON')
    .action(async (options) => {
      await healthCommand(options);
    });

  program
    .command('complexity')
    .description('Identify high cyclomatic complexity functions and oversized files')
    .action(async () => {
      await complexityCommand();
    });

  program
    .command('deadcode')
    .description('Detect unused exports and orphaned files across the repository')
    .action(async () => {
      await deadCodeCommand();
    });

  program
    .command('duplication')
    .description('Detect repeated code blocks and duplicate logic clusters')
    .option('-l, --lines <number>', 'Minimum duplicate line threshold', '6')
    .action(async (options) => {
      await duplicationCommand(options);
    });

  program
    .command('fingerprint')
    .description('Generate reproducible cryptographic architecture fingerprint')
    .action(async () => {
      await fingerprintCommand();
    });

  program
    .command('drift')
    .description('Detect architectural divergence and drift from saved baseline fingerprint')
    .action(async () => {
      await driftCommand();
    });

  program
    .command('generate <type> <name>')
    .description('Scaffold architecture-compliant feature, component, or service matching existing conventions')
    .action(async (type, name) => {
      await generateCommand(type, name);
    });

  program
    .command('rules')
    .description('List available architecture policies and presets')
    .action(async () => {
      await rulesCommand();
    });

  program
    .command('rerenders')
    .description('Analyze React components for re-render bottlenecks, inline JSX allocations & hook anti-patterns')
    .action(async () => {
      await rerendersCommand();
    });

  program
    .command('types')
    .description('Analyze TypeScript health: unused types, any hotspots & duplicate definitions')
    .action(async () => {
      await typesCommand();
    });

  program
    .command('smells')
    .description('Detect code smells, unhandled async promises, god components & empty catch blocks')
    .action(async () => {
      await smellsCommand();
    });

  program
    .command('simulate [target]')
    .description('Simulate breaking change contract impact and map all call sites before modifying a file')
    .action(async (target) => {
      await simulateCommand(target);
    });

  program
    .command('pr')
    .description('Analyze cumulative blast radius for branch changes and generate GitHub PR architectural review')
    .option('-b, --base <branch>', 'Base branch to diff against', 'main')
    .option('--staged', 'Analyze only currently staged files')
    .action(async (options) => {
      await prCommand(options);
    });

  program
    .command('install-hooks')
    .description('Install Git pre-commit hook to prevent committing architectural violations')
    .action(async () => {
      await installHooksCommand();
    });

  program
    .command('fix')
    .description('Automatically apply safe refactoring fixes for empty catches and leftover console logs')
    .option('--dry-run', 'Preview changes without modifying files')
    .action(async (options) => {
      await fixCommand(options);
    });

  program
    .command('studio')
    .description('Launch DevArchitect Studio local interactive web dashboard')
    .option('-p, --port <port>', 'Port to run studio on', '4321')
    .option('--no-open', 'Do not automatically open the browser')
    .action(async (options) => {
      await studioCommand(options);
    });

  program
    .command('ask <question>')
    .description('Ask natural language questions about your repository architecture and data flow')
    .action(async (question) => {
      await askCommand(question);
    });

  program.parse(argv);
}

export * from './commands/init.js';
export * from './commands/analyze.js';
export * from './commands/inspect.js';
export * from './commands/doctor.js';
export * from './commands/impact.js';
export * from './commands/validate.js';
export * from './commands/graph.js';
export * from './commands/health.js';
export * from './commands/complexity.js';
export * from './commands/deadcode.js';
export * from './commands/duplication.js';
export * from './commands/fingerprint.js';
export * from './commands/generate.js';
export * from './commands/rules.js';
export * from './commands/rerenders.js';
export * from './commands/types.js';
export * from './commands/smells.js';
export * from './commands/simulate.js';
export * from './commands/pr.js';
export * from './commands/hooks.js';
export * from './commands/fix.js';
export * from './commands/studio.js';
export * from './commands/ask.js';
