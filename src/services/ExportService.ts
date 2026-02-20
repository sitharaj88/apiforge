import type { Collection, RequestConfig, Environment } from '../types';

export type ExportFormat = 'openapi' | 'postman' | 'markdown';

export class ExportService {
  /**
   * Export collection to specified format
   */
  export(collection: Collection, format: ExportFormat, environment?: Environment): string {
    switch (format) {
      case 'openapi':
        return this.exportOpenAPI(collection);
      case 'postman':
        return this.exportPostman(collection, environment);
      case 'markdown':
        return this.exportMarkdown(collection);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to OpenAPI 3.0 specification
   */
  private exportOpenAPI(collection: Collection): string {
    const spec: any = {
      openapi: '3.0.3',
      info: {
        title: collection.name,
        description: collection.description || '',
        version: '1.0.0',
      },
      servers: [],
      paths: {},
    };

    // Extract unique base URLs
    const baseUrls = new Set<string>();
    for (const request of collection.requests) {
      try {
        const url = new URL(request.url);
        baseUrls.add(`${url.protocol}//${url.host}`);
      } catch {
        // Invalid URL, skip
      }
    }

    spec.servers = Array.from(baseUrls).map((url) => ({ url }));

    // Group requests by path
    const pathMap = new Map<string, RequestConfig[]>();
    for (const request of collection.requests) {
      try {
        const url = new URL(request.url);
        const path = url.pathname || '/';
        if (!pathMap.has(path)) {
          pathMap.set(path, []);
        }
        pathMap.get(path)!.push(request);
      } catch {
        // Invalid URL, skip
      }
    }

    // Build paths
    for (const [path, requests] of pathMap) {
      spec.paths[path] = {};

      for (const request of requests) {
        const method = request.method.toLowerCase();
        const operation: any = {
          summary: request.name,
          operationId: this.generateOperationId(request),
          parameters: [],
          responses: {
            '200': {
              description: 'Successful response',
            },
          },
        };

        // Add headers as parameters
        for (const header of request.headers) {
          if (header.enabled && header.key) {
            operation.parameters.push({
              name: header.key,
              in: 'header',
              required: false,
              schema: { type: 'string' },
              example: header.value,
            });
          }
        }

        // Add query params
        for (const param of request.params) {
          if (param.enabled && param.key) {
            operation.parameters.push({
              name: param.key,
              in: 'query',
              required: false,
              schema: { type: 'string' },
              example: param.value,
            });
          }
        }

        // Add request body
        if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
          operation.requestBody = {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          };

          try {
            const bodyJson = JSON.parse(request.body);
            operation.requestBody.content['application/json'].example = bodyJson;
          } catch {
            // Not valid JSON
          }
        }

        // Add security if auth is configured
        if (request.auth?.type !== 'none') {
          operation.security = [{ [request.auth!.type]: [] }];
        }

        spec.paths[path][method] = operation;
      }
    }

    return JSON.stringify(spec, null, 2);
  }

  private generateOperationId(request: RequestConfig): string {
    const method = request.method.toLowerCase();
    const name = request.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return `${method}_${name}`;
  }

  /**
   * Export to Postman Collection v2.1
   */
  private exportPostman(collection: Collection, environment?: Environment): string {
    const postmanCollection: any = {
      info: {
        _postman_id: collection.id,
        name: collection.name,
        description: collection.description || '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: [],
    };

    // Build folder structure
    const folderMap = new Map<string, any>();
    for (const folder of collection.folders) {
      folderMap.set(folder.id, {
        name: folder.name,
        item: [],
      });
    }

    // Add requests to folders or root
    for (const request of collection.requests) {
      const postmanRequest = this.createPostmanRequest(request);

      if (request.folderId && folderMap.has(request.folderId)) {
        folderMap.get(request.folderId)!.item.push(postmanRequest);
      } else {
        postmanCollection.item.push(postmanRequest);
      }
    }

    // Add folders to collection
    for (const folder of folderMap.values()) {
      postmanCollection.item.push(folder);
    }

    // Add variables from environment
    if (environment) {
      postmanCollection.variable = environment.variables
        .filter((v) => v.enabled && v.key)
        .map((v) => ({
          key: v.key,
          value: v.value,
          type: 'string',
        }));
    }

    return JSON.stringify(postmanCollection, null, 2);
  }

  private createPostmanRequest(request: RequestConfig): any {
    const postmanRequest: any = {
      name: request.name,
      request: {
        method: request.method,
        header: request.headers
          .filter((h) => h.key)
          .map((h) => ({
            key: h.key,
            value: h.value,
            disabled: !h.enabled,
          })),
        url: {
          raw: request.url,
          query: request.params
            .filter((p) => p.key)
            .map((p) => ({
              key: p.key,
              value: p.value,
              disabled: !p.enabled,
            })),
        },
      },
    };

    // Add body
    if (request.body) {
      postmanRequest.request.body = {
        mode: 'raw',
        raw: request.body,
        options: {
          raw: {
            language: request.bodyType === 'json' ? 'json' : 'text',
          },
        },
      };
    }

    // Add auth
    if (request.auth && request.auth.type !== 'none') {
      postmanRequest.request.auth = this.createPostmanAuth(request.auth);
    }

    return postmanRequest;
  }

  private createPostmanAuth(auth: RequestConfig['auth']): any {
    if (!auth) return { type: 'noauth' };

    switch (auth.type) {
      case 'basic':
        return {
          type: 'basic',
          basic: [
            { key: 'username', value: auth.basic?.username || '', type: 'string' },
            { key: 'password', value: auth.basic?.password || '', type: 'string' },
          ],
        };
      case 'bearer':
        return {
          type: 'bearer',
          bearer: [{ key: 'token', value: auth.bearer?.token || '', type: 'string' }],
        };
      case 'apiKey':
        return {
          type: 'apikey',
          apikey: [
            { key: 'key', value: auth.apiKey?.key || '', type: 'string' },
            { key: 'value', value: auth.apiKey?.value || '', type: 'string' },
            { key: 'in', value: auth.apiKey?.addTo || 'header', type: 'string' },
          ],
        };
      default:
        return { type: 'noauth' };
    }
  }

  /**
   * Export to Markdown documentation
   */
  private exportMarkdown(collection: Collection): string {
    const lines: string[] = [];

    lines.push(`# ${collection.name}`);
    lines.push('');

    if (collection.description) {
      lines.push(collection.description);
      lines.push('');
    }

    lines.push('## Endpoints');
    lines.push('');

    // Group by folders
    const folderMap = new Map<string | undefined, RequestConfig[]>();
    for (const request of collection.requests) {
      const folderId = request.folderId;
      if (!folderMap.has(folderId)) {
        folderMap.set(folderId, []);
      }
      folderMap.get(folderId)!.push(request);
    }

    // Root level requests
    const rootRequests = folderMap.get(undefined) || [];
    for (const request of rootRequests) {
      lines.push(this.formatRequestMarkdown(request));
    }

    // Folder requests
    for (const folder of collection.folders) {
      const folderRequests = folderMap.get(folder.id) || [];
      if (folderRequests.length > 0) {
        lines.push(`### ${folder.name}`);
        lines.push('');
        for (const request of folderRequests) {
          lines.push(this.formatRequestMarkdown(request));
        }
      }
    }

    return lines.join('\n');
  }

  private formatRequestMarkdown(request: RequestConfig): string {
    const lines: string[] = [];

    lines.push(`#### ${request.name}`);
    lines.push('');
    lines.push(`\`${request.method} ${request.url}\``);
    lines.push('');

    // Headers
    const enabledHeaders = request.headers.filter((h) => h.enabled && h.key);
    if (enabledHeaders.length > 0) {
      lines.push('**Headers:**');
      lines.push('');
      lines.push('| Key | Value |');
      lines.push('| --- | --- |');
      for (const header of enabledHeaders) {
        lines.push(`| ${header.key} | ${header.value} |`);
      }
      lines.push('');
    }

    // Query Params
    const enabledParams = request.params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      lines.push('**Query Parameters:**');
      lines.push('');
      lines.push('| Key | Value |');
      lines.push('| --- | --- |');
      for (const param of enabledParams) {
        lines.push(`| ${param.key} | ${param.value} |`);
      }
      lines.push('');
    }

    // Body
    if (request.body) {
      lines.push('**Body:**');
      lines.push('');
      lines.push('```json');
      lines.push(request.body);
      lines.push('```');
      lines.push('');
    }

    // Auth
    if (request.auth && request.auth.type !== 'none') {
      lines.push(`**Authentication:** ${request.auth.type}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Export environment to Postman format
   */
  exportEnvironment(environment: Environment): string {
    const postmanEnv = {
      id: environment.id,
      name: environment.name,
      values: environment.variables
        .filter((v) => v.key)
        .map((v) => ({
          key: v.key,
          value: v.value,
          enabled: v.enabled,
          type: 'default',
        })),
      _postman_variable_scope: 'environment',
    };

    return JSON.stringify(postmanEnv, null, 2);
  }
}

export const exportService = new ExportService();
