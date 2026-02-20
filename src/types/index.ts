/**
 * APIForge - Type Definitions
 */

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// Body Types
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

// Auth Types
export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'digest';

// Key-Value pair for headers, params, etc.
export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

// Basic Auth configuration
export interface BasicAuth {
  username: string;
  password: string;
}

// Bearer Token configuration
export interface BearerAuth {
  token: string;
  prefix?: string; // Default: "Bearer"
}

// API Key configuration
export interface ApiKeyAuth {
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

// OAuth 2.0 configuration
export interface OAuth2Auth {
  grantType: 'authorization_code' | 'client_credentials' | 'password' | 'implicit';
  authUrl?: string;
  tokenUrl?: string;
  clientId: string;
  clientSecret?: string;
  scope?: string;
  state?: string;
  pkce?: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

// Auth configuration
export interface AuthConfig {
  type: AuthType;
  basic?: BasicAuth;
  bearer?: BearerAuth;
  apiKey?: ApiKeyAuth;
  oauth2?: OAuth2Auth;
}

// Request configuration
export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body?: string;
  bodyType: BodyType;
  auth: AuthConfig;
  preRequestScript?: string;
  postResponseScript?: string;
  timeout?: number;
  folderId?: string;
  assertions?: Assertion[];
}

// Response data
export interface ResponseData {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  cookies?: Cookie[];
}

// Cookie
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// Environment
export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  isActive?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// Collection folder
export interface Folder {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: RequestConfig[];
}

// Collection
export interface Collection {
  id: string;
  name: string;
  description?: string;
  folders: Folder[];
  requests: RequestConfig[];
  variables?: KeyValue[];
  auth?: AuthConfig;
  preRequestScript?: string;
  created?: string;
  modified?: string;
  createdAt?: number;
  updatedAt?: number;
}

// History entry
export interface HistoryEntry {
  id: string;
  requestId?: string;
  request: RequestConfig;
  response?: ResponseData;
  timestamp: number;
  tags?: string[];
}

// Mock route
export interface MockRoute {
  id: string;
  method: HttpMethod;
  path: string;
  response: {
    status: number;
    headers: Record<string, string>;
    body: string;
    delay?: number;
  };
  enabled: boolean;
}

// Mock server configuration
export interface MockServer {
  id: string;
  name: string;
  port: number;
  routes: MockRoute[];
  enabled: boolean;
}

// Assertion
export interface Assertion {
  id: string;
  name: string;
  type: 'status' | 'header' | 'body' | 'jsonPath' | 'responseTime' | 'schema';
  target?: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'matches' | 'lessThan' | 'greaterThan' | 'exists';
  expected: unknown;
  enabled: boolean;
}

// Assertion result
export interface AssertionResult {
  assertionId: string;
  name: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  message: string;
}

// Extension configuration
export interface APIForgeConfig {
  defaultTimeout: number;
  maxHistoryItems: number;
  followRedirects: boolean;
  validateSSL: boolean;
  proxy?: {
    enabled: boolean;
    url?: string;
    auth?: {
      username: string;
      password: string;
    };
  };
  mockServer?: {
    port: number;
  };
}

// Message types for webview communication
export type WebviewMessage =
  | { type: 'sendRequest'; payload: RequestConfig }
  | { type: 'cancelRequest'; payload: { id: string } }
  | { type: 'saveCollection'; payload: Collection }
  | { type: 'loadCollections' }
  | { type: 'saveEnvironment'; payload: Environment }
  | { type: 'loadEnvironments' }
  | { type: 'setActiveEnvironment'; payload: { id: string | null } }
  | { type: 'clearHistory' }
  | { type: 'startMockServer'; payload: MockServer }
  | { type: 'stopMockServer'; payload: { id: string } }
  | { type: 'generateCode'; payload: { request: RequestConfig; language: string } };

export type ExtensionMessage =
  | { type: 'response'; payload: ResponseData }
  | { type: 'error'; payload: { requestId: string; message: string; code?: string } }
  | { type: 'collections'; payload: { collections: Collection[] } }
  | { type: 'environments'; payload: { environments: Environment[]; active?: string } }
  | { type: 'history'; payload: { history: HistoryEntry[] } }
  | { type: 'mockServerStarted'; payload: { id: string; port: number } }
  | { type: 'mockServerStopped'; payload: { id: string } }
  | { type: 'generatedCode'; payload: { code: string; language: string } };
