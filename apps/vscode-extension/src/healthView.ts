import * as vscode from 'vscode';
import path from 'node:path';
import { ProjectHealthScore, ArchitectureIssue } from '@devarchitect/contracts';
import { ArchitectureGraph } from '@devarchitect/graph';

export type HealthTreeItemType =
  | 'scope'
  | 'summary'
  | 'dimension'
  | 'violations_group'
  | 'issue'
  | 'placeholder'
  | 'warning';

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
  private targetDir: string = '';
  private totalNodes: number = 0;
  private isLoading: boolean = false;
  private hasWorkspace: boolean = true;

  public setRootDir(rootDir: string, targetDir?: string) {
    this.rootDir = rootDir;
    this.targetDir = targetDir || rootDir;
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

  public update(health: ProjectHealthScore, issues: ArchitectureIssue[], totalNodes: number = 0) {
    this.health = health;
    this.issues = issues;
    this.totalNodes = totalNodes;
    this.isLoading = false;
    this.hasWorkspace = true;
    this._onDidChangeTreeData.fire();
  }

  public refresh() {
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

    // Root level items
    if (!element) {
      const items: DevArchitectTreeItem[] = [];

      // 1. Current Target Folder Scope Item
      const activeFolder = path.basename(this.targetDir || this.rootDir) || 'Workspace';
      const scopeItem = new DevArchitectTreeItem(
        `Scope: ${activeFolder} (${this.totalNodes} file${this.totalNodes === 1 ? '' : 's'})`,
        vscode.TreeItemCollapsibleState.None,
        'scope',
        'folder-opened'
      );
      scopeItem.tooltip = `Current analysis root: ${this.targetDir || this.rootDir}. Click to switch target subfolder.`;
      scopeItem.command = {
        command: 'devarchitect.selectProjectRoot',
        title: 'Switch Target Subfolder',
      };
      items.push(scopeItem);

      // 2. If 0 nodes found, guide the user directly
      if (this.totalNodes === 0) {
        const warningItem = new DevArchitectTreeItem(
          '0 source files found in target folder',
          vscode.TreeItemCollapsibleState.None,
          'warning',
          'warning'
        );
        const actionItem = new DevArchitectTreeItem(
          '👉 Click here to select a project subfolder',
          vscode.TreeItemCollapsibleState.None,
          'warning',
          'folder-library'
        );
        actionItem.command = {
          command: 'devarchitect.selectProjectRoot',
          title: 'Select Project Subfolder',
        };

        const checkConfigItem = new DevArchitectTreeItem(
          'Tip: Check .devarchitect/config.json includes',
          vscode.TreeItemCollapsibleState.None,
          'placeholder',
          'info'
        );

        return Promise.resolve([scopeItem, warningItem, actionItem, checkConfigItem]);
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
        return Promise.resolve([scopeItem, item]);
      }

      // 3. Health Scores and Metrics
      items.push(
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
        )
      );

      // 4. Policy Violations
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
  private currentGraph: ArchitectureGraph | null = null;

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
    this.currentGraph = graph;
    this.hasWorkspace = true;

    if (graph && filePath) {
      const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
      // Look up dependents matching relative path or base name
      let deps = graph.getDependents(rel);
      if (deps.length === 0) {
        // Also check if graph stored paths relative to a subfolder
        const matchingNode = graph.getAllNodes().find(
          (n) => n.path === rel || rel.endsWith(n.path) || n.path.endsWith(rel)
        );
        if (matchingNode) {
          deps = graph.getDependents(matchingNode.path);
        }
      }
      this.dependents = deps;
    } else {
      this.dependents = [];
    }
    this._onDidChangeTreeData.fire();
  }

  public refresh() {
    if (this.rootDir && this.activeFilePath && this.currentGraph) {
      this.updateFile(this.rootDir, this.activeFilePath, this.currentGraph);
    } else {
      this._onDidChangeTreeData.fire();
    }
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
            `[${fileName}] 0 Downstream Callers (Leaf/Entry)`,
            vscode.TreeItemCollapsibleState.None,
            'summary',
            'check'
          ),
        ]);
      }

      const summaryHeader = new DevArchitectTreeItem(
        `Blast Radius: ${this.dependents.length} downstream caller(s)`,
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
        const absPath = path.isAbsolute(dep) ? dep : path.join(this.rootDir, dep);
        item.command = {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [vscode.Uri.file(absPath)],
        };
        return item;
      });

      return Promise.resolve([summaryHeader, ...items]);
    }

    return Promise.resolve([]);
  }
}
