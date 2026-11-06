import * as vscode from 'vscode';
import path from 'node:path';
import { ProjectHealthScore, ArchitectureIssue } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export class ArchitectureHealthTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private health: ProjectHealthScore | null = null;
  private issues: ArchitectureIssue[] = [];

  public update(health: ProjectHealthScore, issues: ArchitectureIssue[]) {
    this.health = health;
    this.issues = issues;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!this.health) {
      return Promise.resolve([new TreeItem('Run DevArchitect to evaluate health', vscode.TreeItemCollapsibleState.None)]);
    }

    if (!element) {
      const items: TreeItem[] = [
        new TreeItem(`Overall Score: ${this.health.overallScore}/100 (Grade ${this.health.grade})`, vscode.TreeItemCollapsibleState.None, 'pulse'),
        new TreeItem(`Architecture: ${this.health.dimensions.architecture.score ?? 'N/A'}/100`, vscode.TreeItemCollapsibleState.None),
        new TreeItem(`Complexity: ${this.health.dimensions.complexity.score ?? 'N/A'}/100`, vscode.TreeItemCollapsibleState.None),
        new TreeItem(`Dependencies: ${this.health.dimensions.dependencies.score ?? 'N/A'}/100`, vscode.TreeItemCollapsibleState.None),
        new TreeItem(`Maintainability: ${this.health.dimensions.maintainability.score ?? 'N/A'}/100`, vscode.TreeItemCollapsibleState.None),
        new TreeItem(`Policy Violations: ${this.issues.length}`, vscode.TreeItemCollapsibleState.None, this.issues.length > 0 ? 'warning' : 'check'),
      ];
      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }
}

export class ActiveFileBlastRadiusTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private activeFilePath: string = '';
  private dependents: string[] = [];
  private rootDir: string = '';

  public updateFile(rootDir: string, filePath: string, graph: ArchitectureGraph | null) {
    this.rootDir = rootDir;
    this.activeFilePath = filePath;
    if (graph && filePath) {
      const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
      this.dependents = graph.getDependents(rel);
    } else {
      this.dependents = [];
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!this.activeFilePath) {
      return Promise.resolve([new TreeItem('No active file open', vscode.TreeItemCollapsibleState.None)]);
    }

    if (!element) {
      const fileName = path.basename(this.activeFilePath);
      if (this.dependents.length === 0) {
        return Promise.resolve([
          new TreeItem(`[${fileName}] has 0 dependents (Leaf/Entry)`, vscode.TreeItemCollapsibleState.None, 'info')
        ]);
      }

      const items = this.dependents.map(dep => {
        const item = new TreeItem(dep, vscode.TreeItemCollapsibleState.None, 'file');
        item.command = {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [vscode.Uri.file(path.join(this.rootDir, dep))]
        };
        return item;
      });
      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    iconName?: string
  ) {
    super(label, collapsibleState);
    if (iconName) {
      this.iconPath = new vscode.ThemeIcon(iconName);
    }
  }
}
