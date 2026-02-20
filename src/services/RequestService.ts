import * as vscode from 'vscode';
import axios, { AxiosRequestConfig, AxiosError, CancelTokenSource } from 'axios';
import type { RequestConfig, ResponseData, KeyValue, Environment } from '../types';
import { StorageService } from './StorageService';

export class RequestService {
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private context: vscode.ExtensionContext;
  private storageService: StorageService;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.storageService = new StorageService(context);
  }

  async sendRequest(request: RequestConfig): Promise<ResponseData> {
    // Create cancel token
    const cancelSource = axios.CancelToken.source();
    this.cancelTokens.set(request.id, cancelSource);

    const config = vscode.workspace.getConfiguration('apiforge');
    const timeout = request.timeout || config.get<number>('defaultTimeout', 30000);
    const followRedirects = config.get<boolean>('followRedirects', true);
    const validateSSL = config.get<boolean>('validateSSL', true);

    // Get active environment for variable substitution
    const activeEnv = await this.storageService.getActiveEnvironment();

    // Apply variable interpolation to the request
    const interpolatedRequest = this.interpolateRequest(request, activeEnv);

    // Build URL with query params
    const url = this.buildUrl(interpolatedRequest.url, interpolatedRequest.params);

    // Build headers
    const headers = this.buildHeaders(interpolatedRequest);

    // Build axios config
    const axiosConfig: AxiosRequestConfig = {
      method: interpolatedRequest.method.toLowerCase() as AxiosRequestConfig['method'],
      url,
      headers,
      timeout,
      maxRedirects: followRedirects ? 5 : 0,
      validateStatus: () => true, // Don't throw on any status
      cancelToken: cancelSource.token,
      // SSL validation
      ...(validateSSL ? {} : { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }),
    };

    // Add body if applicable
    if (interpolatedRequest.bodyType !== 'none' && interpolatedRequest.body) {
      if (interpolatedRequest.bodyType === 'json') {
        try {
          axiosConfig.data = JSON.parse(interpolatedRequest.body);
        } catch {
          axiosConfig.data = interpolatedRequest.body;
        }
      } else if (interpolatedRequest.bodyType === 'form-data') {
        // Parse form data from JSON and create FormData
        try {
          const formItems = JSON.parse(interpolatedRequest.body);
          if (Array.isArray(formItems)) {
            const formData = new (require('form-data'))();
            for (const item of formItems) {
              if (item.enabled !== false && item.key) {
                formData.append(item.key, item.value || '');
              }
            }
            axiosConfig.data = formData;
            axiosConfig.headers = { ...axiosConfig.headers, ...formData.getHeaders() };
          }
        } catch {
          // If not valid JSON, send as-is
          axiosConfig.data = interpolatedRequest.body;
        }
      } else if (interpolatedRequest.bodyType === 'x-www-form-urlencoded') {
        // Parse form data from JSON and create URL encoded string
        try {
          const formItems = JSON.parse(interpolatedRequest.body);
          if (Array.isArray(formItems)) {
            const params = new URLSearchParams();
            for (const item of formItems) {
              if (item.enabled !== false && item.key) {
                params.append(item.key, item.value || '');
              }
            }
            axiosConfig.data = params.toString();
            if (!headers['Content-Type'] && !headers['content-type']) {
              axiosConfig.headers = { ...axiosConfig.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
            }
          }
        } catch {
          // If not valid JSON, send as-is
          axiosConfig.data = interpolatedRequest.body;
        }
      } else if (interpolatedRequest.bodyType === 'binary') {
        // Handle binary file upload
        try {
          const binaryData = JSON.parse(interpolatedRequest.body);
          if (binaryData.type === 'binary' && binaryData.base64) {
            // Convert base64 to Buffer
            axiosConfig.data = Buffer.from(binaryData.base64, 'base64');
            // Set content type from file MIME type if not already set
            if (!headers['Content-Type'] && !headers['content-type']) {
              axiosConfig.headers = { ...axiosConfig.headers, 'Content-Type': binaryData.mimeType || 'application/octet-stream' };
            }
          }
        } catch {
          // If not valid JSON, send as-is
          axiosConfig.data = interpolatedRequest.body;
        }
      } else {
        axiosConfig.data = interpolatedRequest.body;
      }
    }

    // Handle proxy
    const proxyEnabled = config.get<boolean>('proxy.enabled', false);
    if (proxyEnabled) {
      const proxyUrl = config.get<string>('proxy.url', '');
      if (proxyUrl) {
        const proxyParsed = new URL(proxyUrl);
        axiosConfig.proxy = {
          host: proxyParsed.hostname,
          port: parseInt(proxyParsed.port) || 80,
          protocol: proxyParsed.protocol.replace(':', ''),
        };
      }
    }

    const startTime = Date.now();

    try {
      const response = await axios(axiosConfig);
      const endTime = Date.now();

      // Convert headers to simple object
      const responseHeaders: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
      });

      // Calculate response size
      let body: string;
      if (typeof response.data === 'object') {
        body = JSON.stringify(response.data, null, 2);
      } else {
        body = String(response.data);
      }
      const size = new TextEncoder().encode(body).length;

      return {
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        time: endTime - startTime,
        size,
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }

      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused: ${url}`);
      }
      if (axiosError.code === 'ENOTFOUND') {
        throw new Error(`Host not found: ${new URL(url).hostname}`);
      }
      if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }

      throw error;
    } finally {
      this.cancelTokens.delete(request.id);
    }
  }

  cancelRequest(requestId: string): void {
    const cancelSource = this.cancelTokens.get(requestId);
    if (cancelSource) {
      cancelSource.cancel('Request cancelled by user');
      this.cancelTokens.delete(requestId);
    }
  }

  private buildUrl(baseUrl: string, params: KeyValue[]): string {
    // Ensure URL has protocol
    let url = baseUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Add query params
    const enabledParams = params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const urlObj = new URL(url);
      enabledParams.forEach((param) => {
        urlObj.searchParams.append(param.key, param.value);
      });
      url = urlObj.toString();
    }

    return url;
  }

  private buildHeaders(request: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add enabled headers
    request.headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        headers[h.key] = h.value;
      });

    // Add content-type if body is present
    if (request.bodyType !== 'none' && request.body) {
      if (request.bodyType === 'json' && !headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      } else if (request.bodyType === 'x-www-form-urlencoded' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    // Add authentication headers
    if (request.auth) {
      switch (request.auth.type) {
        case 'basic':
          if (request.auth.basic) {
            const credentials = Buffer.from(
              `${request.auth.basic.username}:${request.auth.basic.password}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${credentials}`;
          }
          break;

        case 'bearer':
          if (request.auth.bearer?.token) {
            const prefix = request.auth.bearer.prefix || 'Bearer';
            headers['Authorization'] = `${prefix} ${request.auth.bearer.token}`;
          }
          break;

        case 'api-key':
          if (request.auth.apiKey && request.auth.apiKey.addTo === 'header') {
            headers[request.auth.apiKey.key] = request.auth.apiKey.value;
          }
          break;
      }
    }

    // Add user-agent
    if (!headers['User-Agent'] && !headers['user-agent']) {
      headers['User-Agent'] = 'APIForge/0.1.0';
    }

    return headers;
  }

  /**
   * Interpolate environment variables in a string.
   * Variables are in the format {{variableName}}
   */
  private interpolateString(text: string, env: Environment | null): string {
    if (!env || !text) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const variable = env.variables.find(v => v.key === key && v.enabled);
      return variable?.value ?? match; // Keep original if not found
    });
  }

  /**
   * Apply variable interpolation to all parts of a request
   */
  private interpolateRequest(request: RequestConfig, env: Environment | null): RequestConfig {
    if (!env) return request;

    // Deep clone to avoid mutating the original
    const interpolated: RequestConfig = JSON.parse(JSON.stringify(request));

    // Interpolate URL
    interpolated.url = this.interpolateString(interpolated.url, env);

    // Interpolate headers
    interpolated.headers = interpolated.headers.map(h => ({
      ...h,
      key: this.interpolateString(h.key, env),
      value: this.interpolateString(h.value, env),
    }));

    // Interpolate params
    interpolated.params = interpolated.params.map(p => ({
      ...p,
      key: this.interpolateString(p.key, env),
      value: this.interpolateString(p.value, env),
    }));

    // Interpolate body
    if (interpolated.body) {
      interpolated.body = this.interpolateString(interpolated.body, env);
    }

    // Interpolate auth
    if (interpolated.auth) {
      if (interpolated.auth.basic) {
        interpolated.auth.basic.username = this.interpolateString(interpolated.auth.basic.username, env);
        interpolated.auth.basic.password = this.interpolateString(interpolated.auth.basic.password, env);
      }
      if (interpolated.auth.bearer) {
        interpolated.auth.bearer.token = this.interpolateString(interpolated.auth.bearer.token, env);
        if (interpolated.auth.bearer.prefix) {
          interpolated.auth.bearer.prefix = this.interpolateString(interpolated.auth.bearer.prefix, env);
        }
      }
      if (interpolated.auth.apiKey) {
        interpolated.auth.apiKey.key = this.interpolateString(interpolated.auth.apiKey.key, env);
        interpolated.auth.apiKey.value = this.interpolateString(interpolated.auth.apiKey.value, env);
      }
    }

    return interpolated;
  }
}
