import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { analyzeCommand } from './commands/analyze.js';
import { inspectCommand } from './commands/inspect.js';
import { doctorCommand } from './commands/doctor.js';
import { impactCommand } from './commands/impact.js';
import { validateCommand } from './commands/validate.js';

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

  program.parse(argv);
}

export * from './commands/init.js';
export * from './commands/analyze.js';
export * from './commands/inspect.js';
export * from './commands/doctor.js';
export * from './commands/impact.js';
export * from './commands/validate.js';

