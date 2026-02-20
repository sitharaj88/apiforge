import * as vscode from 'vscode';
import type { HistoryEntry } from '../types';

const HISTORY_KEY = 'apiforge.history';

export class HistoryTreeProvider implements vscode.TreeDataProvider<HistoryEntry> {
  private _onDidChangeTreeData: vscode.EventEmitter<HistoryEntry | undefined | null | void> =
    new vscode.EventEmitter<HistoryEntry | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<HistoryEntry | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private history: HistoryEntry[] = [];
  private maxItems = 100;

  constructor(private context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('apiforge');
    this.maxItems = config.get<number>('maxHistoryItems', 100);
    this.loadHistory();
  }

  refresh(): void {
    this.loadHistory();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HistoryEntry): vscode.TreeItem {
    const request = element.request;
    const response = element.response;
    const timestamp = new Date(element.timestamp);

    const item = new vscode.TreeItem(
      `${request.method} ${this.truncateUrl(request.url)}`,
      vscode.TreeItemCollapsibleState.None
    );

    let description = this.formatTimestamp(timestamp);
    if (response) {
      description = `${response.status} • ${description}`;
    }
    item.description = description;

    if (response) {
      if (response.status >= 200 && response.status < 300) {
        item.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
      } else if (response.status >= 400) {
        item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
      } else {
        item.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('testing.iconQueued'));
      }
    } else {
      item.iconPath = new vscode.ThemeIcon('circle-outline');
    }

    item.tooltip = new vscode.MarkdownString(
      `**${request.method}** ${request.url}\n\n` +
      `Status: ${response?.status || 'N/A'}\n` +
      `Time: ${response?.time ? `${response.time}ms` : 'N/A'}\n` +
      `Date: ${timestamp.toLocaleString()}`
    );

    item.contextValue = 'historyEntry';

    item.command = {
      command: 'apiforge.openHistoryEntry',
      title: 'Open History Entry',
      arguments: [element],
    };

    return item;
  }

  getChildren(element?: HistoryEntry): Thenable<HistoryEntry[]> {
    if (!element) {
      return Promise.resolve(this.history);
    }
    return Promise.resolve([]);
  }

  addEntry(entry: HistoryEntry): void {
    this.history.unshift(entry);

    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    this.saveHistory();
    this._onDidChangeTreeData.fire();
  }

  clearHistory(): void {
    this.history = [];
    this.saveHistory();
    this._onDidChangeTreeData.fire();
    vscode.window.showInformationMessage('History cleared');
  }

  async deleteEntry(id: string): Promise<void> {
    this.history = this.history.filter(h => h.id !== id);
    await this.saveHistory();
    this._onDidChangeTreeData.fire();
  }

  private truncateUrl(url: string): string {
    const withoutProtocol = url.replace(/^https?:\/\//, '');
    if (withoutProtocol.length > 40) {
      return withoutProtocol.substring(0, 37) + '...';
    }
    return withoutProtocol;
  }

  private formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  private loadHistory(): void {
    // Use globalState with the same key as StorageService
    this.history = this.context.globalState.get<HistoryEntry[]>(HISTORY_KEY, []);
  }

  private async saveHistory(): Promise<void> {
    await this.context.globalState.update(HISTORY_KEY, this.history);
  }
}
