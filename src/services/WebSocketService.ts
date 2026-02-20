import WebSocket from 'ws';
import type { KeyValue } from '../types';

export interface WebSocketMessage {
  id: string;
  type: 'sent' | 'received' | 'system';
  data: string;
  timestamp: number;
  format?: 'text' | 'json' | 'binary';
}

export interface WebSocketConnection {
  id: string;
  url: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  messages: WebSocketMessage[];
  error?: string;
}

type MessageCallback = (message: WebSocketMessage) => void;
type StatusCallback = (status: WebSocketConnection['status'], error?: string) => void;

export class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private messageCallbacks: Map<string, MessageCallback> = new Map();
  private statusCallbacks: Map<string, StatusCallback> = new Map();

  /**
   * Connect to a WebSocket server
   */
  connect(
    connectionId: string,
    url: string,
    headers?: KeyValue[],
    onMessage?: MessageCallback,
    onStatus?: StatusCallback
  ): void {
    // Close existing connection if any
    this.disconnect(connectionId);

    if (onMessage) {
      this.messageCallbacks.set(connectionId, onMessage);
    }
    if (onStatus) {
      this.statusCallbacks.set(connectionId, onStatus);
    }

    // Build headers object
    const wsHeaders: Record<string, string> = {};
    headers?.filter(h => h.enabled && h.key).forEach(h => {
      wsHeaders[h.key] = h.value;
    });

    // Notify connecting status
    this.notifyStatus(connectionId, 'connecting');

    try {
      const ws = new WebSocket(url, { headers: wsHeaders });

      ws.on('open', () => {
        this.notifyStatus(connectionId, 'connected');
        this.notifyMessage(connectionId, {
          id: this.generateId(),
          type: 'system',
          data: `Connected to ${url}`,
          timestamp: Date.now(),
        });
      });

      ws.on('message', (data: WebSocket.Data) => {
        let messageData: string;
        let format: 'text' | 'json' | 'binary' = 'text';

        if (Buffer.isBuffer(data)) {
          messageData = data.toString('utf-8');
          format = 'binary';
        } else if (data instanceof ArrayBuffer) {
          messageData = Buffer.from(data).toString('utf-8');
          format = 'binary';
        } else {
          messageData = data.toString();
        }

        // Try to detect JSON
        try {
          JSON.parse(messageData);
          format = 'json';
        } catch {
          // Not JSON
        }

        this.notifyMessage(connectionId, {
          id: this.generateId(),
          type: 'received',
          data: messageData,
          timestamp: Date.now(),
          format,
        });
      });

      ws.on('close', (code, reason) => {
        this.notifyStatus(connectionId, 'disconnected');
        this.notifyMessage(connectionId, {
          id: this.generateId(),
          type: 'system',
          data: `Disconnected (code: ${code}${reason ? `, reason: ${reason}` : ''})`,
          timestamp: Date.now(),
        });
        this.connections.delete(connectionId);
      });

      ws.on('error', (error) => {
        this.notifyStatus(connectionId, 'error', error.message);
        this.notifyMessage(connectionId, {
          id: this.generateId(),
          type: 'system',
          data: `Error: ${error.message}`,
          timestamp: Date.now(),
        });
      });

      ws.on('ping', () => {
        this.notifyMessage(connectionId, {
          id: this.generateId(),
          type: 'system',
          data: 'Ping received',
          timestamp: Date.now(),
        });
      });

      ws.on('pong', () => {
        this.notifyMessage(connectionId, {
          id: this.generateId(),
          type: 'system',
          data: 'Pong received',
          timestamp: Date.now(),
        });
      });

      this.connections.set(connectionId, ws);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.notifyStatus(connectionId, 'error', errorMessage);
    }
  }

  /**
   * Disconnect from a WebSocket server
   */
  disconnect(connectionId: string): void {
    const ws = this.connections.get(connectionId);
    if (ws) {
      ws.close(1000, 'User disconnected');
      this.connections.delete(connectionId);
    }
    this.messageCallbacks.delete(connectionId);
    this.statusCallbacks.delete(connectionId);
  }

  /**
   * Send a message through the WebSocket
   */
  send(connectionId: string, data: string): boolean {
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    ws.send(data);

    // Detect format
    let format: 'text' | 'json' | 'binary' = 'text';
    try {
      JSON.parse(data);
      format = 'json';
    } catch {
      // Not JSON
    }

    this.notifyMessage(connectionId, {
      id: this.generateId(),
      type: 'sent',
      data,
      timestamp: Date.now(),
      format,
    });

    return true;
  }

  /**
   * Send a ping
   */
  ping(connectionId: string): boolean {
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    ws.ping();
    this.notifyMessage(connectionId, {
      id: this.generateId(),
      type: 'system',
      data: 'Ping sent',
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get connection status
   */
  getStatus(connectionId: string): WebSocketConnection['status'] {
    const ws = this.connections.get(connectionId);
    if (!ws) return 'disconnected';

    switch (ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Check if connected
   */
  isConnected(connectionId: string): boolean {
    const ws = this.connections.get(connectionId);
    return ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    for (const connectionId of this.connections.keys()) {
      this.disconnect(connectionId);
    }
  }

  private notifyMessage(connectionId: string, message: WebSocketMessage): void {
    const callback = this.messageCallbacks.get(connectionId);
    if (callback) {
      callback(message);
    }
  }

  private notifyStatus(connectionId: string, status: WebSocketConnection['status'], error?: string): void {
    const callback = this.statusCallbacks.get(connectionId);
    if (callback) {
      callback(status, error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}

export const webSocketService = new WebSocketService();
