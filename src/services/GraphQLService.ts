import axios, { CancelTokenSource } from 'axios';
import type { ResponseData } from '../types';

export interface GraphQLRequest {
  id: string;
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
}

export interface GraphQLIntrospectionResult {
  types: GraphQLType[];
  queryType: string | null;
  mutationType: string | null;
  subscriptionType: string | null;
}

export interface GraphQLType {
  name: string;
  kind: string;
  description?: string;
  fields?: GraphQLField[];
}

export interface GraphQLField {
  name: string;
  description?: string;
  type: string;
  args?: GraphQLArg[];
}

export interface GraphQLArg {
  name: string;
  type: string;
  defaultValue?: string;
}

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        name
        kind
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            name
            type { name kind ofType { name kind } }
            defaultValue
          }
          type { name kind ofType { name kind ofType { name kind } } }
        }
      }
    }
  }
`;

export class GraphQLService {
  private cancelTokens: Map<string, CancelTokenSource> = new Map();
  private schemaCache: Map<string, GraphQLIntrospectionResult> = new Map();

  /**
   * Execute a GraphQL query
   */
  async execute(request: GraphQLRequest): Promise<ResponseData> {
    const cancelSource = axios.CancelToken.source();
    this.cancelTokens.set(request.id, cancelSource);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add custom headers
    request.headers
      .filter(h => h.enabled && h.key)
      .forEach(h => {
        headers[h.key] = h.value;
      });

    const startTime = Date.now();

    try {
      const response = await axios.post(
        request.url,
        {
          query: request.query,
          variables: request.variables,
          operationName: request.operationName,
        },
        {
          headers,
          cancelToken: cancelSource.token,
          validateStatus: () => true,
        }
      );

      const endTime = Date.now();

      const responseHeaders: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
      });

      const body = typeof response.data === 'object'
        ? JSON.stringify(response.data, null, 2)
        : String(response.data);

      return {
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body,
        time: endTime - startTime,
        size: new TextEncoder().encode(body).length,
      };
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      this.cancelTokens.delete(request.id);
    }
  }

  /**
   * Cancel a running request
   */
  cancel(requestId: string): void {
    const cancelSource = this.cancelTokens.get(requestId);
    if (cancelSource) {
      cancelSource.cancel('Request cancelled by user');
      this.cancelTokens.delete(requestId);
    }
  }

  /**
   * Fetch GraphQL schema via introspection
   */
  async introspect(url: string, headers?: Record<string, string>): Promise<GraphQLIntrospectionResult> {
    // Check cache first
    const cached = this.schemaCache.get(url);
    if (cached) {
      return cached;
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await axios.post(
      url,
      { query: INTROSPECTION_QUERY },
      { headers: requestHeaders }
    );

    if (response.data.errors) {
      throw new Error(`Introspection failed: ${response.data.errors[0].message}`);
    }

    const schema = response.data.data.__schema;
    const result: GraphQLIntrospectionResult = {
      types: schema.types
        .filter((t: { name: string }) => !t.name.startsWith('__'))
        .map((t: { name: string; kind: string; description?: string; fields?: Array<{
          name: string;
          description?: string;
          type: { name?: string; kind: string; ofType?: { name?: string; kind: string } };
          args?: Array<{ name: string; type: { name?: string; kind: string }; defaultValue?: string }>;
        }> }) => ({
          name: t.name,
          kind: t.kind,
          description: t.description,
          fields: t.fields?.map(f => ({
            name: f.name,
            description: f.description,
            type: this.formatType(f.type),
            args: f.args?.map(a => ({
              name: a.name,
              type: this.formatType(a.type),
              defaultValue: a.defaultValue,
            })),
          })),
        })),
      queryType: schema.queryType?.name || null,
      mutationType: schema.mutationType?.name || null,
      subscriptionType: schema.subscriptionType?.name || null,
    };

    // Cache the result
    this.schemaCache.set(url, result);

    return result;
  }

  /**
   * Clear schema cache
   */
  clearCache(url?: string): void {
    if (url) {
      this.schemaCache.delete(url);
    } else {
      this.schemaCache.clear();
    }
  }

  /**
   * Format GraphQL type for display
   */
  private formatType(type: { name?: string; kind: string; ofType?: { name?: string; kind: string; ofType?: { name?: string; kind: string } } }): string {
    if (type.name) {
      return type.name;
    }

    if (type.kind === 'NON_NULL' && type.ofType) {
      return `${this.formatType(type.ofType)}!`;
    }

    if (type.kind === 'LIST' && type.ofType) {
      return `[${this.formatType(type.ofType)}]`;
    }

    return 'Unknown';
  }

  /**
   * Parse GraphQL query to extract operation info
   */
  parseQuery(query: string): { operationType: string; operationName?: string; variables: string[] } {
    const operationMatch = query.match(/^\s*(query|mutation|subscription)\s*(\w+)?\s*(\([^)]*\))?\s*\{/m);

    const result = {
      operationType: operationMatch?.[1] || 'query',
      operationName: operationMatch?.[2],
      variables: [] as string[],
    };

    // Extract variable names from the query
    const variableMatch = query.match(/\$(\w+)/g);
    if (variableMatch) {
      result.variables = variableMatch.map(v => v.slice(1));
    }

    return result;
  }

  /**
   * Format GraphQL query with proper indentation
   */
  formatQuery(query: string): string {
    // Simple formatting - proper implementation would use a GraphQL parser
    let formatted = query.trim();
    let indent = 0;
    let result = '';

    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];

      if (char === '{') {
        result += ' {\n';
        indent++;
        result += '  '.repeat(indent);
      } else if (char === '}') {
        indent--;
        result += '\n' + '  '.repeat(indent) + '}';
      } else if (char === '\n') {
        result += '\n' + '  '.repeat(indent);
      } else {
        result += char;
      }
    }

    return result;
  }
}

export const graphqlService = new GraphQLService();
