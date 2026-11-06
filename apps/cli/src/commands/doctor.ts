import pc from 'picocolors';
import { runProjectDiscovery } from '@devarchitect/core';
import { loadConfig } from '@devarchitect/config';

export async function doctorCommand(): Promise<void> {
  const rootDir = process.cwd();
  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT PROJECT DOCTOR')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')));

  const { config, isDefault } = loadConfig(rootDir);
  const { discovery } = await runProjectDiscovery(rootDir);

  let passed = true;

  // 1. Config Check
  if (isDefault) {
    console.log(`  ${pc.yellow('⚠')} ${pc.bold('Configuration:')} Using defaults. Run ${pc.cyan('devarchitect init')} to create .devarchitect/config.json`);
  } else {
    console.log(`  ${pc.green('✔')} ${pc.bold('Configuration:')} Loaded .devarchitect/config.json (preset: ${config.architecture.preset})`);
  }

  // 2. TypeScript Check
  if (discovery.typeScript.exists) {
    console.log(`  ${pc.green('✔')} ${pc.bold('TypeScript:')} Config found at ${discovery.typeScript.configPath}`);
    if (discovery.typeScript.strict) {
      console.log(`    ${pc.green('✔')} Strict mode enabled`);
    } else {
      console.log(`    ${pc.yellow('⚠')} Strict mode is not enabled`);
    }
    if (discovery.typeScript.pathAliases.length > 0) {
      console.log(`    ${pc.green('✔')} Path aliases configured (${discovery.typeScript.pathAliases.length} aliases)`);
    }
  } else {
    console.log(`  ${pc.yellow('⚠')} ${pc.bold('TypeScript:')} No tsconfig.json detected`);
  }

  // 3. Framework & Entry points
  if (discovery.project.framework !== 'unknown') {
    console.log(`  ${pc.green('✔')} ${pc.bold('Framework:')} Detected ${pc.bold(discovery.project.framework)}${discovery.project.frameworkVersion ? ` v${discovery.project.frameworkVersion}` : ''}`);
  } else {
    console.log(`  ${pc.yellow('⚠')} ${pc.bold('Framework:')} Unknown framework or generic Node project`);
  }

  if (discovery.entryPoints.length > 0) {
    console.log(`  ${pc.green('✔')} ${pc.bold('Entry Points:')} ${discovery.entryPoints.join(', ')}`);
  } else {
    console.log(`  ${pc.yellow('⚠')} ${pc.bold('Entry Points:')} No standard application entry points identified`);
  }

  // 4. Testing framework
  if (discovery.detected.testingFramework) {
    console.log(`  ${pc.green('✔')} ${pc.bold('Testing Framework:')} ${discovery.detected.testingFramework}`);
  } else {
    console.log(`  ${pc.gray('ℹ')} ${pc.bold('Testing Framework:')} No test runner detected`);
  }

  // Summary
  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  if (passed) {
    console.log(pc.green('  ✔ Project doctor check complete. Codebase is ready for architectural analysis.\n'));
  }
}

