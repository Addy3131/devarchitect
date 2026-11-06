import { z } from 'zod';

export const NodeTypeSchema = z.enum([
  'component',
  'hook',
  'service',
  'utility',
  'feature',
  'route',
  'module',
  'config',
  'asset',
  'test',
  'unknown'
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const EdgeTypeSchema = z.enum([
  'imports',
  'calls',
  'extends',
  'implements',
  'uses'
]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const NodeMetricsSchema = z.object({
  complexity: z.number().nullable().default(null),
  linesOfCode: z.number().default(0),
  dependencyCount: z.number().default(0),
  dependentCount: z.number().default(0),
  exportCount: z.number().default(0),
  importCount: z.number().default(0),
});
export type NodeMetrics = z.infer<typeof NodeMetricsSchema>;

export const ProjectNodeSchema = z.object({
  id: z.string(), // normalized relative path from repo root
  path: z.string(), // relative path
  absolutePath: z.string().optional(),
  name: z.string(),
  type: NodeTypeSchema,
  language: z.string(),
  feature: z.string().optional(), // feature slice if belongs to one
  layer: z.string().optional(), // architectural layer (e.g., app, pages, widgets, features, entities, shared)
  metrics: NodeMetricsSchema,
  metadata: z.record(z.unknown()).default({}),
});
export type ProjectNode = z.infer<typeof ProjectNodeSchema>;

export const ProjectEdgeSchema = z.object({
  source: z.string(), // node id
  target: z.string(), // node id or package name
  type: EdgeTypeSchema.default('imports'),
  isExternal: z.boolean().default(false),
  specifiers: z.array(z.string()).default([]), // imported named specifiers
  isTypeOnly: z.boolean().default(false),
  isDynamic: z.boolean().default(false),
});
export type ProjectEdge = z.infer<typeof ProjectEdgeSchema>;

export const ProjectGraphSchema = z.object({
  version: z.string().default('1.0.0'),
  nodes: z.record(ProjectNodeSchema),
  edges: z.array(ProjectEdgeSchema),
  rootPath: z.string(),
  timestamp: z.string(),
});
export type ProjectGraph = z.infer<typeof ProjectGraphSchema>;

