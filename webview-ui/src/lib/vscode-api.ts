/**
 * VS Code API wrapper for webview communication
 */

type MessageHandler = (message: unknown) => void;

class VSCodeAPIWrapper {
  private readonly vscodeApi: VsCodeApi | undefined;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();

  constructor() {
    if (typeof acquireVsCodeApi === 'function') {
      this.vscodeApi = acquireVsCodeApi();
    }

    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message && typeof message === 'object' && 'type' in message) {
        this.handleMessage(message);
      }
    });
  }

  /**
   * Post a message to the extension host
   */
  postMessage(message: { type: string; payload?: unknown }): void {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.log('[DEV] postMessage:', message);
    }
  }

  /**
   * Get the persisted state
   */
  getState<T>(): T | undefined {
    if (this.vscodeApi) {
      return this.vscodeApi.getState() as T | undefined;
    }
    // In development, try localStorage
    const state = localStorage.getItem('apiforge-state');
    return state ? JSON.parse(state) : undefined;
  }

  /**
   * Persist state
   */
  setState<T>(state: T): void {
    if (this.vscodeApi) {
      this.vscodeApi.setState(state);
    } else {
      // In development, use localStorage
      localStorage.setItem('apiforge-state', JSON.stringify(state));
    }
  }

  /**
   * Subscribe to messages of a specific type
   */
  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  private handleMessage(message: { type: string; [key: string]: unknown }): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Also notify wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message));
    }
  }
}

// Export singleton instance
export const vscode = new VSCodeAPIWrapper();

// Message types
export interface RequestMessage {
  type: 'sendRequest';
  payload: {
    id: string;
    method: string;
    url: string;
    headers: Array<{ key: string; value: string; enabled: boolean }>;
    body?: string;
    bodyType?: string;
  };
}

export interface ResponseMessage {
  type: 'response';
  payload: {
    requestId: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
  };
}

export interface ErrorMessage {
  type: 'error';
  payload: {
    requestId: string;
    message: string;
    code?: string;
  };
}

export interface CollectionsMessage {
  type: 'collections';
  payload: {
    collections: unknown[];
  };
}

export interface EnvironmentsMessage {
  type: 'environments';
  payload: {
    environments: unknown[];
    active?: string;
  };
}
