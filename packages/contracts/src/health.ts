import { z } from 'zod';

export const HealthDimensionScoreSchema = z.object({
  score: z.number().min(0).max(100).nullable(), // null means unknown/unmeasured
  status: z.enum(['healthy', 'warning', 'critical', 'unmeasured']),
  weight: z.number().min(0).max(1),
  issueCount: z.number().default(0),
  summary: z.string().optional(),
});
export type HealthDimensionScore = z.infer<typeof HealthDimensionScoreSchema>;

export const ProjectHealthScoreSchema = z.object({
  overallScore: z.number().min(0).max(100),
  status: z.enum(['healthy', 'warning', 'critical']),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  dimensions: z.object({
    architecture: HealthDimensionScoreSchema,
    complexity: HealthDimensionScoreSchema,
    dependencies: HealthDimensionScoreSchema,
    duplication: HealthDimensionScoreSchema,
    maintainability: HealthDimensionScoreSchema,
    testing: HealthDimensionScoreSchema,
  }),
  metrics: z.object({
    totalIssues: z.number(),
    errorCount: z.number(),
    warningCount: z.number(),
    infoCount: z.number(),
    circularDependencies: z.number(),
    highComplexityCount: z.number(),
    duplicateBlocksCount: z.number(),
  }),
  evaluatedAt: z.string(),
});
export type ProjectHealthScore = z.infer<typeof ProjectHealthScoreSchema>;

