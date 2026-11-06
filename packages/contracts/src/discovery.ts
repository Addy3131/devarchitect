import { z } from 'zod';

export const FrameworkTypeSchema = z.enum([
  'nextjs',
  'react',
  'vite',
  'vue',
  'nuxt',
  'angular',
  'svelte',
  'sveltekit',
  'astro',
  'remix',
  'express',
  'nest',
  'fastify',
  'node',
  'unknown'
]);
export type FrameworkType = z.infer<typeof FrameworkTypeSchema>;

export const PackageManagerSchema = z.enum(['pnpm', 'npm', 'yarn', 'bun', 'unknown']);
export type PackageManager = z.infer<typeof PackageManagerSchema>;

export const LanguageSchema = z.enum(['TypeScript', 'JavaScript', 'Mixed', 'unknown']);
export type Language = z.infer<typeof LanguageSchema>;

export const ProjectSummarySchema = z.object({
  name: z.string(),
  rootDir: z.string(),
  framework: FrameworkTypeSchema,
  frameworkVersion: z.string().optional(),
  language: LanguageSchema,
  packageManager: PackageManagerSchema,
  runtime: z.string().default('node'),
  isMonorepo: z.boolean().default(false),
  workspaces: z.array(z.string()).default([]),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const DetectedFeaturesSchema = z.object({
  appRouter: z.boolean().default(false),
  pagesRouter: z.boolean().default(false),
  react: z.boolean().default(false),
  tailwind: z.boolean().default(false),
  zustand: z.boolean().default(false),
  tanstackQuery: z.boolean().default(false),
  redux: z.boolean().default(false),
  prisma: z.boolean().default(false),
  drizzle: z.boolean().default(false),
  testingFramework: z.string().nullable().default(null), // vitest, jest, etc.
  featureModules: z.enum(['full', 'partial', 'none']).default('none'),
  detectedLibraries: z.array(z.string()).default([]),
});
export type DetectedFeatures = z.infer<typeof DetectedFeaturesSchema>;

export const RepositoryStatsSchema = z.object({
  sourceFiles: z.number().default(0),
  totalFiles: z.number().default(0),
  components: z.number().default(0),
  hooks: z.number().default(0),
  services: z.number().default(0),
  utilities: z.number().default(0),
  routes: z.number().default(0),
  tests: z.number().default(0),
  configs: z.number().default(0),
  features: z.number().default(0),
  linesOfCode: z.number().default(0),
});
export type RepositoryStats = z.infer<typeof RepositoryStatsSchema>;

export const PathAliasSchema = z.object({
  prefix: z.string(),
  targets: z.array(z.string()),
});
export type PathAlias = z.infer<typeof PathAliasSchema>;

export const TypeScriptConfigInfoSchema = z.object({
  exists: z.boolean().default(false),
  configPath: z.string().optional(),
  target: z.string().optional(),
  module: z.string().optional(),
  strict: z.boolean().optional(),
  pathAliases: z.array(PathAliasSchema).default([]),
});
export type TypeScriptConfigInfo = z.infer<typeof TypeScriptConfigInfoSchema>;

export const ProjectDiscoverySchema = z.object({
  version: z.string().default('1.0.0'),
  timestamp: z.string(),
  project: ProjectSummarySchema,
  detected: DetectedFeaturesSchema,
  stats: RepositoryStatsSchema,
  entryPoints: z.array(z.string()).default([]),
  typeScript: TypeScriptConfigInfoSchema,
  packageJson: z.record(z.unknown()).optional(),
});
export type ProjectDiscovery = z.infer<typeof ProjectDiscoverySchema>;

