import pc from 'picocolors';
import { defaultRuleEngine, ALL_BUILTIN_RULES, PRESET_CONFIGS } from '@devarchitect/rules';
import { loadConfig } from '@devarchitect/config';

export async function rulesCommand(): Promise<void> {
  const rootDir = process.cwd();
  const { config } = loadConfig(rootDir);
  const currentPreset = config.architecture.preset;

  console.log(pc.bold(pc.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(pc.bold(pc.cyan('  DEVARCHITECT ARCHITECTURE POLICY RULES')));
  console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
  console.log(`  Active Preset: ${pc.bold(currentPreset)}\n`);

  console.log(pc.bold('  Built-in Architecture Rules:'));
  for (const rule of ALL_BUILTIN_RULES) {
    const userOverride = config.architecture.rules[rule.id];
    const presetDefault = PRESET_CONFIGS[currentPreset]?.[rule.id] || rule.defaultSeverity;
    const effective = userOverride || presetDefault;

    const badge =
      effective === 'error'
        ? pc.red(pc.bold('[ERROR]'))
        : effective === 'warning'
        ? pc.yellow(pc.bold('[WARN]'))
        : pc.gray('[OFF]');

    console.log(`  ${badge} ${pc.bold(rule.id)}`);
    console.log(`    ${pc.gray(rule.description)}`);
  }

  console.log(pc.bold('\n  Supported Architecture Presets:'));
  for (const presetName of Object.keys(PRESET_CONFIGS)) {
    const isActive = presetName === currentPreset ? pc.green(' (Active)') : '';
    console.log(`    • ${pc.bold(presetName)}${isActive}`);
  }
  console.log('');
}
