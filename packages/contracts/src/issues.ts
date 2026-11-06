import { z } from 'zod';

export const IssueSeveritySchema = z.enum(['error', 'warning', 'info']);
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const SourceLocationSchema = z.object({
  startLine: z.number(),
  startColumn: z.number().optional(),
  endLine: z.number(),
  endColumn: z.number().optional(),
});
export type SourceLocation = z.infer<typeof SourceLocationSchema>;

export const ArchitectureIssueSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity: IssueSeveritySchema,
  message: z.string(),
  filePath: z.string(),
  location: SourceLocationSchema.optional(),
  evidence: z.array(z.string()).default([]),
  suggestion: z.string().optional(),
  dimension: z.enum([
    'architecture',
    'complexity',
    'dependencies',
    'duplication',
    'maintainability',
    'testing'
  ]).default('architecture'),
});
export type ArchitectureIssue = z.infer<typeof ArchitectureIssueSchema>;

export const ArchitectureRulePresetSchema = z.enum([
  'feature-sliced',
  'clean-architecture',
  'layered',
  'modular-monolith',
  'custom',
  'recommended'
]);
export type ArchitectureRulePreset = z.infer<typeof ArchitectureRulePresetSchema>;

export const RuleConfigSchema = z.union([
  IssueSeveritySchema,
  z.enum(['off']),
  z.object({
    severity: IssueSeveritySchema,
    options: z.record(z.unknown()).optional(),
  })
]);
export type RuleConfig = z.infer<typeof RuleConfigSchema>;
