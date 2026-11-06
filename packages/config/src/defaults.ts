import { DevArchitectConfig } from '@devarchitect/contracts';

export const DEFAULT_CONFIG: DevArchitectConfig = {
  $schema: 'https://devarchitect.dev/schema/config.json',
  version: 1,
  project: {
    name: undefined,
    framework: 'auto',
    root: '.',
  },
  analysis: {
    incremental: true,
    include: [
      'src/**',
      'app/**',
      'pages/**',
      'lib/**',
      'components/**',
      'features/**',
      'modules/**',
      'services/**',
      'hooks/**',
      'packages/**',
      'apps/**'
    ],
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/.git/**',
      '**/*.d.ts',
      '**/*.config.*',
      '**/vite.config.*',
      '**/next.config.*'
    ],
    maxDependencyDepth: 20,
  },
  architecture: {
    preset: 'recommended',
    rules: {
      'no-circular-dependencies': 'error',
      'no-cross-feature-imports': 'error',
      'enforce-public-api': 'warning',
      'max-dependency-depth': 'warning',
      'no-unresolved-imports': 'error',
    },
  },
  ai: {
    enabled: false,
    provider: null,
  },
  guard: {
    baseline: true,
    failOnNewErrors: true,
    failOnNewWarnings: false,
    ratchetDebt: true,
  },
};

