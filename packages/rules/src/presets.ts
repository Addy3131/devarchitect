import { ArchitectureRule } from './types.js';
import { ArchitectureRulePreset } from '@devarchitect/contracts';
import { noCircularDependenciesRule } from './rules/no-circular-dependencies.js';
import { noCrossFeatureImportsRule } from './rules/no-cross-feature-imports.js';
import { noUiToDatabaseRule } from './rules/no-ui-to-database.js';
import { enforcePublicApiRule } from './rules/enforce-public-api.js';
import { maxDependencyDepthRule } from './rules/max-dependency-depth.js';
import { noUnresolvedImportsRule } from './rules/no-unresolved-imports.js';

export const ALL_BUILTIN_RULES: ArchitectureRule[] = [
  noCircularDependenciesRule,
  noCrossFeatureImportsRule,
  noUiToDatabaseRule,
  enforcePublicApiRule,
  maxDependencyDepthRule,
  noUnresolvedImportsRule,
];

export const PRESET_CONFIGS: Record<ArchitectureRulePreset, Record<string, 'error' | 'warning' | 'off'>> = {
  'feature-sliced': {
    'no-circular-dependencies': 'error',
    'no-cross-feature-imports': 'error',
    'enforce-public-api': 'error',
    'no-ui-to-database': 'error',
    'max-dependency-depth': 'warning',
    'no-unresolved-imports': 'error',
  },
  'clean-architecture': {
    'no-circular-dependencies': 'error',
    'no-ui-to-database': 'error',
    'no-cross-feature-imports': 'warning',
    'enforce-public-api': 'warning',
    'max-dependency-depth': 'warning',
    'no-unresolved-imports': 'error',
  },
  'layered': {
    'no-circular-dependencies': 'error',
    'no-ui-to-database': 'error',
    'max-dependency-depth': 'warning',
    'no-unresolved-imports': 'error',
  },
  'modular-monolith': {
    'no-circular-dependencies': 'error',
    'no-cross-feature-imports': 'error',
    'enforce-public-api': 'warning',
    'no-ui-to-database': 'warning',
    'max-dependency-depth': 'warning',
    'no-unresolved-imports': 'error',
  },
  'recommended': {
    'no-circular-dependencies': 'error',
    'no-cross-feature-imports': 'warning',
    'enforce-public-api': 'warning',
    'no-ui-to-database': 'error',
    'max-dependency-depth': 'warning',
    'no-unresolved-imports': 'error',
  },
  'custom': {
    'no-circular-dependencies': 'error',
    'no-unresolved-imports': 'error',
  },
};
