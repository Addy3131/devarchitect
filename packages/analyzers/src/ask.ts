import path from 'node:path';
import fs from 'node:fs';
import { ProjectNode, ProjectEdge } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export interface CodebaseAnswer {
  question: string;
  topic: string;
  summary: string;
  flowSteps: string[];
  relatedFiles: string[];
  evidenceCount: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export function answerCodebaseQuestion(
  rootDir: string,
  question: string,
  nodes: ProjectNode[],
  edges: ProjectEdge[],
  graph: ArchitectureGraph
): CodebaseAnswer {
  const qLower = question.toLowerCase();

  // 1. Detect Intent: Complexity / Hotspots Query
  if (qLower.includes('complex') || qLower.includes('hotspot') || qLower.includes('most complicated') || qLower.includes('biggest')) {
    const complexNodes = [...nodes]
      .filter(n => (n.metrics?.complexity || 0) > 0 || (n.metrics?.linesOfCode || 0) > 0)
      .sort((a, b) => ((b.metrics?.complexity || 0) * 10 + (b.metrics?.linesOfCode || 0)) - ((a.metrics?.complexity || 0) * 10 + (a.metrics?.linesOfCode || 0)))
      .slice(0, 5);

    if (complexNodes.length > 0) {
      return {
        question,
        topic: 'Codebase Complexity Hotspots',
        summary: `Identified top ${complexNodes.length} files with the highest cyclomatic complexity and code volume.`,
        flowSteps: complexNodes.map((n, i) => 
          `${i + 1}. [${n.name}] (${n.path}) — Complexity: ${n.metrics?.complexity ?? 'N/A'}, Lines: ${n.metrics?.linesOfCode || 0} (${n.type})`
        ),
        relatedFiles: complexNodes.map(n => n.path),
        evidenceCount: complexNodes.length,
        confidence: 'High',
      };
    }
  }

  // Extract key search terms from the question
  const stopWords = new Set([
    'how', 'does', 'work', 'what', 'is', 'the', 'in', 'and', 'to', 'from',
    'where', 'why', 'can', 'i', 'find', 'a', 'an', 'are', 'who', 'which',
    'file', 'files', 'uses', 'used', 'by', 'depends', 'on', 'call', 'calls'
  ]);
  const tokens = qLower
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));

  // Match relevant nodes based on tokens, features, and names
  const matchedNodes: Array<{ node: ProjectNode; score: number }> = [];

  for (const node of nodes) {
    let score = 0;
    const normPath = node.path.toLowerCase();
    const nameLower = node.name.toLowerCase();
    const featLower = node.feature?.toLowerCase() || '';

    for (const token of tokens) {
      if (normPath.includes(token)) score += 5;
      if (nameLower.includes(token)) score += 8;
      if (featLower.includes(token)) score += 10;
    }

    if (score > 0) {
      matchedNodes.push({ node, score });
    }
  }

  matchedNodes.sort((a, b) => b.score - a.score);
  const topNodes = matchedNodes.slice(0, 8).map(m => m.node);
  const primaryNode = topNodes[0];

  // 2. Detect Intent: Dependency / Downstream Callers Query ("who uses X", "what depends on X")
  const isDependentsQuery = qLower.includes('who uses') || 
                            qLower.includes('who imports') || 
                            qLower.includes('what uses') || 
                            qLower.includes('depends on') || 
                            qLower.includes('dependents') ||
                            qLower.includes('who calls');

  if (isDependentsQuery && primaryNode) {
    const dependents = graph.getDependents(primaryNode.path);
    const flowSteps: string[] = [];

    if (dependents.length === 0) {
      flowSteps.push(`• No other files currently import [${primaryNode.name}] directly (it is an entry point or isolated module).`);
    } else {
      dependents.forEach((dep, idx) => {
        flowSteps.push(`${idx + 1}. [${path.basename(dep)}] (${dep}) imports and depends on [${primaryNode.name}]`);
      });
    }

    return {
      question,
      topic: `${primaryNode.name} Downstream Dependents & Consumers`,
      summary: `Found ${dependents.length} file(s) that import and depend on [${primaryNode.name}].`,
      flowSteps,
      relatedFiles: [primaryNode.path, ...dependents],
      evidenceCount: dependents.length + 1,
      confidence: 'High',
    };
  }

  // 3. Detect Intent: Location / "Where is" Query
  const isLocationQuery = qLower.startsWith('where is') || 
                          qLower.startsWith('where are') || 
                          qLower.startsWith('which file') || 
                          qLower.includes('locate') || 
                          qLower.includes('where can i find');

  if (isLocationQuery && primaryNode) {
    const flowSteps = [
      `Primary Location: ${primaryNode.path}`,
      `Architectural Role: ${primaryNode.type.toUpperCase()}${primaryNode.layer ? ` (Layer: ${primaryNode.layer})` : ''}`,
      primaryNode.feature ? `Feature Slice: ${primaryNode.feature}` : `Independent module`,
      `Lines of Code: ${primaryNode.metrics?.linesOfCode || 0} lines`,
      `Direct Dependencies: ${graph.getDependencies(primaryNode.path).length} imported modules`,
    ];

    return {
      question,
      topic: `${primaryNode.name} Location & Identity`,
      summary: `[${primaryNode.name}] is located at ${primaryNode.path}.`,
      flowSteps,
      relatedFiles: [primaryNode.path],
      evidenceCount: 1,
      confidence: 'High',
    };
  }

  // If no specific match, list general architecture overview
  if (topNodes.length === 0) {
    const entryPoints = nodes.filter(n => n.type === 'route' || n.name.startsWith('main.') || n.name.startsWith('App.'));
    return {
      question,
      topic: 'Architecture Overview',
      summary: `Analyzed repository with ${nodes.length} files. No specific matches found for '${tokens.join(', ')}'.`,
      flowSteps: [
        'Application initiates at entry points (' + entryPoints.slice(0, 3).map(e => e.name).join(', ') + ')',
        'State and UI components render through feature slices and shared utilities',
      ],
      relatedFiles: entryPoints.slice(0, 5).map(e => e.path),
      evidenceCount: entryPoints.length,
      confidence: 'Medium',
    };
  }

  // 4. Default: Architecture Execution Flow & Interaction Sequence
  const flowSteps: string[] = [];

  // Look for components calling services/hooks
  const uiNodes = topNodes.filter(n => n.type === 'component' || n.type === 'route');
  const hookNodes = topNodes.filter(n => n.type === 'hook');
  const serviceNodes = topNodes.filter(n => n.type === 'service');

  if (uiNodes.length > 0) {
    flowSteps.push(`1. User interaction starts in UI component [${uiNodes[0].name}] (${uiNodes[0].path})`);
  }
  if (hookNodes.length > 0) {
    flowSteps.push(`2. State orchestration & side-effects handled in hook [${hookNodes[0].name}] (${hookNodes[0].path})`);
  }
  if (serviceNodes.length > 0) {
    flowSteps.push(`3. Data fetching / API communication processed in [${serviceNodes[0].name}] (${serviceNodes[0].path})`);
  }

  // Trace downstream dependencies
  const deps = graph.getDependencies(primaryNode.path);
  if (deps.length > 0) {
    flowSteps.push(`4. [${primaryNode.name}] delegates to dependencies: ${deps.slice(0, 3).join(', ')}`);
  }

  const topic = primaryNode.feature ? `${primaryNode.feature.toUpperCase()} Architecture` : `${primaryNode.name} Execution Flow`;
  const summary = `Found ${topNodes.length} indexed code files and ${deps.length} direct dependencies matching your query.`;

  return {
    question,
    topic,
    summary,
    flowSteps,
    relatedFiles: topNodes.map(n => n.path),
    evidenceCount: topNodes.length + deps.length,
    confidence: topNodes.length >= 2 ? 'High' : 'Medium',
  };
}

