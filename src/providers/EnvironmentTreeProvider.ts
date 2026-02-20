import * as vscode from 'vscode';
import type { Environment } from '../types';

const ENVIRONMENTS_KEY = 'apiforge.environments';
const ACTIVE_ENV_KEY = 'apiforge.activeEnvironment';

export class EnvironmentTreeProvider implements vscode.TreeDataProvider<Environment> {
  private _onDidChangeTreeData: vscode.EventEmitter<Environment | undefined | null | void> =
    new vscode.EventEmitter<Environment | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Environment | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private environments: Environment[] = [];
  private activeEnvironmentId: string | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.loadEnvironments();
  }

  refresh(): void {
    this.loadEnvironments();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Environment): vscode.TreeItem {
    const isActive = element.id === this.activeEnvironmentId;
    const item = new vscode.TreeItem(element.name, vscode.TreeItemCollapsibleState.None);

    item.contextValue = isActive ? 'environment-active' : 'environment';
    item.description = isActive ? '(active)' : `${element.variables.length} variables`;
    item.iconPath = new vscode.ThemeIcon(isActive ? 'check' : 'symbol-variable');

    item.command = {
      command: 'apiforge.setActiveEnvironment',
      title: 'Set Active Environment',
      arguments: [element.id],
    };

    return item;
  }

  getChildren(element?: Environment): Thenable<Environment[]> {
    if (!element) {
      return Promise.resolve(this.environments);
    }
    return Promise.resolve([]);
  }

  getActiveEnvironment(): Environment | null {
    if (!this.activeEnvironmentId) return null;
    return this.environments.find((e) => e.id === this.activeEnvironmentId) || null;
  }

  setActiveEnvironment(id: string | null): void {
    this.activeEnvironmentId = id;
    this.context.globalState.update(ACTIVE_ENV_KEY, id);
    this._onDidChangeTreeData.fire();
  }

  async createEnvironment(name: string): Promise<void> {
    const environment: Environment = {
      id: this.generateId(),
      name,
      variables: [],
    };

    this.environments.push(environment);
    await this.saveEnvironments();
    this._onDidChangeTreeData.fire();

    vscode.window.showInformationMessage(`Environment "${name}" created`);
  }

  async deleteEnvironment(id: string): Promise<void> {
    this.environments = this.environments.filter(e => e.id !== id);
    await this.saveEnvironments();

    // If deleted env was active, clear active
    if (this.activeEnvironmentId === id) {
      this.setActiveEnvironment(null);
    }

    this._onDidChangeTreeData.fire();
  }

  private loadEnvironments(): void {
    // Use globalState with the same key as StorageService
    this.activeEnvironmentId = this.context.globalState.get<string | null>(ACTIVE_ENV_KEY, null);
    this.environments = this.context.globalState.get<Environment[]>(ENVIRONMENTS_KEY, []);
  }

  private async saveEnvironments(): Promise<void> {
    await this.context.globalState.update(ENVIRONMENTS_KEY, this.environments);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
