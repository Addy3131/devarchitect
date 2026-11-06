import {
  ArchitectureIssue,
  IssueSeverity,
  ProjectNode,
  ProjectEdge,
  DevArchitectConfig
} from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export interface ArchitectureRuleContext {
  graph: ArchitectureGraph;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  config: DevArchitectConfig;
}

export interface ArchitectureRule {
  id: string;
  name: string;
  description: string;
  defaultSeverity: IssueSeverity;
  evaluate(context: ArchitectureRuleContext): ArchitectureIssue[];
}
