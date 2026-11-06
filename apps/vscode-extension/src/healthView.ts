import * as vscode from 'vscode';
import path from 'node:path';
import { ProjectHealthScore, ArchitectureIssue } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export type HealthTreeItemType = 'summary' | 'dimension' | 'violations_group' | 'issue' | 'placeholder';

export class DevArchitectTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly itemType: HealthTreeItemType = 'summary',
    iconName?: string,
    public readonly issue?: ArchitectureIssue
  ) {
    super(label, collapsibleState);
    if (iconName) {
      this.iconPath = new vscode.ThemeIcon(iconName);
    }
  }
}

export class ArchitectureHealthTreeProvider implements vscode.TreeDataProvider<DevArchitectTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DevArchitectTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DevArchitectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DevArchitectTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private health: ProjectHealthScore | null = null;
  private issues: ArchitectureIssue[] = [];
  private rootDir: string = '';
  private isLoading: boolean = false;
  private hasWorkspace: boolean = true;

  public setRootDir(rootDir: string) {
    this.rootDir = rootDir;
    this.hasWorkspace = true;
  }

  public setNoWorkspace() {
    this.hasWorkspace = false;
    this.health = null;
    this._onDidChangeTreeData.fire();
  }

  public setLoading(loading: boolean) {
    this.isLoading = loading;
    this._onDidChangeTreeData.fire();
  }

  public update(health: ProjectHealthScore, issues: ArchitectureIssue[]) {
    this.health = health;
    this.issues = issues;
    this.isLoading = false;
    this.hasWorkspace = true;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DevArchitectTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DevArchitectTreeItem): Thenable<DevArchitectTreeItem[]> {
    if (!this.hasWorkspace) {
      return Promise.resolve([
        new DevArchitectTreeItem(
          'Open a folder to analyze code health',
          vscode.TreeItemCollapsibleState.None,
          'placeholder',
          'folder'
        ),
      ]);
    }

    if (this.isLoading) {
      return Promise.resolve([
        new DevArchitectTreeItem(
          'DevArchitect: Evaluating architecture...',
          vscode.TreeItemCollapsibleState.None,
          'placeholder',
          'loading~spin'
        ),
      ]);
    }

    if (!this.health) {
      const item = new DevArchitectTreeItem(
        'Click to evaluate codebase health',
        vscode.TreeItemCollapsibleState.None,
        'placeholder',
        'play'
      );
      item.command = {
        command: 'devarchitect.healthCheck',
        title: 'Evaluate Health',
      };
      return Promise.resolve([item]);
    }

    // Root level items
    if (!element) {
      const items: DevArchitectTreeItem[] = [
        new DevArchitectTreeItem(
          `Overall Score: ${this.health.overallScore}/100 (Grade ${this.health.grade})`,
          vscode.TreeItemCollapsibleState.None,
          'summary',
          'shield'
        ),
        new DevArchitectTreeItem(
          `Architecture: ${this.health.dimensions.architecture.score ?? 'N/A'}/100`,
          vscode.TreeItemCollapsibleState.None,
          'dimension',
          'layers'
        ),
        new DevArchitectTreeItem(
          `Complexity: ${this.health.dimensions.complexity.score ?? 'N/A'}/100`,
          vscode.TreeItemCollapsibleState.None,
          'dimension',
          'pulse'
        ),
        new DevArchitectTreeItem(
          `Dependencies: ${this.health.dimensions.dependencies.score ?? 'N/A'}/100`,
          vscode.TreeItemCollapsibleState.None,
          'dimension',
          'references'
        ),
        new DevArchitectTreeItem(
          `Maintainability: ${this.health.dimensions.maintainability.score ?? 'N/A'}/100`,
          vscode.TreeItemCollapsibleState.None,
          'dimension',
          'heart'
        ),
      ];

      if (this.issues.length > 0) {
        items.push(
          new DevArchitectTreeItem(
            `Policy Violations (${this.issues.length})`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'violations_group',
            'warning'
          )
        );
      } else {
        items.push(
          new DevArchitectTreeItem(
            'Policy Violations: 0 (All Clean)',
            vscode.TreeItemCollapsibleState.None,
            'violations_group',
            'pass'
          )
        );
      }

      return Promise.resolve(items);
    }

    // Children of violations_group
    if (element.itemType === 'violations_group') {
      const issueItems = this.issues.map((issue) => {
        const item = new DevArchitectTreeItem(
          `[${issue.ruleId}] ${issue.message}`,
          vscode.TreeItemCollapsibleState.None,
          'issue',
          issue.severity === 'error' ? 'error' : 'warning',
          issue
        );

        const rel = path.basename(issue.filePath);
        item.description = `${rel}:${issue.location?.startLine ?? 1}`;
        item.tooltip = `${issue.message}\nSuggestion: ${issue.suggestion ?? 'Review rule guidelines'}`;

        const absPath = path.isAbsolute(issue.filePath)
          ? issue.filePath
          : path.join(this.rootDir, issue.filePath);

        const targetLine = Math.max(0, (issue.location?.startLine ?? 1) - 1);
        item.command = {
          command: 'vscode.open',
          title: 'Jump to Violation',
          arguments: [
            vscode.Uri.file(absPath),
            {
              selection: new vscode.Range(targetLine, 0, targetLine, 0),
            },
          ],
        };

        return item;
      });

      return Promise.resolve(issueItems);
    }

    return Promise.resolve([]);
  }
}

export class ActiveFileBlastRadiusTreeProvider implements vscode.TreeDataProvider<DevArchitectTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DevArchitectTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DevArchitectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DevArchitectTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private activeFilePath: string = '';
  private dependents: string[] = [];
  private rootDir: string = '';
  private hasWorkspace: boolean = true;

  public setRootDir(rootDir: string) {
    this.rootDir = rootDir;
    this.hasWorkspace = true;
  }

  public setNoWorkspace() {
    this.hasWorkspace = false;
    this._onDidChangeTreeData.fire();
  }

  public updateFile(rootDir: string, filePath: string, graph: ArchitectureGraph | null) {
    this.rootDir = rootDir;
    this.activeFilePath = filePath;
    this.hasWorkspace = true;
    if (graph && filePath) {
      const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
      this.dependents = graph.getDependents(rel);
    } else {
      this.dependents = [];
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DevArchitectTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: DevArchitectTreeItem): Thenable<DevArchitectTreeItem[]> {
    if (!this.hasWorkspace) {
      return Promise.resolve([
        new DevArchitectTreeItem(
          'Open a workspace folder to view blast radius',
          vscode.TreeItemCollapsibleState.None,
          'placeholder',
          'folder'
        ),
      ]);
    }

    if (!this.activeFilePath) {
      return Promise.resolve([
        new DevArchitectTreeItem(
          'Open a TS/JS file to inspect blast radius',
          vscode.TreeItemCollapsibleState.None,
          'placeholder',
          'info'
        ),
      ]);
    }

    if (!element) {
      const fileName = path.basename(this.activeFilePath);
      if (this.dependents.length === 0) {
        return Promise.resolve([
          new DevArchitectTreeItem(
            `[${fileName}] 0 Downstream Dependents (Leaf/Entry)`,
            vscode.TreeItemCollapsibleState.None,
            'summary',
            'check'
          ),
        ]);
      }

      const summaryHeader = new DevArchitectTreeItem(
        `Blast Radius: ${this.dependents.length} downstream file(s)`,
        vscode.TreeItemCollapsibleState.None,
        'summary',
        'flame'
      );

      const items = this.dependents.map((dep) => {
        const item = new DevArchitectTreeItem(
          dep,
          vscode.TreeItemCollapsibleState.None,
          'summary',
          'file'
        );
        item.command = {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [vscode.Uri.file(path.join(this.rootDir, dep))],
        };
        return item;
      });

      return Promise.resolve([summaryHeader, ...items]);
    }

    return Promise.resolve([]);
  }
}
