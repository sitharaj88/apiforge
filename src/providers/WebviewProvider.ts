import * as vscode from 'vscode';
import { RequestService } from '../services/RequestService';
import { codeGeneratorService } from '../services/CodeGeneratorService';
import { StorageService } from '../services/StorageService';
import { graphqlService, type GraphQLRequest } from '../services/GraphQLService';
import { webSocketService, type WebSocketMessage } from '../services/WebSocketService';
import { importService, type ImportFormat } from '../services/ImportService';
import { exportService, type ExportFormat } from '../services/ExportService';
import { assertionService, type Assertion } from '../services/AssertionService';
import { scriptService } from '../services/ScriptService';
import { oauth2Service, type OAuth2Config } from '../services/OAuth2Service';
import type { WebviewMessage, RequestConfig, Collection, Environment, KeyValue } from '../types';
import type { CollectionTreeProvider } from './CollectionTreeProvider';
import type { EnvironmentTreeProvider } from './EnvironmentTreeProvider';
import type { HistoryTreeProvider } from './HistoryTreeProvider';

interface TreeProviders {
  collections: CollectionTreeProvider;
  environments: EnvironmentTreeProvider;
  history: HistoryTreeProvider;
}

export class APIForgePanel {
  public static currentPanel: APIForgePanel | undefined;
  public static readonly viewType = 'apiforge.mainPanel';
  private static _treeProviders: TreeProviders | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _requestService: RequestService;
  private readonly _storageService: StorageService;
  private _disposables: vscode.Disposable[] = [];
  private _wsConnectionId: string | null = null;

  public static setTreeProviders(providers: TreeProviders) {
    APIForgePanel._treeProviders = providers;
  }

  public static createOrShow(context: vscode.ExtensionContext): APIForgePanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (APIForgePanel.currentPanel) {
      APIForgePanel.currentPanel._panel.reveal(column);
      return APIForgePanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      APIForgePanel.viewType,
      'APIForge',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist'),
          vscode.Uri.joinPath(context.extensionUri, 'media'),
        ],
      }
    );

    APIForgePanel.currentPanel = new APIForgePanel(panel, context);
    return APIForgePanel.currentPanel;
  }

  public static revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    APIForgePanel.currentPanel = new APIForgePanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._extensionUri = context.extensionUri;
    this._requestService = new RequestService(context);
    this._storageService = new StorageService(context);

    // Initialize OAuth2 service with secret storage
    oauth2Service.setSecretStorage(context.secrets);

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this._handleMessage(message),
      null,
      this._disposables
    );

    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables
    );
  }

  public postMessage(message: { type: string; payload?: unknown }) {
    this._panel.webview.postMessage(message);
  }

  public dispose() {
    APIForgePanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _refreshTreeViews(type: 'collections' | 'environments' | 'history' | 'all') {
    if (!APIForgePanel._treeProviders) return;

    if (type === 'all' || type === 'collections') {
      APIForgePanel._treeProviders.collections.refresh();
    }
    if (type === 'all' || type === 'environments') {
      APIForgePanel._treeProviders.environments.refresh();
    }
    if (type === 'all' || type === 'history') {
      APIForgePanel._treeProviders.history.refresh();
    }
  }

  private async _handleMessage(message: WebviewMessage) {
    switch (message.type) {
      case 'sendRequest':
        await this._sendRequest(message.payload);
        break;

      case 'cancelRequest':
        this._requestService.cancelRequest(message.payload.id);
        break;

      case 'loadCollections':
        await this._loadCollections();
        break;

      case 'saveCollection':
        await this._saveCollection(message.payload);
        break;

      case 'loadEnvironments':
        await this._loadEnvironments();
        break;

      case 'saveEnvironment':
        await this._saveEnvironment(message.payload);
        break;

      case 'setActiveEnvironment':
        await this._setActiveEnvironment(message.payload.id);
        break;

      case 'clearHistory':
        await this._clearHistory();
        break;

      case 'generateCode':
        this._generateCode(message.payload);
        break;

      case 'createCollection' as any:
        await this._createCollection((message as any).payload);
        break;

      case 'deleteCollection' as any:
        await this._deleteCollection((message as any).payload.id);
        break;

      case 'saveRequestToCollection' as any:
        await this._saveRequestToCollection((message as any).payload);
        break;

      case 'deleteRequest' as any:
        await this._deleteRequest((message as any).payload);
        break;

      case 'createEnvironment' as any:
        await this._createEnvironment((message as any).payload);
        break;

      case 'deleteEnvironment' as any:
        await this._deleteEnvironment((message as any).payload.id);
        break;

      case 'loadHistory' as any:
        await this._loadHistory();
        break;

      case 'deleteHistoryEntry' as any:
        await this._deleteHistoryEntry((message as any).payload.id);
        break;

      case 'updateRequestInCollection' as any:
        await this._updateRequestInCollection((message as any).payload);
        break;

      case 'renameRequest' as any:
        await this._renameRequest((message as any).payload);
        break;

      case 'renameCollection' as any:
        await this._renameCollection((message as any).payload);
        break;

      // GraphQL
      case 'sendGraphQLRequest' as any:
        await this._sendGraphQLRequest((message as any).payload);
        break;

      case 'introspectGraphQL' as any:
        await this._introspectGraphQL((message as any).payload);
        break;

      // WebSocket
      case 'wsConnect' as any:
        this._wsConnect((message as any).payload);
        break;

      case 'wsDisconnect' as any:
        this._wsDisconnect();
        break;

      case 'wsSend' as any:
        this._wsSend((message as any).payload);
        break;

      case 'wsPing' as any:
        this._wsPing();
        break;

      // Import
      case 'importData' as any:
        await this._importData((message as any).payload);
        break;

      case 'importFromCurl' as any:
        await this._importFromCurl((message as any).payload);
        break;

      // Scripts and Assertions
      case 'runPreScript' as any:
        await this._runPreScript((message as any).payload);
        break;

      case 'runPostScript' as any:
        await this._runPostScript((message as any).payload);
        break;

      case 'runAssertions' as any:
        await this._runAssertions((message as any).payload);
        break;

      // OAuth 2.0
      case 'getOAuth2Token' as any:
        await this._getOAuth2Token((message as any).payload);
        break;

      case 'refreshOAuth2Token' as any:
        await this._refreshOAuth2Token((message as any).payload);
        break;

      // Export
      case 'export' as any:
        await this._exportCollection((message as any).payload);
        break;

      // Test Runner
      case 'runCollectionTests' as any:
        await this._runCollectionTests((message as any).payload);
        break;

      case 'stopCollectionTests' as any:
        this._stopCollectionTests();
        break;

      default:
        console.log('Unknown message type:', message);
    }
  }

  private async _sendRequest(request: RequestConfig) {
    try {
      const response = await this._requestService.sendRequest(request);

      await this._storageService.addToHistory(request, response);

      this.postMessage({
        type: 'response',
        payload: response,
      });

      await this._loadHistory();
      this._refreshTreeViews('history');
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: {
          requestId: request.id,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: error instanceof Error && 'code' in error ? String((error as NodeJS.ErrnoException).code) : undefined,
        },
      });
    }
  }

  private async _loadCollections() {
    const collections = await this._storageService.getCollections();
    this.postMessage({
      type: 'collections',
      payload: { collections },
    });
  }

  private async _saveCollection(collection: Collection) {
    await this._storageService.saveCollection(collection);
    await this._loadCollections();
    this._refreshTreeViews('collections');
  }

  private async _createCollection(payload: { name: string }) {
    const collection = this._storageService.createNewCollection(payload.name);
    await this._storageService.saveCollection(collection);
    await this._loadCollections();
    this._refreshTreeViews('collections');
    this.postMessage({
      type: 'collectionCreated',
      payload: { collection },
    });
  }

  private async _deleteCollection(id: string) {
    await this._storageService.deleteCollection(id);
    await this._loadCollections();
    this._refreshTreeViews('collections');
  }

  private async _saveRequestToCollection(payload: { collectionId: string; request: RequestConfig; folderId?: string }) {
    const collection = await this._storageService.addRequestToCollection(
      payload.collectionId,
      payload.request,
      payload.folderId
    );
    if (collection) {
      await this._loadCollections();
      this._refreshTreeViews('collections');
      this.postMessage({
        type: 'requestSaved',
        payload: { collection, request: payload.request },
      });
    }
  }

  private async _deleteRequest(payload: { collectionId: string; requestId: string }) {
    await this._storageService.deleteRequestFromCollection(payload.collectionId, payload.requestId);
    await this._loadCollections();
    this._refreshTreeViews('collections');
  }

  private async _updateRequestInCollection(payload: { collectionId: string; request: RequestConfig }) {
    const collection = await this._storageService.updateRequestInCollection(
      payload.collectionId,
      payload.request
    );
    if (collection) {
      await this._loadCollections();
      this._refreshTreeViews('collections');
      this.postMessage({
        type: 'requestUpdated',
        payload: { collection, request: payload.request },
      });
    }
  }

  private async _renameRequest(payload: { collectionId: string; requestId: string; name: string }) {
    const collection = await this._storageService.renameRequestInCollection(
      payload.collectionId,
      payload.requestId,
      payload.name
    );
    if (collection) {
      await this._loadCollections();
      this._refreshTreeViews('collections');
    }
  }

  private async _renameCollection(payload: { id: string; name: string }) {
    await this._storageService.renameCollection(payload.id, payload.name);
    await this._loadCollections();
    this._refreshTreeViews('collections');
  }

  private async _loadEnvironments() {
    const environments = await this._storageService.getEnvironments();
    const activeId = await this._storageService.getActiveEnvironmentId();
    this.postMessage({
      type: 'environments',
      payload: { environments, active: activeId },
    });
  }

  private async _saveEnvironment(environment: Environment) {
    await this._storageService.saveEnvironment(environment);
    await this._loadEnvironments();
    this._refreshTreeViews('environments');
  }

  private async _createEnvironment(payload: { name: string }) {
    const environment = this._storageService.createNewEnvironment(payload.name);
    await this._storageService.saveEnvironment(environment);
    await this._loadEnvironments();
    this._refreshTreeViews('environments');
    this.postMessage({
      type: 'environmentCreated',
      payload: { environment },
    });
  }

  private async _deleteEnvironment(id: string) {
    await this._storageService.deleteEnvironment(id);
    await this._loadEnvironments();
    this._refreshTreeViews('environments');
  }

  private async _setActiveEnvironment(id: string | null) {
    await this._storageService.setActiveEnvironment(id);
    await this._loadEnvironments();
    this._refreshTreeViews('environments');
  }

  private async _loadHistory() {
    const history = await this._storageService.getHistory();
    this.postMessage({
      type: 'history',
      payload: { history },
    });
  }

  private async _clearHistory() {
    await this._storageService.clearHistory();
    await this._loadHistory();
    this._refreshTreeViews('history');
  }

  private async _deleteHistoryEntry(id: string) {
    await this._storageService.deleteHistoryEntry(id);
    await this._loadHistory();
    this._refreshTreeViews('history');
  }

  private _generateCode(payload: { request: RequestConfig; language: string }) {
    try {
      const code = codeGeneratorService.generate(payload.request, {
        language: payload.language as any,
        prettyPrint: true,
      });
      this.postMessage({
        type: 'generatedCode',
        payload: { code, language: payload.language },
      });
    } catch (error) {
      this.postMessage({
        type: 'generatedCode',
        payload: {
          code: `// Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}`,
          language: payload.language,
        },
      });
    }
  }

  // GraphQL methods
  private async _sendGraphQLRequest(payload: {
    id: string;
    url: string;
    query: string;
    variables?: string;
    operationName?: string;
    headers: KeyValue[];
  }) {
    try {
      let variables: Record<string, unknown> | undefined;
      if (payload.variables) {
        try {
          variables = JSON.parse(payload.variables);
        } catch {
          // Invalid JSON, ignore variables
        }
      }

      const request: GraphQLRequest = {
        id: payload.id,
        url: payload.url,
        query: payload.query,
        variables,
        operationName: payload.operationName,
        headers: payload.headers.filter(h => h.enabled && h.key).map(h => ({
          key: h.key,
          value: h.value,
          enabled: h.enabled,
        })),
      };

      const response = await graphqlService.execute(request);

      this.postMessage({
        type: 'response',
        payload: response,
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: {
          requestId: payload.id,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      });
    }
  }

  private async _introspectGraphQL(payload: { url: string; headers?: Record<string, string> }) {
    try {
      const schema = await graphqlService.introspect(payload.url, payload.headers);
      this.postMessage({
        type: 'graphqlSchema',
        payload: { schema },
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: {
          message: `Schema introspection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    }
  }

  // WebSocket methods
  private _wsConnect(payload: { url: string; headers: KeyValue[] }) {
    this._wsConnectionId = `ws-${Date.now()}`;

    webSocketService.connect(
      this._wsConnectionId,
      payload.url,
      payload.headers,
      (message: WebSocketMessage) => {
        this.postMessage({
          type: 'wsMessage',
          payload: message,
        });
      },
      (status, error) => {
        this.postMessage({
          type: 'wsStatus',
          payload: { status, error },
        });
      }
    );
  }

  private _wsDisconnect() {
    if (this._wsConnectionId) {
      webSocketService.disconnect(this._wsConnectionId);
      this._wsConnectionId = null;
    }
  }

  private _wsSend(payload: { data: string }) {
    if (this._wsConnectionId) {
      webSocketService.send(this._wsConnectionId, payload.data);
    }
  }

  private _wsPing() {
    if (this._wsConnectionId) {
      webSocketService.ping(this._wsConnectionId);
    }
  }

  // Import methods
  private async _importData(payload: { content: string; format?: ImportFormat }) {
    try {
      const format = payload.format || importService.detectFormat(payload.content);
      if (!format) {
        this.postMessage({
          type: 'importResult',
          payload: { success: false, errors: ['Could not detect import format'] },
        });
        return;
      }

      const result = await importService.import(payload.content, format);

      // Save imported collections
      for (const collection of result.collections) {
        await this._storageService.saveCollection(collection);
      }

      // Save imported environments
      for (const environment of result.environments) {
        await this._storageService.saveEnvironment(environment);
      }

      await this._loadCollections();
      await this._loadEnvironments();
      this._refreshTreeViews('all');

      this.postMessage({
        type: 'importResult',
        payload: {
          success: result.errors.length === 0,
          collections: result.collections.length,
          environments: result.environments.length,
          errors: result.errors,
          warnings: result.warnings,
        },
      });
    } catch (error) {
      this.postMessage({
        type: 'importResult',
        payload: {
          success: false,
          errors: [error instanceof Error ? error.message : 'Import failed'],
        },
      });
    }
  }

  private async _importFromCurl(payload: { curl: string }) {
    await this._importData({ content: payload.curl, format: 'curl' });
  }

  // Export methods
  private async _exportCollection(payload: {
    collectionId: string;
    format: ExportFormat;
    environmentId?: string;
  }) {
    try {
      const collections = await this._storageService.getCollections();
      const collection = collections.find((c) => c.id === payload.collectionId);

      if (!collection) {
        this.postMessage({
          type: 'exportResult',
          payload: { success: false, error: 'Collection not found' },
        });
        return;
      }

      let environment: Environment | undefined;
      if (payload.environmentId) {
        const environments = await this._storageService.getEnvironments();
        environment = environments.find((e) => e.id === payload.environmentId);
      }

      const exportedData = exportService.export(collection, payload.format, environment);

      this.postMessage({
        type: 'exportResult',
        payload: { success: true, data: exportedData },
      });
    } catch (error) {
      this.postMessage({
        type: 'exportResult',
        payload: {
          success: false,
          error: error instanceof Error ? error.message : 'Export failed',
        },
      });
    }
  }

  // Script methods
  private async _runPreScript(payload: {
    script: string;
    request: RequestConfig;
  }) {
    try {
      const activeEnv = await this._storageService.getActiveEnvironment();
      const { result, modifiedRequest } = await scriptService.executePreScript(
        payload.script,
        payload.request,
        activeEnv
      );

      this.postMessage({
        type: 'preScriptResult',
        payload: {
          result,
          modifiedRequest,
        },
      });
    } catch (error) {
      this.postMessage({
        type: 'preScriptResult',
        payload: {
          result: {
            success: false,
            logs: [],
            errors: [error instanceof Error ? error.message : 'Script execution failed'],
            testResults: [],
            envChanges: { set: {}, unset: [] },
            variableChanges: {},
            duration: 0,
          },
          modifiedRequest: payload.request,
        },
      });
    }
  }

  private async _runPostScript(payload: {
    script: string;
    request: RequestConfig;
    response: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
      time: number;
      size: number;
    };
  }) {
    try {
      const activeEnv = await this._storageService.getActiveEnvironment();
      const result = await scriptService.executePostScript(
        payload.script,
        payload.request,
        {
          requestId: payload.request.id,
          ...payload.response,
        },
        activeEnv
      );

      // Apply environment changes
      if (activeEnv && (Object.keys(result.envChanges.set).length > 0 || result.envChanges.unset.length > 0)) {
        for (const [key, value] of Object.entries(result.envChanges.set)) {
          const existing = activeEnv.variables.find(v => v.key === key);
          if (existing) {
            existing.value = value;
          } else {
            activeEnv.variables.push({
              id: Math.random().toString(36).substring(2, 11),
              key,
              value,
              enabled: true,
            });
          }
        }
        for (const key of result.envChanges.unset) {
          activeEnv.variables = activeEnv.variables.filter(v => v.key !== key);
        }
        await this._storageService.saveEnvironment(activeEnv);
        await this._loadEnvironments();
      }

      this.postMessage({
        type: 'postScriptResult',
        payload: { result },
      });
    } catch (error) {
      this.postMessage({
        type: 'postScriptResult',
        payload: {
          result: {
            success: false,
            logs: [],
            errors: [error instanceof Error ? error.message : 'Script execution failed'],
            testResults: [],
            envChanges: { set: {}, unset: [] },
            variableChanges: {},
            duration: 0,
          },
        },
      });
    }
  }

  // Assertion methods
  private async _runAssertions(payload: {
    assertions: Assertion[];
    response: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body: string;
      time: number;
      size: number;
    };
    requestId: string;
  }) {
    const results = assertionService.runAssertions(payload.assertions, {
      requestId: payload.requestId,
      ...payload.response,
    });

    this.postMessage({
      type: 'assertionResults',
      payload: { results },
    });
  }

  // OAuth 2.0 methods
  private async _getOAuth2Token(payload: {
    config: OAuth2Config;
    tokenKey: string;
  }) {
    try {
      let token;

      switch (payload.config.grantType) {
        case 'authorization_code':
        case 'authorization_code_pkce':
          // Open browser for authorization
          const authUrl = oauth2Service.buildAuthorizationUrl({
            ...payload.config,
            redirectUri: payload.config.redirectUri || 'http://localhost:9876/callback',
            state: oauth2Service.generateRandomString(),
          });
          await vscode.env.openExternal(vscode.Uri.parse(authUrl));
          token = await oauth2Service.startAuthorizationCodeFlow(payload.config);
          break;

        case 'client_credentials':
          token = await oauth2Service.getClientCredentialsToken(payload.config);
          break;

        case 'password':
          token = await oauth2Service.getPasswordToken(payload.config);
          break;

        case 'refresh_token':
          token = await oauth2Service.refreshAccessToken(payload.config);
          break;

        default:
          throw new Error(`Unsupported grant type: ${payload.config.grantType}`);
      }

      await oauth2Service.storeToken(payload.tokenKey, token);

      this.postMessage({
        type: 'oauth2Token',
        payload: { token, tokenKey: payload.tokenKey },
      });
    } catch (error) {
      this.postMessage({
        type: 'oauth2Error',
        payload: {
          message: error instanceof Error ? error.message : 'OAuth2 authentication failed',
        },
      });
    }
  }

  private async _refreshOAuth2Token(payload: {
    config: OAuth2Config;
    tokenKey: string;
  }) {
    try {
      const token = await oauth2Service.getValidToken(payload.tokenKey, payload.config);
      if (token) {
        this.postMessage({
          type: 'oauth2Token',
          payload: { token, tokenKey: payload.tokenKey },
        });
      } else {
        this.postMessage({
          type: 'oauth2TokenExpired',
          payload: { tokenKey: payload.tokenKey },
        });
      }
    } catch (error) {
      this.postMessage({
        type: 'oauth2Error',
        payload: {
          message: error instanceof Error ? error.message : 'Token refresh failed',
        },
      });
    }
  }

  // Test Runner
  private _testRunnerAbortController: AbortController | null = null;

  private async _runCollectionTests(payload: {
    collectionId: string;
    environmentId?: string;
  }) {
    const collections = await this._storageService.getCollections();
    const collection = collections.find((c) => c.id === payload.collectionId);

    if (!collection) {
      this.postMessage({ type: 'testComplete', payload: { error: 'Collection not found' } });
      return;
    }

    const requestsWithAssertions = collection.requests.filter(
      (r) => r.assertions && r.assertions.length > 0
    );

    this._testRunnerAbortController = new AbortController();

    for (const request of requestsWithAssertions) {
      if (this._testRunnerAbortController.signal.aborted) {
        break;
      }

      // Send running status
      this.postMessage({
        type: 'testProgress',
        payload: {
          requestId: request.id,
          status: 'running',
          assertions: [],
        },
      });

      try {
        // Execute the request
        const response = await this._requestService.sendRequest(request);

        // Run assertions
        const assertionResults = await assertionService.runAssertions(
          request.assertions || [],
          {
            requestId: response.requestId,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            body: response.body,
            time: response.time,
            size: response.size,
          }
        );

        const allPassed = assertionResults.every((r) => r.passed);

        this.postMessage({
          type: 'testProgress',
          payload: {
            requestId: request.id,
            status: allPassed ? 'passed' : 'failed',
            duration: response.time,
            statusCode: response.status,
            assertions: assertionResults.map((r) => ({
              name: r.name,
              passed: r.passed,
              message: r.message,
            })),
          },
        });
      } catch (error) {
        this.postMessage({
          type: 'testProgress',
          payload: {
            requestId: request.id,
            status: 'error',
            assertions: [],
            error: error instanceof Error ? error.message : 'Request failed',
          },
        });
      }
    }

    this._testRunnerAbortController = null;
    this.postMessage({ type: 'testComplete', payload: {} });
  }

  private _stopCollectionTests() {
    if (this._testRunnerAbortController) {
      this._testRunnerAbortController.abort();
      this._testRunnerAbortController = null;
    }
  }

  private _update() {
    this._panel.title = 'APIForge';
    this._panel.iconPath = {
      light: vscode.Uri.joinPath(this._extensionUri, 'media', 'apiforge-icon.svg'),
      dark: vscode.Uri.joinPath(this._extensionUri, 'media', 'apiforge-icon.svg'),
    };
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    const extensionUri = this._extensionUri;

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'webview.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource}; connect-src https: http:;">
  <link href="${styleUri}" rel="stylesheet">
  <title>APIForge</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
