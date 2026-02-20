import * as vm from 'vm';
import * as crypto from 'crypto';
import type { RequestConfig, ResponseData, Environment } from '../types';

export interface ScriptContext {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | null;
    params: Record<string, string>;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
  };
  env: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    unset: (key: string) => void;
    all: () => Record<string, string>;
  };
  variables: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string) => void;
    clear: () => void;
  };
  utils: {
    uuid: () => string;
    timestamp: () => number;
    isoTimestamp: () => string;
    randomInt: (min: number, max: number) => number;
    base64Encode: (text: string) => string;
    base64Decode: (text: string) => string;
    md5: (text: string) => string;
    sha256: (text: string) => string;
    hmacSha256: (text: string, secret: string) => string;
  };
  console: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
  };
  test: (name: string, fn: () => void) => void;
  expect: (value: unknown) => ExpectChain;
}

interface ExpectChain {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: string) => void;
  toHaveProperty: (key: string, value?: unknown) => void;
  toBeTruthy: () => void;
  toBeFalsy: () => void;
  toBeGreaterThan: (expected: number) => void;
  toBeLessThan: (expected: number) => void;
  toMatch: (pattern: RegExp) => void;
  toHaveLength: (expected: number) => void;
  not: ExpectChain;
}

export interface ScriptResult {
  success: boolean;
  logs: Array<{ level: string; message: string; timestamp: number }>;
  errors: string[];
  testResults: Array<{ name: string; passed: boolean; error?: string }>;
  envChanges: { set: Record<string, string>; unset: string[] };
  variableChanges: Record<string, string>;
  duration: number;
}

export class ScriptService {
  private timeout = 5000; // 5 second timeout

  /**
   * Execute a pre-request script
   */
  async executePreScript(
    script: string,
    request: RequestConfig,
    environment: Environment | null
  ): Promise<{ result: ScriptResult; modifiedRequest: RequestConfig }> {
    const envMap = this.buildEnvMap(environment);
    const variableMap = new Map<string, string>();
    const logs: ScriptResult['logs'] = [];
    const errors: string[] = [];
    const testResults: ScriptResult['testResults'] = [];
    const envChanges: ScriptResult['envChanges'] = { set: {}, unset: [] };

    const context = this.createScriptContext(
      request,
      undefined,
      envMap,
      variableMap,
      logs,
      errors,
      testResults,
      envChanges
    );

    const startTime = Date.now();
    let success = true;

    try {
      await this.runInSandbox(script, context);
    } catch (error) {
      success = false;
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // Apply changes to request
    const modifiedRequest = this.applyContextToRequest(request, context, variableMap);

    return {
      result: {
        success,
        logs,
        errors,
        testResults,
        envChanges,
        variableChanges: Object.fromEntries(variableMap),
        duration: Date.now() - startTime,
      },
      modifiedRequest,
    };
  }

  /**
   * Execute a post-request (test) script
   */
  async executePostScript(
    script: string,
    request: RequestConfig,
    response: ResponseData,
    environment: Environment | null
  ): Promise<ScriptResult> {
    const envMap = this.buildEnvMap(environment);
    const variableMap = new Map<string, string>();
    const logs: ScriptResult['logs'] = [];
    const errors: string[] = [];
    const testResults: ScriptResult['testResults'] = [];
    const envChanges: ScriptResult['envChanges'] = { set: {}, unset: [] };

    const context = this.createScriptContext(
      request,
      response,
      envMap,
      variableMap,
      logs,
      errors,
      testResults,
      envChanges
    );

    const startTime = Date.now();
    let success = true;

    try {
      await this.runInSandbox(script, context);
    } catch (error) {
      success = false;
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // Check if all tests passed
    if (testResults.some((t) => !t.passed)) {
      success = false;
    }

    return {
      success,
      logs,
      errors,
      testResults,
      envChanges,
      variableChanges: Object.fromEntries(variableMap),
      duration: Date.now() - startTime,
    };
  }

  private createScriptContext(
    request: RequestConfig,
    response: ResponseData | undefined,
    envMap: Map<string, string>,
    variableMap: Map<string, string>,
    logs: ScriptResult['logs'],
    errors: string[],
    testResults: ScriptResult['testResults'],
    envChanges: ScriptResult['envChanges']
  ): ScriptContext {
    // Convert headers and params to objects
    const headersObj: Record<string, string> = {};
    request.headers.filter((h) => h.enabled && h.key).forEach((h) => {
      headersObj[h.key] = h.value;
    });

    const paramsObj: Record<string, string> = {};
    request.params.filter((p) => p.enabled && p.key).forEach((p) => {
      paramsObj[p.key] = p.value;
    });

    // Build response object if available
    const responseObj = response
      ? {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body,
          time: response.time,
          size: response.size,
        }
      : undefined;

    return {
      request: {
        url: request.url,
        method: request.method,
        headers: headersObj,
        body: request.body || null,
        params: paramsObj,
      },
      response: responseObj,
      env: {
        get: (key: string) => envMap.get(key),
        set: (key: string, value: string) => {
          envMap.set(key, value);
          envChanges.set[key] = value;
        },
        unset: (key: string) => {
          envMap.delete(key);
          envChanges.unset.push(key);
        },
        all: () => Object.fromEntries(envMap),
      },
      variables: {
        get: (key: string) => variableMap.get(key),
        set: (key: string, value: string) => variableMap.set(key, value),
        clear: () => variableMap.clear(),
      },
      utils: {
        uuid: () => crypto.randomUUID(),
        timestamp: () => Date.now(),
        isoTimestamp: () => new Date().toISOString(),
        randomInt: (min: number, max: number) =>
          Math.floor(Math.random() * (max - min + 1)) + min,
        base64Encode: (text: string) => Buffer.from(text).toString('base64'),
        base64Decode: (text: string) => Buffer.from(text, 'base64').toString('utf-8'),
        md5: (text: string) => crypto.createHash('md5').update(text).digest('hex'),
        sha256: (text: string) => crypto.createHash('sha256').update(text).digest('hex'),
        hmacSha256: (text: string, secret: string) =>
          crypto.createHmac('sha256', secret).update(text).digest('hex'),
      },
      console: {
        log: (...args: unknown[]) =>
          logs.push({ level: 'log', message: this.formatArgs(args), timestamp: Date.now() }),
        warn: (...args: unknown[]) =>
          logs.push({ level: 'warn', message: this.formatArgs(args), timestamp: Date.now() }),
        error: (...args: unknown[]) =>
          logs.push({ level: 'error', message: this.formatArgs(args), timestamp: Date.now() }),
        info: (...args: unknown[]) =>
          logs.push({ level: 'info', message: this.formatArgs(args), timestamp: Date.now() }),
      },
      test: (name: string, fn: () => void) => {
        try {
          fn();
          testResults.push({ name, passed: true });
        } catch (error) {
          testResults.push({
            name,
            passed: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
      expect: (value: unknown) => this.createExpectChain(value, false),
    };
  }

  private createExpectChain(value: unknown, negated: boolean, depth: number = 0): ExpectChain {
    const check = (condition: boolean, message: string) => {
      const result = negated ? !condition : condition;
      if (!result) {
        throw new Error(message);
      }
    };

    const self = this;

    const chain: ExpectChain = {
      toBe: (expected: unknown) =>
        check(value === expected, `Expected ${value} ${negated ? 'not ' : ''}to be ${expected}`),
      toEqual: (expected: unknown) =>
        check(
          JSON.stringify(value) === JSON.stringify(expected),
          `Expected ${JSON.stringify(value)} ${negated ? 'not ' : ''}to equal ${JSON.stringify(expected)}`
        ),
      toContain: (expected: string) =>
        check(
          typeof value === 'string' && value.includes(expected),
          `Expected "${value}" ${negated ? 'not ' : ''}to contain "${expected}"`
        ),
      toHaveProperty: (key: string, expectedValue?: unknown) => {
        const obj = value as Record<string, unknown>;
        const hasKey = obj && typeof obj === 'object' && key in obj;
        if (expectedValue !== undefined) {
          check(
            hasKey && obj[key] === expectedValue,
            `Expected object ${negated ? 'not ' : ''}to have property "${key}" with value ${expectedValue}`
          );
        } else {
          check(hasKey, `Expected object ${negated ? 'not ' : ''}to have property "${key}"`);
        }
      },
      toBeTruthy: () => check(Boolean(value), `Expected ${value} ${negated ? 'not ' : ''}to be truthy`),
      toBeFalsy: () => check(!value, `Expected ${value} ${negated ? 'not ' : ''}to be falsy`),
      toBeGreaterThan: (expected: number) =>
        check(
          typeof value === 'number' && value > expected,
          `Expected ${value} ${negated ? 'not ' : ''}to be greater than ${expected}`
        ),
      toBeLessThan: (expected: number) =>
        check(
          typeof value === 'number' && value < expected,
          `Expected ${value} ${negated ? 'not ' : ''}to be less than ${expected}`
        ),
      toMatch: (pattern: RegExp) =>
        check(
          typeof value === 'string' && pattern.test(value),
          `Expected "${value}" ${negated ? 'not ' : ''}to match ${pattern}`
        ),
      toHaveLength: (expected: number) =>
        check(
          Array.isArray(value) || typeof value === 'string'
            ? (value as unknown[]).length === expected
            : false,
          `Expected length ${(value as unknown[])?.length} ${negated ? 'not ' : ''}to be ${expected}`
        ),
      get not(): ExpectChain {
        // Only allow one level of negation to prevent infinite recursion
        if (depth > 0) {
          return chain; // Return same chain if already negated
        }
        return self.createExpectChain(value, !negated, depth + 1);
      },
    };

    return chain;
  }

  private async runInSandbox(script: string, context: ScriptContext): Promise<void> {
    const sandbox = {
      request: context.request,
      response: context.response,
      env: context.env,
      variables: context.variables,
      utils: context.utils,
      console: context.console,
      test: context.test,
      expect: context.expect,
      // Allow JSON for parsing
      JSON,
      // Allow basic math
      Math,
      // Allow date operations
      Date,
      // Allow string operations
      String,
      Number,
      Boolean,
      Array,
      Object,
      // Prevent access to dangerous globals
      require: undefined,
      process: undefined,
      global: undefined,
      __dirname: undefined,
      __filename: undefined,
    };

    const vmContext = vm.createContext(sandbox);

    const wrappedScript = `
      (async function() {
        ${script}
      })()
    `;

    const vmScript = new vm.Script(wrappedScript, {
      filename: 'script.js',
    });

    await vmScript.runInContext(vmContext, {
      timeout: this.timeout,
    });
  }

  private buildEnvMap(environment: Environment | null): Map<string, string> {
    const map = new Map<string, string>();
    if (environment) {
      for (const variable of environment.variables) {
        if (variable.enabled && variable.key) {
          map.set(variable.key, variable.value);
        }
      }
    }
    return map;
  }

  private applyContextToRequest(
    request: RequestConfig,
    context: ScriptContext,
    variableMap: Map<string, string>
  ): RequestConfig {
    // Apply variable substitutions to the request
    let url = context.request.url;
    let body = context.request.body;

    // Replace variables in URL and body
    for (const [key, value] of variableMap) {
      const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      url = url.replace(pattern, value);
      if (body) {
        body = body.replace(pattern, value);
      }
    }

    // Convert headers back to array format
    const headers = Object.entries(context.request.headers).map(([key, value]) => ({
      id: key,
      key,
      value,
      enabled: true,
    }));

    // Convert params back to array format
    const params = Object.entries(context.request.params).map(([key, value]) => ({
      id: key,
      key,
      value,
      enabled: true,
    }));

    return {
      ...request,
      url,
      headers,
      params,
      body: body || undefined,
    };
  }

  private formatArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }
}

export const scriptService = new ScriptService();
