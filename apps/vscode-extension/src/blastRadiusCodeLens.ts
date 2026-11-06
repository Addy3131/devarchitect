import * as vscode from 'vscode';
import { ArchitectureGraph } from '@devarchitect/graph';
import { ProjectNode } from '@devarchitect/contracts';
import path from 'node:path';

export class BlastRadiusCodeLensProvider implements vscode.CodeLensProvider {
  private graph: ArchitectureGraph | null = null;
  private nodes: ProjectNode[] = [];
  private rootDir: string = '';

  public updateContext(rootDir: string, graph: ArchitectureGraph, nodes: ProjectNode[]) {
    this.rootDir = rootDir;
    this.graph = graph;
    this.nodes = nodes;
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (!this.graph || !this.rootDir) return [];

    const ext = path.extname(document.fileName);
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return [];

    const relPath = path.relative(this.rootDir, document.fileName).replace(/\\/g, '/');
    const dependents = this.graph.getDependents(relPath);
    const callersCount = dependents.length;

    const riskLabel = callersCount > 8 ? 'High Risk' : callersCount > 2 ? 'Medium Risk' : 'Low Risk';
    const title = `💥 DevArchitect: ${callersCount} dependent(s) • Blast Radius: ${riskLabel}`;

    const topOfFileRange = new vscode.Range(0, 0, 0, 0);
    const codeLens = new vscode.CodeLens(topOfFileRange, {
      title,
      command: 'devarchitect.inspectCurrentFile',
      tooltip: `Click to inspect the ${callersCount} downstream file(s) that import this module`,
    });

    return [codeLens];
  }
}
