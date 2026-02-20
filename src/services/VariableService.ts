import type { Environment, KeyValue, RequestConfig } from '../types';

/**
 * Service for resolving environment variables in requests
 * Supports {{variableName}} syntax throughout URLs, headers, body, and auth
 */
export class VariableService {
  private variablePattern = /\{\{([^}]+)\}\}/g;

  /**
   * Resolve all variables in a request using the active environment
   */
  resolveRequest(request: RequestConfig, environment: Environment | null): RequestConfig {
    if (!environment) {
      return request;
    }

    const variables = this.buildVariableMap(environment);

    return {
      ...request,
      url: this.resolveString(request.url, variables),
      headers: this.resolveKeyValues(request.headers, variables),
      params: this.resolveKeyValues(request.params, variables),
      body: request.body ? this.resolveString(request.body, variables) : request.body,
      auth: this.resolveAuth(request.auth, variables),
    };
  }

  /**
   * Resolve variables in a string
   */
  resolveString(text: string, variables: Map<string, string>): string {
    return text.replace(this.variablePattern, (match, varName) => {
      const trimmedName = varName.trim();
      return variables.has(trimmedName) ? variables.get(trimmedName)! : match;
    });
  }

  /**
   * Resolve variables in key-value pairs
   */
  resolveKeyValues(items: KeyValue[], variables: Map<string, string>): KeyValue[] {
    return items.map(item => ({
      ...item,
      key: this.resolveString(item.key, variables),
      value: this.resolveString(item.value, variables),
    }));
  }

  /**
   * Resolve variables in auth configuration
   */
  private resolveAuth(auth: RequestConfig['auth'], variables: Map<string, string>): RequestConfig['auth'] {
    if (!auth) return auth;

    const resolved = { ...auth };

    if (resolved.basic) {
      resolved.basic = {
        username: this.resolveString(resolved.basic.username, variables),
        password: this.resolveString(resolved.basic.password, variables),
      };
    }

    if (resolved.bearer) {
      resolved.bearer = {
        ...resolved.bearer,
        token: this.resolveString(resolved.bearer.token, variables),
      };
    }

    if (resolved.apiKey) {
      resolved.apiKey = {
        ...resolved.apiKey,
        key: this.resolveString(resolved.apiKey.key, variables),
        value: this.resolveString(resolved.apiKey.value, variables),
      };
    }

    return resolved;
  }

  /**
   * Build a map of variable name to value from environment
   */
  private buildVariableMap(environment: Environment): Map<string, string> {
    const map = new Map<string, string>();

    for (const variable of environment.variables) {
      if (variable.enabled && variable.key) {
        map.set(variable.key, variable.value);
      }
    }

    return map;
  }

  /**
   * Extract all variable names from a string
   */
  extractVariables(text: string): string[] {
    const matches: string[] = [];
    let match;

    while ((match = this.variablePattern.exec(text)) !== null) {
      matches.push(match[1]!.trim());
    }

    // Reset regex lastIndex
    this.variablePattern.lastIndex = 0;

    return [...new Set(matches)];
  }

  /**
   * Check if a string contains unresolved variables
   */
  hasUnresolvedVariables(text: string, environment: Environment | null): boolean {
    const variables = this.extractVariables(text);
    if (variables.length === 0) return false;

    if (!environment) return true;

    const availableVars = new Set(
      environment.variables
        .filter(v => v.enabled && v.key)
        .map(v => v.key)
    );

    return variables.some(v => !availableVars.has(v));
  }

  /**
   * Get list of unresolved variable names
   */
  getUnresolvedVariables(text: string, environment: Environment | null): string[] {
    const variables = this.extractVariables(text);
    if (variables.length === 0) return [];

    if (!environment) return variables;

    const availableVars = new Set(
      environment.variables
        .filter(v => v.enabled && v.key)
        .map(v => v.key)
    );

    return variables.filter(v => !availableVars.has(v));
  }

  /**
   * Highlight variables in text for display
   */
  highlightVariables(text: string): Array<{ text: string; isVariable: boolean; varName?: string }> {
    const parts: Array<{ text: string; isVariable: boolean; varName?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = this.variablePattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isVariable: false });
      }

      // Add the variable
      parts.push({
        text: match[0],
        isVariable: true,
        varName: match[1]!.trim(),
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isVariable: false });
    }

    // Reset regex lastIndex
    this.variablePattern.lastIndex = 0;

    return parts;
  }
}

// Export singleton instance
export const variableService = new VariableService();
