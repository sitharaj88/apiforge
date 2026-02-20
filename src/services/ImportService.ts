import type { Collection, RequestConfig, Environment, HttpMethod, KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type ImportFormat = 'openapi' | 'postman' | 'curl' | 'har' | 'thunder';

export interface ImportResult {
  collections: Collection[];
  environments: Environment[];
  errors: string[];
  warnings: string[];
}

export class ImportService {
  /**
   * Import from any supported format
   */
  async import(content: string, format: ImportFormat): Promise<ImportResult> {
    switch (format) {
      case 'openapi':
        return this.importOpenAPI(content);
      case 'postman':
        return this.importPostman(content);
      case 'curl':
        return this.importCurl(content);
      case 'har':
        return this.importHar(content);
      default:
        return { collections: [], environments: [], errors: [`Unsupported format: ${format}`], warnings: [] };
    }
  }

  /**
   * Detect import format from content
   */
  detectFormat(content: string): ImportFormat | null {
    try {
      const trimmed = content.trim();

      // Check if it's a cURL command
      if (trimmed.startsWith('curl ')) {
        return 'curl';
      }

      // Try to parse as JSON
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const json = JSON.parse(trimmed);

        // Check for OpenAPI
        if (json.openapi || json.swagger) {
          return 'openapi';
        }

        // Check for Postman collection
        if (json.info && json.info._postman_id) {
          return 'postman';
        }

        // Check for HAR
        if (json.log && json.log.entries) {
          return 'har';
        }
      }

      // Check for YAML OpenAPI
      if (trimmed.includes('openapi:') || trimmed.includes('swagger:')) {
        return 'openapi';
      }
    } catch {
      // Not valid JSON
    }

    return null;
  }

  /**
   * Import OpenAPI 3.0/3.1 specification
   */
  private async importOpenAPI(content: string): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const collections: Collection[] = [];

    try {
      let spec: any;

      // Parse JSON or YAML
      if (content.trim().startsWith('{')) {
        spec = JSON.parse(content);
      } else {
        // Simple YAML parsing - would need a proper YAML parser for complex cases
        errors.push('YAML parsing requires additional dependencies. Please use JSON format.');
        return { collections: [], environments: [], errors, warnings };
      }

      const collectionId = uuidv4();
      const collection: Collection = {
        id: collectionId,
        name: spec.info?.title || 'Imported API',
        description: spec.info?.description || '',
        requests: [],
        folders: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Get base URL from servers
      const baseUrl = spec.servers?.[0]?.url || 'http://localhost';

      // Process paths
      for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

        for (const method of methods) {
          const operation = (pathItem as any)[method];
          if (!operation) continue;

          const request = this.createRequestFromOpenAPIOperation(
            method.toUpperCase() as HttpMethod,
            path,
            operation,
            baseUrl
          );

          collection.requests.push(request);
        }
      }

      collections.push(collection);

      // Create environment from servers and variables
      const environments: Environment[] = [];
      if (spec.servers && spec.servers.length > 0) {
        const env: Environment = {
          id: uuidv4(),
          name: `${spec.info?.title || 'API'} Environment`,
          variables: [
            {
              id: uuidv4(),
              key: 'baseUrl',
              value: baseUrl,
              enabled: true,
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        environments.push(env);
      }

      return { collections, environments, errors, warnings };
    } catch (error) {
      errors.push(`Failed to parse OpenAPI: ${error instanceof Error ? error.message : String(error)}`);
      return { collections: [], environments: [], errors, warnings };
    }
  }

  private createRequestFromOpenAPIOperation(
    method: HttpMethod,
    path: string,
    operation: any,
    baseUrl: string
  ): RequestConfig {
    const headers: KeyValue[] = [];
    const params: KeyValue[] = [];

    // Process parameters
    for (const param of operation.parameters || []) {
      const item: KeyValue = {
        id: uuidv4(),
        key: param.name,
        value: param.example || param.schema?.default || '',
        enabled: param.required ?? true,
        description: param.description,
      };

      if (param.in === 'header') {
        headers.push(item);
      } else if (param.in === 'query') {
        params.push(item);
      }
    }

    // Ensure at least one empty row
    if (headers.length === 0) {
      headers.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }
    if (params.length === 0) {
      params.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    // Process request body
    let body: string | undefined;
    let bodyType: RequestConfig['bodyType'] = 'none';

    if (operation.requestBody?.content) {
      const contentType = Object.keys(operation.requestBody.content)[0];
      const schema = operation.requestBody.content[contentType]?.schema;

      if (contentType?.includes('json')) {
        bodyType = 'json';
        body = schema?.example
          ? JSON.stringify(schema.example, null, 2)
          : this.generateExampleFromSchema(schema);
      }
    }

    return {
      id: uuidv4(),
      name: operation.summary || operation.operationId || `${method} ${path}`,
      method,
      url: `${baseUrl}${path}`,
      headers,
      params,
      body,
      bodyType,
      auth: { type: 'none' },
    };
  }

  private generateExampleFromSchema(schema: any): string {
    if (!schema) return '{}';

    const example: any = {};

    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties) as [string, any][]) {
        if (prop.example !== undefined) {
          example[key] = prop.example;
        } else if (prop.type === 'string') {
          example[key] = 'string';
        } else if (prop.type === 'number' || prop.type === 'integer') {
          example[key] = 0;
        } else if (prop.type === 'boolean') {
          example[key] = true;
        } else if (prop.type === 'array') {
          example[key] = [];
        } else if (prop.type === 'object') {
          example[key] = {};
        }
      }
    }

    return JSON.stringify(example, null, 2);
  }

  /**
   * Import Postman Collection v2.1
   */
  private async importPostman(content: string): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const postmanCollection = JSON.parse(content);

      if (!postmanCollection.info || !postmanCollection.item) {
        errors.push('Invalid Postman collection format');
        return { collections: [], environments: [], errors, warnings };
      }

      const collection: Collection = {
        id: uuidv4(),
        name: postmanCollection.info.name || 'Imported Collection',
        description: postmanCollection.info.description || '',
        requests: [],
        folders: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Process items (requests and folders)
      this.processPostmanItems(postmanCollection.item, collection);

      // Process variables into environment
      const environments: Environment[] = [];
      if (postmanCollection.variable && postmanCollection.variable.length > 0) {
        const env: Environment = {
          id: uuidv4(),
          name: `${collection.name} Variables`,
          variables: postmanCollection.variable.map((v: any) => ({
            id: uuidv4(),
            key: v.key,
            value: v.value || '',
            enabled: !v.disabled,
          })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        environments.push(env);
      }

      return { collections: [collection], environments, errors, warnings };
    } catch (error) {
      errors.push(`Failed to parse Postman collection: ${error instanceof Error ? error.message : String(error)}`);
      return { collections: [], environments: [], errors, warnings };
    }
  }

  private processPostmanItems(items: any[], collection: Collection, folderId?: string): void {
    for (const item of items) {
      if (item.item) {
        // It's a folder
        const folder = {
          id: uuidv4(),
          name: item.name,
          parentId: folderId,
        };
        collection.folders.push(folder);
        this.processPostmanItems(item.item, collection, folder.id);
      } else if (item.request) {
        // It's a request
        const request = this.createRequestFromPostmanItem(item, folderId);
        collection.requests.push(request);
      }
    }
  }

  private createRequestFromPostmanItem(item: any, folderId?: string): RequestConfig {
    const req = item.request;
    const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';

    // Process headers
    const headers: KeyValue[] = (req.header || []).map((h: any) => ({
      id: uuidv4(),
      key: h.key,
      value: h.value,
      enabled: !h.disabled,
    }));

    if (headers.length === 0) {
      headers.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    // Process query params
    const params: KeyValue[] = (req.url?.query || []).map((q: any) => ({
      id: uuidv4(),
      key: q.key,
      value: q.value,
      enabled: !q.disabled,
    }));

    if (params.length === 0) {
      params.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    // Process body
    let body: string | undefined;
    let bodyType: RequestConfig['bodyType'] = 'none';

    if (req.body) {
      if (req.body.mode === 'raw') {
        body = req.body.raw;
        if (req.body.options?.raw?.language === 'json') {
          bodyType = 'json';
        } else {
          bodyType = 'raw';
        }
      } else if (req.body.mode === 'urlencoded') {
        bodyType = 'form-urlencoded';
        body = (req.body.urlencoded || [])
          .filter((u: any) => !u.disabled)
          .map((u: any) => `${encodeURIComponent(u.key)}=${encodeURIComponent(u.value)}`)
          .join('&');
      }
    }

    // Process auth
    const auth = this.processPostmanAuth(req.auth);

    return {
      id: uuidv4(),
      name: item.name,
      method: (req.method || 'GET').toUpperCase() as HttpMethod,
      url,
      headers,
      params,
      body,
      bodyType,
      auth,
      folderId,
    };
  }

  private processPostmanAuth(auth: any): RequestConfig['auth'] {
    if (!auth || auth.type === 'noauth') {
      return { type: 'none' };
    }

    switch (auth.type) {
      case 'basic':
        return {
          type: 'basic',
          basic: {
            username: auth.basic?.find((b: any) => b.key === 'username')?.value || '',
            password: auth.basic?.find((b: any) => b.key === 'password')?.value || '',
          },
        };
      case 'bearer':
        return {
          type: 'bearer',
          bearer: {
            token: auth.bearer?.find((b: any) => b.key === 'token')?.value || '',
          },
        };
      case 'apikey':
        return {
          type: 'apiKey',
          apiKey: {
            key: auth.apikey?.find((a: any) => a.key === 'key')?.value || '',
            value: auth.apikey?.find((a: any) => a.key === 'value')?.value || '',
            addTo: auth.apikey?.find((a: any) => a.key === 'in')?.value === 'query' ? 'query' : 'header',
          },
        };
      default:
        return { type: 'none' };
    }
  }

  /**
   * Import cURL command
   */
  private async importCurl(content: string): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const request = this.parseCurl(content);

      const collection: Collection = {
        id: uuidv4(),
        name: 'Imported cURL',
        description: 'Imported from cURL command',
        requests: [request],
        folders: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return { collections: [collection], environments: [], errors, warnings };
    } catch (error) {
      errors.push(`Failed to parse cURL: ${error instanceof Error ? error.message : String(error)}`);
      return { collections: [], environments: [], errors, warnings };
    }
  }

  private parseCurl(curlCommand: string): RequestConfig {
    // Remove line continuations and normalize
    let normalized = curlCommand
      .replace(/\\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract URL
    const urlMatch = normalized.match(/curl\s+(?:[^'"\s-][^\s]*|'[^']*'|"[^"]*")/);
    let url = '';
    if (urlMatch) {
      url = urlMatch[0].replace(/^curl\s+/, '').replace(/^['"]|['"]$/g, '');
    }

    // Also check for -X followed by URL
    const urlAfterMethod = normalized.match(/-X\s+\w+\s+(?:[^'"\s-][^\s]*|'[^']*'|"[^"]*")/);
    if (urlAfterMethod) {
      const parts = urlAfterMethod[0].split(/\s+/);
      url = parts[parts.length - 1]!.replace(/^['"]|['"]$/g, '');
    }

    // Extract method
    const methodMatch = normalized.match(/-X\s+(\w+)/);
    const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase() as HttpMethod;

    // Extract headers
    const headers: KeyValue[] = [];
    const headerRegex = /-H\s+(?:'([^']*)'|"([^"]*)")/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(normalized)) !== null) {
      const header = headerMatch[1] || headerMatch[2];
      const [key, ...valueParts] = header!.split(':');
      if (key) {
        headers.push({
          id: uuidv4(),
          key: key.trim(),
          value: valueParts.join(':').trim(),
          enabled: true,
        });
      }
    }

    if (headers.length === 0) {
      headers.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    // Extract body
    let body: string | undefined;
    let bodyType: RequestConfig['bodyType'] = 'none';

    const dataMatch = normalized.match(/-(?:d|data|data-raw)\s+(?:'([^']*)'|"([^"]*)")/);
    if (dataMatch) {
      body = dataMatch[1] || dataMatch[2];

      // Try to detect if it's JSON
      try {
        JSON.parse(body!);
        bodyType = 'json';
      } catch {
        bodyType = 'raw';
      }
    }

    // Extract user (basic auth)
    let auth: RequestConfig['auth'] = { type: 'none' };
    const userMatch = normalized.match(/-u\s+(?:'([^']*)'|"([^"]*)"|(\S+))/);
    if (userMatch) {
      const credentials = userMatch[1] || userMatch[2] || userMatch[3];
      const [username, password] = credentials!.split(':');
      auth = {
        type: 'basic',
        basic: {
          username: username || '',
          password: password || '',
        },
      };
    }

    return {
      id: uuidv4(),
      name: `${method} Request`,
      method,
      url,
      headers,
      params: [{ id: uuidv4(), key: '', value: '', enabled: true }],
      body,
      bodyType,
      auth,
    };
  }

  /**
   * Import HAR (HTTP Archive) file
   */
  private async importHar(content: string): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const har = JSON.parse(content);

      if (!har.log || !har.log.entries) {
        errors.push('Invalid HAR format');
        return { collections: [], environments: [], errors, warnings };
      }

      const collection: Collection = {
        id: uuidv4(),
        name: 'Imported HAR',
        description: `Imported from HAR file`,
        requests: [],
        folders: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      for (const entry of har.log.entries) {
        const req = entry.request;
        if (!req) continue;

        const headers: KeyValue[] = (req.headers || []).map((h: any) => ({
          id: uuidv4(),
          key: h.name,
          value: h.value,
          enabled: true,
        }));

        if (headers.length === 0) {
          headers.push({ id: uuidv4(), key: '', value: '', enabled: true });
        }

        const params: KeyValue[] = (req.queryString || []).map((q: any) => ({
          id: uuidv4(),
          key: q.name,
          value: q.value,
          enabled: true,
        }));

        if (params.length === 0) {
          params.push({ id: uuidv4(), key: '', value: '', enabled: true });
        }

        let body: string | undefined;
        let bodyType: RequestConfig['bodyType'] = 'none';

        if (req.postData?.text) {
          body = req.postData.text;
          if (req.postData.mimeType?.includes('json')) {
            bodyType = 'json';
          } else {
            bodyType = 'raw';
          }
        }

        const request: RequestConfig = {
          id: uuidv4(),
          name: `${req.method} ${new URL(req.url).pathname}`,
          method: req.method as HttpMethod,
          url: req.url,
          headers,
          params,
          body,
          bodyType,
          auth: { type: 'none' },
        };

        collection.requests.push(request);
      }

      return { collections: [collection], environments: [], errors, warnings };
    } catch (error) {
      errors.push(`Failed to parse HAR: ${error instanceof Error ? error.message : String(error)}`);
      return { collections: [], environments: [], errors, warnings };
    }
  }
}

export const importService = new ImportService();
