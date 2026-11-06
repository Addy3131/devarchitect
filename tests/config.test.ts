import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { loadConfig, saveConfig, loadBaseline, saveBaseline, CONFIG_DIR } from '../packages/config/src/index.js';

describe('Config & Baseline Manager', () => {
  const tempDir = path.resolve(__dirname, '../.tmp-test-config');

  it('loads default configuration when no config file exists', () => {
    const { config, isDefault } = loadConfig(tempDir);
    expect(isDefault).toBe(true);
    expect(config.architecture.preset).toBe('recommended');
    expect(config.guard.baseline).toBe(true);
  });

  it('saves and reloads custom configuration', () => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    saveConfig(tempDir, {
      architecture: {
        preset: 'feature-sliced',
        rules: {
          'no-circular-dependencies': 'error',
        },
      },
    });

    const { config, isDefault } = loadConfig(tempDir);
    expect(isDefault).toBe(false);
    expect(config.architecture.preset).toBe('feature-sliced');
  });

  it('saves and reads baseline for Architecture Debt Ratchet', () => {
    const baseline = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      issueCounts: {
        errors: 1,
        warnings: 2,
        circularDependencies: 0,
      },
      issues: [
        {
          ruleId: 'no-cross-feature-imports',
          filePath: 'src/features/checkout/index.ts',
          hash: 'no-cross-feature-imports:src/features/checkout/index.ts',
        },
      ],
    };

    saveBaseline(tempDir, baseline);
    const loaded = loadBaseline(tempDir);

    expect(loaded).toBeDefined();
    expect(loaded?.issueCounts.errors).toBe(1);
    expect(loaded?.issues[0].ruleId).toBe('no-cross-feature-imports');

    // Clean up temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

