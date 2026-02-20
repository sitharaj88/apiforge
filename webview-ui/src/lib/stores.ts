import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { vscode } from './vscode-api';

// Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
  bodyType: BodyType;
  auth: {
    type: AuthType;
    basic?: { username: string; password: string };
    bearer?: { token: string };
    apiKey?: { key: string; value: string; addTo: 'header' | 'query' };
  };
  assertions?: { id: string; type: string; target: string; operator: string; value: string; enabled: boolean }[];
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: RequestConfig[];
  folders: Collection[];
}

export interface HistoryEntry {
  id: string;
  request: RequestConfig;
  response?: ResponseData;
  timestamp: number;
}

// Helper to generate unique IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Create default request
export function createDefaultRequest(): RequestConfig {
  return {
    id: generateId(),
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [{ id: generateId(), key: '', value: '', enabled: true }],
    params: [{ id: generateId(), key: '', value: '', enabled: true }],
    body: '',
    bodyType: 'none',
    auth: { type: 'none' },
  };
}

// Active request store
export const activeRequest: Writable<RequestConfig> = writable(createDefaultRequest());

// Response store
export const response: Writable<ResponseData | null> = writable(null);

// Loading state
export const isLoading: Writable<boolean> = writable(false);

// Error state
export const error: Writable<string | null> = writable(null);

// Collections store
export const collections: Writable<Collection[]> = writable([]);

// Environments store
export const environments: Writable<Environment[]> = writable([]);

// Active environment
export const activeEnvironmentId: Writable<string | null> = writable(null);

// Derived active environment
export const activeEnvironment: Readable<Environment | null> = derived(
  [environments, activeEnvironmentId],
  ([$environments, $activeEnvironmentId]) => {
    if (!$activeEnvironmentId) return null;
    return $environments.find((e) => e.id === $activeEnvironmentId) || null;
  }
);

// History store
export const history: Writable<HistoryEntry[]> = writable([]);

// Track source collection for the active request (for auto-update)
export const activeRequestSourceCollection: Writable<string | null> = writable(null);

// UI state
export const activeTab: Writable<'params' | 'headers' | 'body' | 'auth' | 'scripts' | 'assertions' | 'query'> = writable('params');
export const responseTab: Writable<'body' | 'headers' | 'cookies' | 'tests' | 'code'> = writable('body');

// State persistence
const persistedState = vscode.getState<{
  activeRequest?: RequestConfig;
  activeTab?: string;
  responseTab?: string;
}>();

if (persistedState) {
  if (persistedState.activeRequest) {
    activeRequest.set(persistedState.activeRequest);
  }
  if (persistedState.activeTab) {
    activeTab.set(persistedState.activeTab as 'params' | 'headers' | 'body' | 'auth' | 'scripts' | 'assertions' | 'query');
  }
  if (persistedState.responseTab) {
    responseTab.set(persistedState.responseTab as 'body' | 'headers' | 'cookies' | 'tests' | 'code');
  }
}

// Persist state on changes
activeRequest.subscribe((value) => {
  const currentState = vscode.getState<Record<string, unknown>>() || {};
  vscode.setState({ ...currentState, activeRequest: value });
});

activeTab.subscribe((value) => {
  const currentState = vscode.getState<Record<string, unknown>>() || {};
  vscode.setState({ ...currentState, activeTab: value });
});

responseTab.subscribe((value) => {
  const currentState = vscode.getState<Record<string, unknown>>() || {};
  vscode.setState({ ...currentState, responseTab: value });
});

// Actions
export function sendRequest(): void {
  let currentRequest: RequestConfig | undefined;
  activeRequest.subscribe((r) => (currentRequest = r))();

  if (!currentRequest || !currentRequest.url) {
    error.set('Please enter a URL');
    return;
  }

  isLoading.set(true);
  error.set(null);
  response.set(null);

  vscode.postMessage({
    type: 'sendRequest',
    payload: {
      id: currentRequest.id,
      method: currentRequest.method,
      url: currentRequest.url,
      headers: currentRequest.headers.filter((h) => h.enabled && h.key),
      params: currentRequest.params.filter((p) => p.enabled && p.key),
      body: currentRequest.bodyType !== 'none' ? currentRequest.body : undefined,
      bodyType: currentRequest.bodyType,
      auth: currentRequest.auth,
    },
  });
}

export function cancelRequest(): void {
  let currentRequest: RequestConfig | undefined;
  activeRequest.subscribe((r) => (currentRequest = r))();

  vscode.postMessage({
    type: 'cancelRequest',
    payload: { id: currentRequest?.id },
  });

  isLoading.set(false);
}

// Listen for response from extension
vscode.onMessage('response', (message) => {
  const msg = message as { type: string; payload: ResponseData & { requestId: string } };
  isLoading.set(false);
  response.set({
    status: msg.payload.status,
    statusText: msg.payload.statusText,
    headers: msg.payload.headers,
    body: msg.payload.body,
    time: msg.payload.time,
    size: msg.payload.size,
  });

  // Add to history
  let currentRequest: RequestConfig | undefined;
  activeRequest.subscribe((r) => (currentRequest = r))();

  if (currentRequest) {
    history.update((h) => [
      {
        id: generateId(),
        request: { ...currentRequest! },
        response: {
          status: msg.payload.status,
          statusText: msg.payload.statusText,
          headers: msg.payload.headers,
          body: msg.payload.body,
          time: msg.payload.time,
          size: msg.payload.size,
        },
        timestamp: Date.now(),
      },
      ...h.slice(0, 99), // Keep last 100 items
    ]);
  }
});

vscode.onMessage('error', (message) => {
  const msg = message as { type: string; payload: { message: string } };
  isLoading.set(false);
  error.set(msg.payload.message);
});

vscode.onMessage('collections', (message) => {
  const msg = message as { type: string; payload: { collections: Collection[] } };
  collections.set(msg.payload.collections);
});

vscode.onMessage('environments', (message) => {
  const msg = message as { type: string; payload: { environments: Environment[]; active?: string } };
  environments.set(msg.payload.environments);
  if (msg.payload.active) {
    activeEnvironmentId.set(msg.payload.active);
  }
});

// Load request from collection or history
vscode.onMessage('loadRequest', (message) => {
  const msg = message as { type: string; payload: RequestConfig & { collectionId?: string } };
  const request = msg.payload;
  // Ensure request has all required fields
  activeRequest.set({
    id: request.id || generateId(),
    name: request.name || 'Loaded Request',
    method: request.method || 'GET',
    url: request.url || '',
    headers: request.headers?.length ? request.headers : [{ id: generateId(), key: '', value: '', enabled: true }],
    params: request.params?.length ? request.params : [{ id: generateId(), key: '', value: '', enabled: true }],
    body: request.body || '',
    bodyType: request.bodyType || 'none',
    auth: request.auth || { type: 'none' },
  });
  // Track source collection for updates
  activeRequestSourceCollection.set(request.collectionId || null);
  // Clear previous response
  response.set(null);
  error.set(null);
});

// New request - reset to default
vscode.onMessage('newRequest', () => {
  activeRequest.set(createDefaultRequest());
  activeRequestSourceCollection.set(null);
  response.set(null);
  error.set(null);
});

// Update request in its source collection
export function updateRequestInCollection(): void {
  let currentRequest: RequestConfig | undefined;
  let collectionId: string | null = null;

  activeRequest.subscribe((r) => (currentRequest = r))();
  activeRequestSourceCollection.subscribe((id) => (collectionId = id))();

  if (currentRequest && collectionId) {
    vscode.postMessage({
      type: 'updateRequestInCollection',
      payload: {
        collectionId,
        request: currentRequest,
      },
    });
  }
}

// Debounced auto-save: whenever activeRequest changes and it belongs to a collection,
// automatically sync the changes back to the collection after a short idle period.
// This covers body, auth, and any other fields not covered by explicit on:change handlers.
let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

activeRequest.subscribe(() => {
  let collectionId: string | null = null;
  activeRequestSourceCollection.subscribe((id) => (collectionId = id))();
  if (!collectionId) return;

  if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    updateRequestInCollection();
  }, 800);
});

// Active environment changed from VS Code sidebar
vscode.onMessage('activeEnvironmentChanged', (message) => {
  const msg = message as { type: string; payload: { id: string | null } };
  activeEnvironmentId.set(msg.payload.id);
});

// History loaded from extension
vscode.onMessage('history', (message) => {
  const msg = message as { type: string; payload: { history: HistoryEntry[] } };
  history.set(msg.payload.history);
});

// ===== GraphQL Support =====
export const graphqlSchema: Writable<any> = writable(null);

export function sendGraphQLRequest(
  url: string,
  query: string,
  variables: string,
  operationName: string,
  headers: KeyValue[]
): void {
  isLoading.set(true);
  error.set(null);
  response.set(null);

  vscode.postMessage({
    type: 'sendGraphQLRequest',
    payload: {
      id: generateId(),
      url,
      query,
      variables,
      operationName,
      headers,
    },
  });
}

export function introspectGraphQL(url: string, headers?: Record<string, string>): void {
  vscode.postMessage({
    type: 'introspectGraphQL',
    payload: { url, headers },
  });
}

vscode.onMessage('graphqlSchema', (message) => {
  const msg = message as { type: string; payload: { schema: any } };
  graphqlSchema.set(msg.payload.schema);
});

// ===== WebSocket Support =====
export const wsStatus: Writable<'disconnected' | 'connecting' | 'connected' | 'error'> = writable('disconnected');
export const wsMessages: Writable<Array<{
  id: string;
  type: 'sent' | 'received' | 'system';
  data: string;
  timestamp: number;
  format?: 'text' | 'json' | 'binary';
}>> = writable([]);
export const wsError: Writable<string> = writable('');

export function wsConnect(url: string, headers: KeyValue[]): void {
  wsError.set('');
  vscode.postMessage({
    type: 'wsConnect',
    payload: { url, headers },
  });
}

export function wsDisconnect(): void {
  vscode.postMessage({
    type: 'wsDisconnect',
    payload: {},
  });
}

export function wsSend(data: string): void {
  vscode.postMessage({
    type: 'wsSend',
    payload: { data },
  });
}

export function wsPing(): void {
  vscode.postMessage({
    type: 'wsPing',
    payload: {},
  });
}

export function wsClearMessages(): void {
  wsMessages.set([]);
}

vscode.onMessage('wsMessage', (message) => {
  const msg = message as { type: string; payload: { id: string; type: 'sent' | 'received' | 'system'; data: string; timestamp: number; format?: string } };
  wsMessages.update(msgs => [...msgs, msg.payload as any]);
});

vscode.onMessage('wsStatus', (message) => {
  const msg = message as { type: string; payload: { status: 'disconnected' | 'connecting' | 'connected' | 'error'; error?: string } };
  wsStatus.set(msg.payload.status);
  if (msg.payload.error) {
    wsError.set(msg.payload.error);
  }
});

// ===== Import Support =====
export interface ImportResult {
  success: boolean;
  collections?: number;
  environments?: number;
  errors: string[];
  warnings?: string[];
}

export const importResult: Writable<ImportResult | null> = writable(null);

export function importFromCurl(curl: string): void {
  vscode.postMessage({
    type: 'importFromCurl',
    payload: { curl },
  });
}

export function importData(content: string, format?: string): void {
  vscode.postMessage({
    type: 'importData',
    payload: { content, format },
  });
}

vscode.onMessage('importResult', (message) => {
  const msg = message as { type: string; payload: ImportResult };
  importResult.set(msg.payload);
});

// ===== Script Support =====
export interface ScriptResult {
  success: boolean;
  logs: Array<{ level: string; message: string; timestamp: number }>;
  errors: string[];
  testResults: Array<{ name: string; passed: boolean; error?: string }>;
  envChanges: { set: Record<string, string>; unset: string[] };
  variableChanges: Record<string, string>;
  duration: number;
}

export const preScriptResult: Writable<ScriptResult | null> = writable(null);
export const postScriptResult: Writable<ScriptResult | null> = writable(null);

export function runPreScript(script: string, request: RequestConfig): void {
  vscode.postMessage({
    type: 'runPreScript',
    payload: { script, request },
  });
}

export function runPostScript(
  script: string,
  request: RequestConfig,
  responseData: { status: number; statusText: string; headers: Record<string, string>; body: string; time: number; size: number }
): void {
  vscode.postMessage({
    type: 'runPostScript',
    payload: { script, request, response: responseData },
  });
}

vscode.onMessage('preScriptResult', (message) => {
  const msg = message as { type: string; payload: { result: ScriptResult; modifiedRequest: RequestConfig } };
  preScriptResult.set(msg.payload.result);
  // Update request with modifications from script
  if (msg.payload.modifiedRequest) {
    activeRequest.set(msg.payload.modifiedRequest);
  }
});

vscode.onMessage('postScriptResult', (message) => {
  const msg = message as { type: string; payload: { result: ScriptResult } };
  postScriptResult.set(msg.payload.result);
});

// ===== Assertion Support =====
export interface Assertion {
  id: string;
  type: string;
  enabled: boolean;
  target?: string;
  expected?: string | number | boolean;
  comparator?: string;
  min?: number;
  max?: number;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual?: unknown;
  message: string;
}

export const assertionResults: Writable<AssertionResult[]> = writable([]);

export function runAssertions(
  assertions: Assertion[],
  responseData: { status: number; statusText: string; headers: Record<string, string>; body: string; time: number; size: number },
  requestId: string
): void {
  vscode.postMessage({
    type: 'runAssertions',
    payload: { assertions, response: responseData, requestId },
  });
}

vscode.onMessage('assertionResults', (message) => {
  const msg = message as { type: string; payload: { results: AssertionResult[] } };
  assertionResults.set(msg.payload.results);
});

// ===== OAuth 2.0 Support =====
export interface OAuth2Token {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
  expiresAt?: number;
}

export interface OAuth2Config {
  grantType: 'authorization_code' | 'authorization_code_pkce' | 'client_credentials' | 'password' | 'refresh_token';
  authorizationUrl?: string;
  tokenUrl: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  redirectUri?: string;
  username?: string;
  password?: string;
}

export const oauth2Token: Writable<OAuth2Token | null> = writable(null);
export const oauth2Loading: Writable<boolean> = writable(false);
export const oauth2Error: Writable<string | null> = writable(null);

export function getOAuth2Token(config: OAuth2Config, tokenKey: string): void {
  oauth2Loading.set(true);
  oauth2Error.set(null);
  vscode.postMessage({
    type: 'getOAuth2Token',
    payload: { config, tokenKey },
  });
}

export function refreshOAuth2Token(config: OAuth2Config, tokenKey: string): void {
  oauth2Loading.set(true);
  vscode.postMessage({
    type: 'refreshOAuth2Token',
    payload: { config, tokenKey },
  });
}

vscode.onMessage('oauth2Token', (message) => {
  const msg = message as { type: string; payload: { token: OAuth2Token; tokenKey: string } };
  oauth2Token.set(msg.payload.token);
  oauth2Loading.set(false);
});

vscode.onMessage('oauth2Error', (message) => {
  const msg = message as { type: string; payload: { message: string } };
  oauth2Error.set(msg.payload.message);
  oauth2Loading.set(false);
});

vscode.onMessage('oauth2TokenExpired', () => {
  oauth2Token.set(null);
  oauth2Loading.set(false);
});
