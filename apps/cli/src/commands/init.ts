import path from 'node:path';
import fs from 'node:fs';
import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { saveConfig, CONFIG_DIR, CONFIG_FILE } from '@devarchitect/config';
import { ArchitectureRulePreset } from '@devarchitect/contracts';

export interface InitCommandOptions {
  preset?: ArchitectureRulePreset;
  force?: boolean;
}

export async function initCommand(options: InitCommandOptions = {}): Promise<void> {
  const rootDir = process.cwd();
  const configPath = path.join(rootDir, CONFIG_DIR, CONFIG_FILE);

  console.log(pc.bold(pc.cyan('\n  DevArchitect — Project Initialization\n')));

  if (fs.existsSync(configPath) && !options.force) {
    console.log(pc.yellow(`  ⚠ Configuration already exists at ${configPath}`));
    console.log(pc.gray('    Use --force to overwrite.\n'));
    return;
  }

  console.log(pc.gray('  Scanning repository structure...'));
  const { discovery } = await runProjectDiscovery(rootDir);

  let preset: ArchitectureRulePreset = options.preset || 'recommended';
  if (!options.preset) {
    if (discovery.detected.featureModules !== 'none') {
      preset = 'feature-sliced';
    } else if (discovery.project.framework === 'nest') {
      preset = 'clean-architecture';
    }
  }

  const savedPath = saveConfig(rootDir, {
    project: {
      name: discovery.project.name,
      framework: discovery.project.framework,
      root: '.',
    },
    architecture: {
      preset,
      rules: {
        'no-circular-dependencies': 'error',
        'no-cross-feature-imports': 'error',
        'enforce-public-api': 'warning',
        'max-dependency-depth': 'warning',
        'no-unresolved-imports': 'error',
      },
    },
  });

  // Ensure cache and reports directories exist
  const cacheDir = path.join(rootDir, CONFIG_DIR, 'cache');
  const reportsDir = path.join(rootDir, CONFIG_DIR, 'reports');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  console.log(pc.green(`  ✔ Initialized DevArchitect configuration at ${pc.bold(savedPath)}`));
  console.log(`  ${pc.gray('Framework:')} ${pc.bold(discovery.project.framework)}`);
  console.log(`  ${pc.gray('Preset:')}    ${pc.bold(preset)}`);
  console.log(`  ${pc.gray('Files:')}     ${discovery.stats.totalFiles} detected\n`);
  console.log(pc.cyan('  Next steps:'));
  console.log(`    Run ${pc.bold('devarchitect analyze')} to run project discovery`);
  console.log(`    Run ${pc.bold('devarchitect doctor')} to inspect project health\n`);
}

