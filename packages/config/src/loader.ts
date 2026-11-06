import fs from 'node:fs';
import path from 'node:path';
import {
  DevArchitectConfig,
  DevArchitectConfigSchema,
  ArchitectureBaseline,
  ArchitectureBaselineSchema
} from '@devarchitect/contracts';
import { DEFAULT_CONFIG } from './defaults.js';

export const CONFIG_DIR = '.devarchitect';
export const CONFIG_FILE = 'config.json';
export const BASELINE_FILE = 'baseline.json';

export function resolveConfigPath(projectRoot: string): string {
  const primaryPath = path.join(projectRoot, CONFIG_DIR, CONFIG_FILE);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }
  const fallbackPath = path.join(projectRoot, '.devarchitectrc.json');
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }
  return primaryPath;
}

export function loadConfig(projectRoot: string): { config: DevArchitectConfig; configPath: string; isDefault: boolean } {
  const configPath = resolveConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    return {
      config: { ...DEFAULT_CONFIG },
      configPath,
      isDefault: true,
    };
  }

  try {
    const rawContent = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(rawContent);
    const validated = DevArchitectConfigSchema.parse(parsed);
    return {
      config: validated,
      configPath,
      isDefault: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load DevArchitect config from ${configPath}: ${message}`);
  }
}

export function saveConfig(projectRoot: string, config: Partial<DevArchitectConfig>): string {
  const dirPath = path.join(projectRoot, CONFIG_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const mergedConfig = DevArchitectConfigSchema.parse({
    ...DEFAULT_CONFIG,
    ...config,
  });

  const filePath = path.join(dirPath, CONFIG_FILE);
  fs.writeFileSync(filePath, JSON.stringify(mergedConfig, null, 2) + '\n', 'utf8');
  return filePath;
}

export function loadBaseline(projectRoot: string): ArchitectureBaseline | null {
  const baselinePath = path.join(projectRoot, CONFIG_DIR, BASELINE_FILE);
  if (!fs.existsSync(baselinePath)) {
    return null;
  }

  try {
    const rawContent = fs.readFileSync(baselinePath, 'utf8');
    const parsed = JSON.parse(rawContent);
    return ArchitectureBaselineSchema.parse(parsed);
  } catch {
    return null;
  }
}

export function saveBaseline(projectRoot: string, baseline: ArchitectureBaseline): string {
  const dirPath = path.join(projectRoot, CONFIG_DIR);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const validated = ArchitectureBaselineSchema.parse(baseline);
  const filePath = path.join(dirPath, BASELINE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(validated, null, 2) + '\n', 'utf8');
  return filePath;
}

