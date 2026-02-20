import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { Collection, Environment, HistoryEntry, RequestConfig } from '../types';

const COLLECTIONS_KEY = 'apiforge.collections';
const ENVIRONMENTS_KEY = 'apiforge.environments';
const ACTIVE_ENV_KEY = 'apiforge.activeEnvironment';
const HISTORY_KEY = 'apiforge.history';
const MAX_HISTORY_ITEMS = 100;

export class StorageService {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  // ============ Collections ============

  async getCollections(): Promise<Collection[]> {
    return this.context.globalState.get<Collection[]>(COLLECTIONS_KEY, []);
  }

  async saveCollection(collection: Collection): Promise<Collection> {
    const collections = await this.getCollections();
    const index = collections.findIndex(c => c.id === collection.id);

    const now = new Date().toISOString();
    if (index >= 0) {
      collection.modified = now;
      collections[index] = collection;
    } else {
      collection.id = collection.id || uuidv4();
      collection.created = now;
      collection.modified = now;
      collections.push(collection);
    }

    await this.context.globalState.update(COLLECTIONS_KEY, collections);
    return collection;
  }

  async deleteCollection(id: string): Promise<void> {
    const collections = await this.getCollections();
    const filtered = collections.filter(c => c.id !== id);
    await this.context.globalState.update(COLLECTIONS_KEY, filtered);
  }

  async addRequestToCollection(collectionId: string, request: RequestConfig, folderId?: string): Promise<Collection | null> {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) return null;

    request.id = request.id || uuidv4();

    if (folderId) {
      const folder = this.findFolder(collection.folders, folderId);
      if (folder) {
        folder.requests.push(request);
      }
    } else {
      collection.requests.push(request);
    }

    collection.modified = new Date().toISOString();
    await this.context.globalState.update(COLLECTIONS_KEY, collections);
    return collection;
  }

  async updateRequestInCollection(collectionId: string, request: RequestConfig): Promise<Collection | null> {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) return null;

    // Find and update the request
    const updateInArray = (requests: RequestConfig[]): boolean => {
      const index = requests.findIndex(r => r.id === request.id);
      if (index >= 0) {
        requests[index] = request;
        return true;
      }
      return false;
    };

    if (!updateInArray(collection.requests)) {
      // Search in folders
      for (const folder of collection.folders) {
        if (this.updateRequestInFolders(folder, request)) break;
      }
    }

    collection.modified = new Date().toISOString();
    await this.context.globalState.update(COLLECTIONS_KEY, collections);
    return collection;
  }

  async deleteRequestFromCollection(collectionId: string, requestId: string): Promise<Collection | null> {
    const collections = await this.getCollections();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) return null;

    collection.requests = collection.requests.filter(r => r.id !== requestId);

    // Also check folders
    const deleteFromFolders = (folders: Collection['folders']): void => {
      for (const folder of folders) {
        folder.requests = folder.requests.filter(r => r.id !== requestId);
        deleteFromFolders(folder.folders);
      }
    };
    deleteFromFolders(collection.folders);

    collection.modified = new Date().toISOString();
    await this.context.globalState.update(COLLECTIONS_KEY, collections);
    return collection;
  }

  private findFolder(folders: Collection['folders'], id: string): Collection['folders'][0] | null {
    for (const folder of folders) {
      if (folder.id === id) return folder;
      const found = this.findFolder(folder.folders, id);
      if (found) return found;
    }
    return null;
  }

  private updateRequestInFolders(folder: Collection['folders'][0], request: RequestConfig): boolean {
    const index = folder.requests.findIndex(r => r.id === request.id);
    if (index >= 0) {
      folder.requests[index] = request;
      return true;
    }
    for (const subFolder of folder.folders) {
      if (this.updateRequestInFolders(subFolder, request)) return true;
    }
    return false;
  }

  // ============ Environments ============

  async getEnvironments(): Promise<Environment[]> {
    return this.context.globalState.get<Environment[]>(ENVIRONMENTS_KEY, []);
  }

  async getActiveEnvironmentId(): Promise<string | null> {
    return this.context.globalState.get<string | null>(ACTIVE_ENV_KEY, null);
  }

  async setActiveEnvironment(id: string | null): Promise<void> {
    await this.context.globalState.update(ACTIVE_ENV_KEY, id);
  }

  async getActiveEnvironment(): Promise<Environment | null> {
    const id = await this.getActiveEnvironmentId();
    if (!id) return null;
    const environments = await this.getEnvironments();
    return environments.find(e => e.id === id) || null;
  }

  async saveEnvironment(environment: Environment): Promise<Environment> {
    const environments = await this.getEnvironments();
    const index = environments.findIndex(e => e.id === environment.id);

    if (index >= 0) {
      environments[index] = environment;
    } else {
      environment.id = environment.id || uuidv4();
      environments.push(environment);
    }

    await this.context.globalState.update(ENVIRONMENTS_KEY, environments);
    return environment;
  }

  async deleteEnvironment(id: string): Promise<void> {
    const environments = await this.getEnvironments();
    const filtered = environments.filter(e => e.id !== id);
    await this.context.globalState.update(ENVIRONMENTS_KEY, filtered);

    // If deleted env was active, clear active
    const activeId = await this.getActiveEnvironmentId();
    if (activeId === id) {
      await this.setActiveEnvironment(null);
    }
  }

  // ============ History ============

  async getHistory(): Promise<HistoryEntry[]> {
    return this.context.globalState.get<HistoryEntry[]>(HISTORY_KEY, []);
  }

  async addToHistory(request: RequestConfig, response?: any): Promise<HistoryEntry> {
    const history = await this.getHistory();

    const entry: HistoryEntry = {
      id: uuidv4(),
      request: { ...request },
      response,
      timestamp: Date.now(),
    };

    // Add to beginning
    history.unshift(entry);

    // Limit history size
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }

    await this.context.globalState.update(HISTORY_KEY, history);
    return entry;
  }

  async clearHistory(): Promise<void> {
    await this.context.globalState.update(HISTORY_KEY, []);
  }

  async deleteHistoryEntry(id: string): Promise<void> {
    const history = await this.getHistory();
    const filtered = history.filter(h => h.id !== id);
    await this.context.globalState.update(HISTORY_KEY, filtered);
  }

  // ============ Quick Create ============

  createNewCollection(name: string): Collection {
    return {
      id: uuidv4(),
      name,
      description: '',
      folders: [],
      requests: [],
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    };
  }

  createNewEnvironment(name: string): Environment {
    return {
      id: uuidv4(),
      name,
      variables: [{ id: uuidv4(), key: '', value: '', enabled: true }],
    };
  }

  createNewRequest(name: string = 'New Request'): RequestConfig {
    return {
      id: uuidv4(),
      name,
      method: 'GET',
      url: '',
      headers: [{ id: uuidv4(), key: '', value: '', enabled: true }],
      params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
      bodyType: 'none',
      auth: { type: 'none' },
    };
  }
}
