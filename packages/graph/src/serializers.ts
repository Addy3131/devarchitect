import { ArchitectureGraph } from './graph.js';

export function toMermaidFlowchart(graph: ArchitectureGraph): string {
  const nodes = graph.getAllNodes();
  const edges = graph.getAllEdges();

  const lines: string[] = ['flowchart TD'];

  // Map nodes with labels and styles
  for (const node of nodes) {
    const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  ${safeId}["${node.name} (${node.type})"]`);
  }

  // Add edges
  for (const edge of edges) {
    const safeSrc = edge.source.replace(/[^a-zA-Z0-9_]/g, '_');
    const safeTgt = edge.target.replace(/[^a-zA-Z0-9_]/g, '_');
    lines.push(`  ${safeSrc} --> ${safeTgt}`);
  }

  return lines.join('\n');
}

export function toDotFormat(graph: ArchitectureGraph): string {
  const nodes = graph.getAllNodes();
  const edges = graph.getAllEdges();

  const lines: string[] = ['digraph DevArchitect {', '  rankdir=LR;'];

  for (const node of nodes) {
    const safeId = JSON.stringify(node.id);
    const label = `${node.name}\\n(${node.type})`;
    lines.push(`  ${safeId} [label="${label}"];`);
  }

  for (const edge of edges) {
    const safeSrc = JSON.stringify(edge.source);
    const safeTgt = JSON.stringify(edge.target);
    lines.push(`  ${safeSrc} -> ${safeTgt};`);
  }

  lines.push('}');
  return lines.join('\n');
}

