import { describe, it, expect } from 'vitest';
import {
  ProjectNodeSchema,
  ProjectEdgeSchema,
  DevArchitectConfigSchema,
  ArchitectureIssueSchema,
  ChangeImpactAnalysisSchema,
} from '../packages/contracts/src/index.js';

describe('Contracts & Schemas', () => {
  it('validates a valid ProjectNode', () => {
    const node = {
      id: 'src/components/Header.tsx',
      path: 'src/components/Header.tsx',
      name: 'Header.tsx',
      type: 'component',
      language: 'typescript-react',
      metrics: {
        linesOfCode: 42,
        dependencyCount: 2,
        dependentCount: 5,
      },
    };

    const parsed = ProjectNodeSchema.parse(node);
    expect(parsed.name).toBe('Header.tsx');
    expect(parsed.type).toBe('component');
    expect(parsed.metrics.linesOfCode).toBe(42);
  });

  it('validates a valid ProjectEdge', () => {
    const edge = {
      source: 'src/app/page.tsx',
      target: 'src/components/Header.tsx',
      type: 'imports',
      isExternal: false,
    };

    const parsed = ProjectEdgeSchema.parse(edge);
    expect(parsed.source).toBe('src/app/page.tsx');
    expect(parsed.target).toBe('src/components/Header.tsx');
  });

  it('validates default DevArchitectConfig', () => {
    const emptyConfig = {};
    const parsed = DevArchitectConfigSchema.parse(emptyConfig);
    expect(parsed.version).toBe(1);
    expect(parsed.architecture.preset).toBe('recommended');
    expect(parsed.guard.baseline).toBe(true);
  });

  it('validates ArchitectureIssue', () => {
    const issue = {
      id: 'cycle-1',
      ruleId: 'no-circular-dependencies',
      severity: 'error',
      message: 'Circular import between A and B',
      filePath: 'src/a.ts',
      evidence: ['src/a.ts', 'src/b.ts', 'src/a.ts'],
    };

    const parsed = ArchitectureIssueSchema.parse(issue);
    expect(parsed.severity).toBe('error');
  });

  it('validates ChangeImpactAnalysis', () => {
    const impact = {
      target: 'src/services/UserService.ts',
      directDependents: ['src/hooks/useUser.ts'],
      transitiveDependents: ['src/hooks/useUser.ts', 'src/App.tsx'],
      affectedFeatures: ['auth'],
      criticalPaths: 1,
      riskAssessment: 'HIGH',
      affectedModules: ['src/hooks'],
      suggestedChecks: ['auth tests'],
      potentialConcerns: ['Shared service'],
      dependencyDistanceMax: 2,
      timestamp: new Date().toISOString(),
    };

    const parsed = ChangeImpactAnalysisSchema.parse(impact);
    expect(parsed.riskAssessment).toBe('HIGH');
  });
});

