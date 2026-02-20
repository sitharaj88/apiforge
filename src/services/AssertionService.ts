import Ajv from 'ajv';
import type { ResponseData } from '../types';

export type AssertionType =
  | 'status'
  | 'status_range'
  | 'response_time'
  | 'header_exists'
  | 'header_equals'
  | 'header_contains'
  | 'body_contains'
  | 'body_not_contains'
  | 'body_equals'
  | 'body_matches'
  | 'jsonpath_exists'
  | 'jsonpath_equals'
  | 'jsonpath_contains'
  | 'json_schema'
  | 'content_type';

export interface Assertion {
  id: string;
  type: AssertionType;
  enabled: boolean;
  target?: string; // header name, jsonpath, etc.
  expected?: string | number | boolean;
  comparator?: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'matches' | 'exists' | 'not_exists';
  min?: number;
  max?: number;
  schema?: object;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  actual?: unknown;
  message: string;
}

export class AssertionService {
  private ajv = new Ajv({ allErrors: true });

  /**
   * Run all assertions against a response
   */
  runAssertions(assertions: Assertion[], response: ResponseData): AssertionResult[] {
    return assertions
      .filter((a) => a.enabled)
      .map((assertion) => this.runAssertion(assertion, response));
  }

  /**
   * Run a single assertion
   */
  runAssertion(assertion: Assertion, response: ResponseData): AssertionResult {
    try {
      switch (assertion.type) {
        case 'status':
          return this.assertStatus(assertion, response);
        case 'status_range':
          return this.assertStatusRange(assertion, response);
        case 'response_time':
          return this.assertResponseTime(assertion, response);
        case 'header_exists':
          return this.assertHeaderExists(assertion, response);
        case 'header_equals':
          return this.assertHeaderEquals(assertion, response);
        case 'header_contains':
          return this.assertHeaderContains(assertion, response);
        case 'body_contains':
          return this.assertBodyContains(assertion, response);
        case 'body_not_contains':
          return this.assertBodyNotContains(assertion, response);
        case 'body_equals':
          return this.assertBodyEquals(assertion, response);
        case 'body_matches':
          return this.assertBodyMatches(assertion, response);
        case 'jsonpath_exists':
          return this.assertJsonPathExists(assertion, response);
        case 'jsonpath_equals':
          return this.assertJsonPathEquals(assertion, response);
        case 'jsonpath_contains':
          return this.assertJsonPathContains(assertion, response);
        case 'json_schema':
          return this.assertJsonSchema(assertion, response);
        case 'content_type':
          return this.assertContentType(assertion, response);
        default:
          return {
            assertion,
            passed: false,
            message: `Unknown assertion type: ${assertion.type}`,
          };
      }
    } catch (error) {
      return {
        assertion,
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private assertStatus(assertion: Assertion, response: ResponseData): AssertionResult {
    const expected = Number(assertion.expected);
    const passed = response.status === expected;
    return {
      assertion,
      passed,
      actual: response.status,
      message: passed
        ? `Status code is ${expected}`
        : `Expected status ${expected}, got ${response.status}`,
    };
  }

  private assertStatusRange(assertion: Assertion, response: ResponseData): AssertionResult {
    const min = assertion.min ?? 200;
    const max = assertion.max ?? 299;
    const passed = response.status >= min && response.status <= max;
    return {
      assertion,
      passed,
      actual: response.status,
      message: passed
        ? `Status code ${response.status} is in range [${min}-${max}]`
        : `Expected status in range [${min}-${max}], got ${response.status}`,
    };
  }

  private assertResponseTime(assertion: Assertion, response: ResponseData): AssertionResult {
    const maxTime = Number(assertion.expected);
    const passed = response.time < maxTime;
    return {
      assertion,
      passed,
      actual: response.time,
      message: passed
        ? `Response time ${response.time}ms is less than ${maxTime}ms`
        : `Expected response time < ${maxTime}ms, got ${response.time}ms`,
    };
  }

  private assertHeaderExists(assertion: Assertion, response: ResponseData): AssertionResult {
    const headerName = assertion.target?.toLowerCase() ?? '';
    const headerExists = Object.keys(response.headers).some(
      (h) => h.toLowerCase() === headerName
    );
    const passed = assertion.comparator === 'not_exists' ? !headerExists : headerExists;
    return {
      assertion,
      passed,
      actual: headerExists,
      message: passed
        ? `Header "${assertion.target}" ${assertion.comparator === 'not_exists' ? 'does not exist' : 'exists'}`
        : `Expected header "${assertion.target}" to ${assertion.comparator === 'not_exists' ? 'not exist' : 'exist'}`,
    };
  }

  private assertHeaderEquals(assertion: Assertion, response: ResponseData): AssertionResult {
    const headerName = assertion.target?.toLowerCase() ?? '';
    const headerValue = Object.entries(response.headers).find(
      ([h]) => h.toLowerCase() === headerName
    )?.[1];
    const passed = headerValue === String(assertion.expected);
    return {
      assertion,
      passed,
      actual: headerValue,
      message: passed
        ? `Header "${assertion.target}" equals "${assertion.expected}"`
        : `Expected header "${assertion.target}" to equal "${assertion.expected}", got "${headerValue}"`,
    };
  }

  private assertHeaderContains(assertion: Assertion, response: ResponseData): AssertionResult {
    const headerName = assertion.target?.toLowerCase() ?? '';
    const headerValue = Object.entries(response.headers).find(
      ([h]) => h.toLowerCase() === headerName
    )?.[1];
    const passed = headerValue?.includes(String(assertion.expected)) ?? false;
    return {
      assertion,
      passed,
      actual: headerValue,
      message: passed
        ? `Header "${assertion.target}" contains "${assertion.expected}"`
        : `Expected header "${assertion.target}" to contain "${assertion.expected}", got "${headerValue}"`,
    };
  }

  private assertBodyContains(assertion: Assertion, response: ResponseData): AssertionResult {
    const searchString = String(assertion.expected);
    const passed = response.body.includes(searchString);
    return {
      assertion,
      passed,
      actual: response.body.length > 100 ? `${response.body.substring(0, 100)}...` : response.body,
      message: passed
        ? `Body contains "${searchString}"`
        : `Expected body to contain "${searchString}"`,
    };
  }

  private assertBodyNotContains(assertion: Assertion, response: ResponseData): AssertionResult {
    const searchString = String(assertion.expected);
    const passed = !response.body.includes(searchString);
    return {
      assertion,
      passed,
      actual: response.body.length > 100 ? `${response.body.substring(0, 100)}...` : response.body,
      message: passed
        ? `Body does not contain "${searchString}"`
        : `Expected body to not contain "${searchString}"`,
    };
  }

  private assertBodyEquals(assertion: Assertion, response: ResponseData): AssertionResult {
    const expected = String(assertion.expected);
    const passed = response.body === expected;
    return {
      assertion,
      passed,
      actual: response.body.length > 100 ? `${response.body.substring(0, 100)}...` : response.body,
      message: passed ? `Body equals expected value` : `Body does not match expected value`,
    };
  }

  private assertBodyMatches(assertion: Assertion, response: ResponseData): AssertionResult {
    const pattern = new RegExp(String(assertion.expected));
    const passed = pattern.test(response.body);
    return {
      assertion,
      passed,
      actual: response.body.length > 100 ? `${response.body.substring(0, 100)}...` : response.body,
      message: passed
        ? `Body matches pattern /${assertion.expected}/`
        : `Body does not match pattern /${assertion.expected}/`,
    };
  }

  private assertJsonPathExists(assertion: Assertion, response: ResponseData): AssertionResult {
    try {
      const json = JSON.parse(response.body);
      const value = this.getJsonPath(json, assertion.target ?? '');
      const exists = value !== undefined;
      const passed = assertion.comparator === 'not_exists' ? !exists : exists;
      return {
        assertion,
        passed,
        actual: value,
        message: passed
          ? `JSONPath "${assertion.target}" ${assertion.comparator === 'not_exists' ? 'does not exist' : 'exists'}`
          : `Expected JSONPath "${assertion.target}" to ${assertion.comparator === 'not_exists' ? 'not exist' : 'exist'}`,
      };
    } catch {
      return {
        assertion,
        passed: false,
        message: 'Response body is not valid JSON',
      };
    }
  }

  private assertJsonPathEquals(assertion: Assertion, response: ResponseData): AssertionResult {
    try {
      const json = JSON.parse(response.body);
      const value = this.getJsonPath(json, assertion.target ?? '');
      const expected = this.parseExpectedValue(assertion.expected);
      const passed = JSON.stringify(value) === JSON.stringify(expected);
      return {
        assertion,
        passed,
        actual: value,
        message: passed
          ? `JSONPath "${assertion.target}" equals expected value`
          : `Expected JSONPath "${assertion.target}" to equal ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`,
      };
    } catch {
      return {
        assertion,
        passed: false,
        message: 'Response body is not valid JSON',
      };
    }
  }

  private assertJsonPathContains(assertion: Assertion, response: ResponseData): AssertionResult {
    try {
      const json = JSON.parse(response.body);
      const value = this.getJsonPath(json, assertion.target ?? '');
      const searchString = String(assertion.expected);
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      const passed = stringValue.includes(searchString);
      return {
        assertion,
        passed,
        actual: value,
        message: passed
          ? `JSONPath "${assertion.target}" contains "${searchString}"`
          : `Expected JSONPath "${assertion.target}" to contain "${searchString}"`,
      };
    } catch {
      return {
        assertion,
        passed: false,
        message: 'Response body is not valid JSON',
      };
    }
  }

  private assertJsonSchema(assertion: Assertion, response: ResponseData): AssertionResult {
    try {
      const json = JSON.parse(response.body);
      const schema = assertion.schema ?? JSON.parse(String(assertion.expected));
      const validate = this.ajv.compile(schema);
      const passed = validate(json);
      return {
        assertion,
        passed,
        actual: passed ? 'Valid' : this.ajv.errorsText(validate.errors),
        message: passed
          ? 'Response matches JSON schema'
          : `Schema validation failed: ${this.ajv.errorsText(validate.errors)}`,
      };
    } catch (error) {
      return {
        assertion,
        passed: false,
        message: `JSON Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private assertContentType(assertion: Assertion, response: ResponseData): AssertionResult {
    const contentType = response.headers['content-type'] ?? '';
    const expected = String(assertion.expected);
    const passed = contentType.includes(expected);
    return {
      assertion,
      passed,
      actual: contentType,
      message: passed
        ? `Content-Type contains "${expected}"`
        : `Expected Content-Type to contain "${expected}", got "${contentType}"`,
    };
  }

  /**
   * Simple JSONPath implementation supporting dot notation
   * e.g., "data.users[0].name" or "data.items.length"
   */
  private getJsonPath(obj: unknown, path: string): unknown {
    const parts = path.split(/\.|\[|\]/).filter(Boolean);
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (Array.isArray(current)) {
        const index = parseInt(part, 10);
        if (!isNaN(index)) {
          current = current[index];
        } else if (part === 'length') {
          current = current.length;
        } else {
          return undefined;
        }
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Parse expected value, trying to parse as JSON first
   */
  private parseExpectedValue(value: unknown): unknown {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  /**
   * Get human-readable assertion type label
   */
  getAssertionTypeLabel(type: AssertionType): string {
    const labels: Record<AssertionType, string> = {
      status: 'Status Code',
      status_range: 'Status Code Range',
      response_time: 'Response Time',
      header_exists: 'Header Exists',
      header_equals: 'Header Equals',
      header_contains: 'Header Contains',
      body_contains: 'Body Contains',
      body_not_contains: 'Body Not Contains',
      body_equals: 'Body Equals',
      body_matches: 'Body Matches Regex',
      jsonpath_exists: 'JSONPath Exists',
      jsonpath_equals: 'JSONPath Equals',
      jsonpath_contains: 'JSONPath Contains',
      json_schema: 'JSON Schema',
      content_type: 'Content-Type',
    };
    return labels[type] || type;
  }
}

export const assertionService = new AssertionService();
