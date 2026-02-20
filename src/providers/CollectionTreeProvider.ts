import * as vscode from 'vscode';
import type { Collection, Folder, RequestConfig } from '../types';

const COLLECTIONS_KEY = 'apiforge.collections';

type TreeItemType = Collection | Folder | (RequestConfig & { collectionId?: string });

export class CollectionTreeProvider implements vscode.TreeDataProvider<TreeItemType> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItemType | undefined | null | void> =
    new vscode.EventEmitter<TreeItemType | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItemType | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private collections: Collection[] = [];
  private requestToCollectionMap: Map<string, string> = new Map();

  constructor(private context: vscode.ExtensionContext) {
    this.loadCollections();
  }

  refresh(): void {
    this.loadCollections();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeItemType): vscode.TreeItem {
    if (this.isCollection(element)) {
      return this.getCollectionTreeItem(element);
    } else if (this.isFolder(element)) {
      return this.getFolderTreeItem(element);
    } else {
      const requestWithCollection = element as RequestConfig & { collectionId?: string };
      return this.getRequestTreeItem(requestWithCollection, requestWithCollection.collectionId);
    }
  }

  getChildren(element?: TreeItemType): Thenable<TreeItemType[]> {
    if (!element) {
      // Build request to collection mapping
      this.requestToCollectionMap.clear();
      for (const collection of this.collections) {
        this.mapRequestsToCollection(collection, collection.id);
      }
      return Promise.resolve(this.collections);
    }

    if (this.isCollection(element)) {
      const children: TreeItemType[] = [
        ...element.folders,
        ...element.requests.map(r => ({ ...r, collectionId: element.id })),
      ];
      return Promise.resolve(children);
    }

    if (this.isFolder(element)) {
      // For folders, we need to find the parent collection
      const collectionId = this.findCollectionIdForFolder(element);
      const children: TreeItemType[] = [
        ...element.folders,
        ...element.requests.map(r => ({ ...r, collectionId })),
      ];
      return Promise.resolve(children);
    }

    return Promise.resolve([]);
  }

  private mapRequestsToCollection(item: Collection | Folder, collectionId: string): void {
    for (const request of item.requests) {
      this.requestToCollectionMap.set(request.id, collectionId);
    }
    for (const folder of item.folders) {
      this.mapRequestsToCollection(folder, collectionId);
    }
  }

  private findCollectionIdForFolder(folder: Folder): string | undefined {
    for (const collection of this.collections) {
      if (this.folderExistsIn(collection, folder.id)) {
        return collection.id;
      }
    }
    return undefined;
  }

  private folderExistsIn(item: Collection | Folder, folderId: string): boolean {
    for (const f of item.folders) {
      if (f.id === folderId) return true;
      if (this.folderExistsIn(f, folderId)) return true;
    }
    return false;
  }

  getParent(element: TreeItemType): vscode.ProviderResult<TreeItemType> {
    return null;
  }

  async createCollection(name: string): Promise<void> {
    const collection: Collection = {
      id: this.generateId(),
      name,
      description: '',
      folders: [],
      requests: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    this.collections.push(collection);
    await this.saveCollections();
    this._onDidChangeTreeData.fire();

    vscode.window.showInformationMessage(`Collection "${name}" created`);
  }

  async deleteCollection(id: string): Promise<void> {
    this.collections = this.collections.filter(c => c.id !== id);
    await this.saveCollections();
    this._onDidChangeTreeData.fire();
  }

  private isCollection(item: TreeItemType): item is Collection {
    return 'created' in item && 'modified' in item;
  }

  private isFolder(item: TreeItemType): item is Folder {
    return 'folders' in item && 'requests' in item && !('created' in item);
  }

  private getCollectionTreeItem(collection: Collection): vscode.TreeItem {
    const hasChildren = collection.folders.length > 0 || collection.requests.length > 0;
    const item = new vscode.TreeItem(
      collection.name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'collection';
    item.iconPath = new vscode.ThemeIcon('folder-library');
    item.tooltip = collection.description || collection.name;

    return item;
  }

  private getFolderTreeItem(folder: Folder): vscode.TreeItem {
    const hasChildren = folder.folders.length > 0 || folder.requests.length > 0;
    const item = new vscode.TreeItem(
      folder.name,
      hasChildren
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'folder';
    item.iconPath = new vscode.ThemeIcon('folder');
    item.tooltip = folder.description || folder.name;

    return item;
  }

  private getRequestTreeItem(request: RequestConfig, collectionId?: string): vscode.TreeItem {
    const item = new vscode.TreeItem(request.name, vscode.TreeItemCollapsibleState.None);

    item.contextValue = 'request';
    item.description = request.method;
    item.tooltip = `${request.method} ${request.url}`;

    const methodColors: Record<string, string> = {
      GET: 'symbolMethod',
      POST: 'symbolEvent',
      PUT: 'symbolProperty',
      PATCH: 'symbolInterface',
      DELETE: 'symbolVariable',
      HEAD: 'symbolConstant',
      OPTIONS: 'symbolEnumMember',
    };

    item.iconPath = new vscode.ThemeIcon(
      methodColors[request.method] || 'symbolMethod'
    );

    item.command = {
      command: 'apiforge.openRequest',
      title: 'Open Request',
      arguments: [{ ...request, collectionId }],
    };

    return item;
  }

  private loadCollections(): void {
    // Use globalState with the same key as StorageService
    this.collections = this.context.globalState.get<Collection[]>(COLLECTIONS_KEY, []);
  }

  private async saveCollections(): Promise<void> {
    await this.context.globalState.update(COLLECTIONS_KEY, this.collections);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
