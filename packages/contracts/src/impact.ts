import { z } from 'zod';

export const RiskAssessmentSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

export const ChangeImpactAnalysisSchema = z.object({
  target: z.string(),
  isDirectTarget: z.boolean().default(true),
  directDependents: z.array(z.string()).default([]),
  transitiveDependents: z.array(z.string()).default([]),
  affectedFeatures: z.array(z.string()).default([]),
  criticalPaths: z.number().default(0),
  riskAssessment: RiskAssessmentSchema,
  affectedModules: z.array(z.string()).default([]),
  suggestedChecks: z.array(z.string()).default([]),
  potentialConcerns: z.array(z.string()).default([]),
  dependencyDistanceMax: z.number().default(0),
  timestamp: z.string(),
});
export type ChangeImpactAnalysis = z.infer<typeof ChangeImpactAnalysisSchema>;

