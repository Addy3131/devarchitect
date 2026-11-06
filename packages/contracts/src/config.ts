import { z } from 'zod';
import { ArchitectureRulePresetSchema, RuleConfigSchema } from './issues.js';

export const DevArchitectConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.number().default(1),
  project: z.object({
    name: z.string().optional(),
    framework: z.string().default('auto'), // 'auto' | 'react' | 'nextjs' | ...
    root: z.string().default('.'),
  }).default({}),
  analysis: z.object({
    incremental: z.boolean().default(true),
    include: z.array(z.string()).default(['src/**', 'app/**', 'pages/**', 'lib/**', 'components/**', 'features/**']),
    exclude: z.array(z.string()).default([
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'out/**',
      'coverage/**',
      '.turbo/**',
      '.git/**'
    ]),
    maxDependencyDepth: z.number().default(20),
  }).default({}),
  architecture: z.object({
    preset: ArchitectureRulePresetSchema.default('recommended'),
    layers: z.array(z.string()).optional(),
    rules: z.record(RuleConfigSchema).default({
      'no-circular-dependencies': 'error',
      'no-cross-feature-imports': 'error',
      'enforce-public-api': 'warning',
      'max-dependency-depth': 'warning',
      'no-unresolved-imports': 'error',
    }),
  }).default({}),
  ai: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['openai', 'anthropic', 'google', 'local']).nullable().default(null),
    model: z.string().optional(),
  }).default({}),
  guard: z.object({
    baseline: z.boolean().default(true),
    failOnNewErrors: z.boolean().default(true),
    failOnNewWarnings: z.boolean().default(false),
    ratchetDebt: z.boolean().default(true),
  }).default({}),
});
export type DevArchitectConfig = z.infer<typeof DevArchitectConfigSchema>;

export const ArchitectureBaselineSchema = z.object({
  version: z.string().default('1.0.0'),
  createdAt: z.string(),
  gitCommit: z.string().optional(),
  issueCounts: z.object({
    errors: z.number(),
    warnings: z.number(),
    circularDependencies: z.number(),
  }),
  issues: z.array(z.object({
    ruleId: z.string(),
    filePath: z.string(),
    hash: z.string(),
  })),
});
export type ArchitectureBaseline = z.infer<typeof ArchitectureBaselineSchema>;

