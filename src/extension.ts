import * as vscode from 'vscode';
import { APIForgePanel } from './providers/WebviewProvider';
import { CollectionTreeProvider } from './providers/CollectionTreeProvider';
import { EnvironmentTreeProvider } from './providers/EnvironmentTreeProvider';
import { HistoryTreeProvider } from './providers/HistoryTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('APIForge extension is now active!');

  // Initialize tree providers
  const collectionProvider = new CollectionTreeProvider(context);
  const environmentProvider = new EnvironmentTreeProvider(context);
  const historyProvider = new HistoryTreeProvider(context);

  // Register tree views
  const collectionView = vscode.window.createTreeView('apiforge.collections', {
    treeDataProvider: collectionProvider,
    showCollapseAll: true,
  });

  const environmentView = vscode.window.createTreeView('apiforge.environments', {
    treeDataProvider: environmentProvider,
  });

  const historyView = vscode.window.createTreeView('apiforge.history', {
    treeDataProvider: historyProvider,
  });

  // Set tree providers for bidirectional sync between VS Code sidebar and webview
  APIForgePanel.setTreeProviders({
    collections: collectionProvider,
    environments: environmentProvider,
    history: historyProvider,
  });

  // Register commands
  const openPanelCommand = vscode.commands.registerCommand('apiforge.openPanel', () => {
    APIForgePanel.createOrShow(context);
  });

  const newRequestCommand = vscode.commands.registerCommand('apiforge.newRequest', () => {
    const panel = APIForgePanel.createOrShow(context);
    panel.postMessage({ type: 'newRequest' });
  });

  const newCollectionCommand = vscode.commands.registerCommand('apiforge.newCollection', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter collection name',
      placeHolder: 'My Collection',
    });

    if (name) {
      collectionProvider.createCollection(name);
    }
  });

  const refreshCollectionsCommand = vscode.commands.registerCommand('apiforge.refreshCollections', () => {
    collectionProvider.refresh();
  });

  const clearHistoryCommand = vscode.commands.registerCommand('apiforge.clearHistory', async () => {
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to clear all history?',
      { modal: true },
      'Clear'
    );

    if (confirm === 'Clear') {
      historyProvider.clearHistory();
    }
  });

  const importOpenAPICommand = vscode.commands.registerCommand('apiforge.importOpenAPI', async () => {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'OpenAPI files': ['json', 'yaml', 'yml'],
      },
      title: 'Select OpenAPI/Swagger file',
    });

    if (uri && uri[0]) {
      vscode.window.showInformationMessage(`Import from ${uri[0].fsPath} - Coming soon!`);
    }
  });

  const importPostmanCommand = vscode.commands.registerCommand('apiforge.importPostman', async () => {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Postman files': ['json'],
      },
      title: 'Select Postman Collection file',
    });

    if (uri && uri[0]) {
      vscode.window.showInformationMessage(`Import from ${uri[0].fsPath} - Coming soon!`);
    }
  });

  const exportOpenAPICommand = vscode.commands.registerCommand('apiforge.exportOpenAPI', () => {
    vscode.window.showInformationMessage('Export to OpenAPI - Coming soon!');
  });

  const startMockServerCommand = vscode.commands.registerCommand('apiforge.startMockServer', () => {
    vscode.window.showInformationMessage('Mock Server - Coming soon!');
  });

  const stopMockServerCommand = vscode.commands.registerCommand('apiforge.stopMockServer', () => {
    vscode.window.showInformationMessage('Mock Server stopped');
  });

  // Open request from collection tree
  const openRequestCommand = vscode.commands.registerCommand('apiforge.openRequest', (request) => {
    const panel = APIForgePanel.createOrShow(context);
    panel.postMessage({ type: 'loadRequest', payload: request });
  });

  // Open history entry
  const openHistoryEntryCommand = vscode.commands.registerCommand('apiforge.openHistoryEntry', (entry) => {
    const panel = APIForgePanel.createOrShow(context);
    panel.postMessage({ type: 'loadRequest', payload: entry.request });
  });

  // Set active environment
  const setActiveEnvironmentCommand = vscode.commands.registerCommand('apiforge.setActiveEnvironment', (id: string) => {
    environmentProvider.setActiveEnvironment(id);
    const panel = APIForgePanel.currentPanel;
    if (panel) {
      panel.postMessage({ type: 'activeEnvironmentChanged', payload: { id } });
    }
  });

  // New environment
  const newEnvironmentCommand = vscode.commands.registerCommand('apiforge.newEnvironment', async () => {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter environment name',
      placeHolder: 'Development',
    });

    if (name) {
      environmentProvider.createEnvironment(name);
    }
  });

  // Delete collection
  const deleteCollectionCommand = vscode.commands.registerCommand('apiforge.deleteCollection', async (collection) => {
    const confirm = await vscode.window.showWarningMessage(
      `Delete collection "${collection.name}"?`,
      { modal: true },
      'Delete'
    );

    if (confirm === 'Delete') {
      collectionProvider.deleteCollection(collection.id);
    }
  });

  // Delete request from collection (placeholder - complex with current structure)
  const deleteRequestCommand = vscode.commands.registerCommand('apiforge.deleteRequest', async (request) => {
    vscode.window.showInformationMessage('Use the webview panel to delete requests from collections');
  });

  // Delete environment
  const deleteEnvironmentCommand = vscode.commands.registerCommand('apiforge.deleteEnvironment', async (environment) => {
    const confirm = await vscode.window.showWarningMessage(
      `Delete environment "${environment.name}"?`,
      { modal: true },
      'Delete'
    );

    if (confirm === 'Delete') {
      environmentProvider.deleteEnvironment(environment.id);
    }
  });

  // Delete history entry
  const deleteHistoryEntryCommand = vscode.commands.registerCommand('apiforge.deleteHistoryEntry', (entry) => {
    historyProvider.deleteEntry(entry.id);
  });

  // Add to subscriptions
  context.subscriptions.push(
    collectionView,
    environmentView,
    historyView,
    openPanelCommand,
    newRequestCommand,
    newCollectionCommand,
    refreshCollectionsCommand,
    clearHistoryCommand,
    importOpenAPICommand,
    importPostmanCommand,
    exportOpenAPICommand,
    startMockServerCommand,
    stopMockServerCommand,
    openRequestCommand,
    openHistoryEntryCommand,
    setActiveEnvironmentCommand,
    newEnvironmentCommand,
    deleteCollectionCommand,
    deleteRequestCommand,
    deleteEnvironmentCommand,
    deleteHistoryEntryCommand
  );

  // Auto-open panel if workspace contains .apiforge
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    const apiforgeFolder = vscode.Uri.joinPath(workspaceFolders[0].uri, '.apiforge');
    vscode.workspace.fs.stat(apiforgeFolder).then(
      () => {
        // .apiforge folder exists
        console.log('APIForge workspace detected');
      },
      () => {
        // .apiforge folder doesn't exist - that's fine
      }
    );
  }
}

export function deactivate() {
  console.log('APIForge extension is now deactivated');
}
