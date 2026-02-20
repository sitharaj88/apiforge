<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CodeEditor from '../shared/CodeEditor.svelte';

  export let preScript = '';
  export let postScript = '';
  export let activeTab: 'pre' | 'post' = 'pre';

  const dispatch = createEventDispatcher<{
    preScriptChange: string;
    postScriptChange: string;
  }>();

  function handlePreScriptChange(e: CustomEvent<string>) {
    preScript = e.detail;
    dispatch('preScriptChange', preScript);
  }

  function handlePostScriptChange(e: CustomEvent<string>) {
    postScript = e.detail;
    dispatch('postScriptChange', postScript);
  }

  // Code snippets for quick insertion
  const preSnippets = [
    {
      name: 'Set Header',
      code: `request.headers['X-Custom-Header'] = 'value';`
    },
    {
      name: 'Generate UUID',
      code: `const id = utils.uuid();
variables.set('requestId', id);`
    },
    {
      name: 'Add Timestamp',
      code: `request.headers['X-Timestamp'] = utils.timestamp().toString();`
    },
    {
      name: 'Log Request',
      code: `console.log('Request URL:', request.url);
console.log('Request Method:', request.method);`
    },
    {
      name: 'Set Auth Token',
      code: `const token = env.get('authToken');
if (token) {
  request.headers['Authorization'] = 'Bearer ' + token;
}`
    },
    {
      name: 'HMAC Signature',
      code: `const secret = env.get('apiSecret');
const timestamp = utils.timestamp();
const signature = utils.hmacSha256(request.body + timestamp, secret);
request.headers['X-Signature'] = signature;
request.headers['X-Timestamp'] = timestamp.toString();`
    }
  ];

  const postSnippets = [
    {
      name: 'Check Status 200',
      code: `test('Status is 200', () => {
  expect(response.status).toBe(200);
});`
    },
    {
      name: 'Check Response Time',
      code: `test('Response time < 500ms', () => {
  expect(response.time).toBeLessThan(500);
});`
    },
    {
      name: 'Extract Token',
      code: `const body = JSON.parse(response.body);
if (body.token) {
  env.set('authToken', body.token);
  console.log('Token saved to environment');
}`
    },
    {
      name: 'Validate JSON Schema',
      code: `test('Has required fields', () => {
  const body = JSON.parse(response.body);
  expect(body).toHaveProperty('id');
  expect(body).toHaveProperty('name');
});`
    },
    {
      name: 'Check Content Type',
      code: `test('Content-Type is JSON', () => {
  const contentType = response.headers['content-type'] || '';
  expect(contentType).toContain('application/json');
});`
    },
    {
      name: 'Log Response',
      code: `console.log('Status:', response.status);
console.log('Time:', response.time + 'ms');
console.log('Body:', response.body);`
    }
  ];

  function insertSnippet(code: string) {
    if (activeTab === 'pre') {
      preScript = preScript ? preScript + '\n\n' + code : code;
      dispatch('preScriptChange', preScript);
    } else {
      postScript = postScript ? postScript + '\n\n' + code : code;
      dispatch('postScriptChange', postScript);
    }
  }

  $: currentSnippets = activeTab === 'pre' ? preSnippets : postSnippets;
</script>

<div class="flex flex-col h-full">
  <!-- Tabs -->
  <div class="flex items-center justify-between border-b border-vscode-border bg-vscode-sidebar-bg">
    <div class="flex">
      <button
        class="px-4 py-2 text-sm border-b-2 {activeTab === 'pre'
          ? 'border-vscode-focus-border text-vscode-foreground'
          : 'border-transparent text-vscode-foreground'}"
        style={activeTab !== 'pre' ? 'opacity: 0.6;' : ''}
        on:click={() => (activeTab = 'pre')}
      >
        Pre-request
        {#if preScript.trim()}
          <span class="ml-1 w-2 h-2 rounded-full bg-vscode-link inline-block"></span>
        {/if}
      </button>
      <button
        class="px-4 py-2 text-sm border-b-2 {activeTab === 'post'
          ? 'border-vscode-focus-border text-vscode-foreground'
          : 'border-transparent text-vscode-foreground'}"
        style={activeTab !== 'post' ? 'opacity: 0.6;' : ''}
        on:click={() => (activeTab = 'post')}
      >
        Tests
        {#if postScript.trim()}
          <span class="ml-1 w-2 h-2 rounded-full bg-vscode-link inline-block"></span>
        {/if}
      </button>
    </div>

    <!-- Snippets Dropdown -->
    <div class="relative group px-2">
      <button class="text-xs text-vscode-link hover:text-vscode-link-hover py-2">
        Snippets
        <svg class="w-3 h-3 inline-block ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class="absolute right-0 top-full mt-0 w-56 py-1 bg-vscode-editor-bg border border-vscode-border rounded shadow-lg hidden group-hover:block z-10">
        {#each currentSnippets as snippet}
          <button
            class="w-full px-3 py-1.5 text-left text-xs text-vscode-foreground hover:bg-vscode-list-hover"
            on:click={() => insertSnippet(snippet.code)}
          >
            {snippet.name}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Description -->
  <div class="px-3 py-2 text-xs border-b border-vscode-border bg-vscode-sidebar-bg text-vscode-foreground" style="opacity: 0.6;">
    {#if activeTab === 'pre'}
      <p>Pre-request scripts run before the request is sent. Use them to set headers, generate tokens, or modify the request.</p>
    {:else}
      <p>Test scripts run after the response is received. Use them to validate responses and extract data.</p>
    {/if}
  </div>

  <!-- Editor -->
  <div class="flex-1 overflow-hidden">
    {#if activeTab === 'pre'}
      <CodeEditor
        value={preScript}
        language="javascript"
        placeholder="// Pre-request script
// Available: request, env, variables, utils, console

// Example: Set a custom header
// request.headers['X-Request-ID'] = utils.uuid();"
        minHeight="100%"
        maxHeight="100%"
        on:change={handlePreScriptChange}
      />
    {:else}
      <CodeEditor
        value={postScript}
        language="javascript"
        placeholder="// Test script
// Available: request, response, env, variables, utils, console, test, expect

// Example: Check response status
// test('Status is 200', () => {'{'}
//   expect(response.status).toBe(200);
// {'}'});"
        minHeight="100%"
        maxHeight="100%"
        on:change={handlePostScriptChange}
      />
    {/if}
  </div>

  <!-- API Reference -->
  <details class="border-t border-vscode-border">
    <summary class="px-3 py-2 text-xs cursor-pointer hover:bg-vscode-list-hover text-vscode-foreground">
      API Reference
    </summary>
    <div class="px-3 py-2 text-xs bg-vscode-sidebar-bg max-h-48 overflow-auto">
      <div class="space-y-2">
        <div>
          <h4 class="font-medium text-vscode-foreground">request</h4>
          <p class="text-vscode-foreground" style="opacity: 0.6;">url, method, headers, body, params</p>
        </div>
        {#if activeTab === 'post'}
          <div>
            <h4 class="font-medium text-vscode-foreground">response</h4>
            <p class="text-vscode-foreground" style="opacity: 0.6;">status, statusText, headers, body, time, size</p>
          </div>
        {/if}
        <div>
          <h4 class="font-medium text-vscode-foreground">env</h4>
          <p class="text-vscode-foreground" style="opacity: 0.6;">get(key), set(key, value), unset(key), all()</p>
        </div>
        <div>
          <h4 class="font-medium text-vscode-foreground">variables</h4>
          <p class="text-vscode-foreground" style="opacity: 0.6;">get(key), set(key, value), clear()</p>
        </div>
        <div>
          <h4 class="font-medium text-vscode-foreground">utils</h4>
          <p class="text-vscode-foreground" style="opacity: 0.6;">uuid(), timestamp(), isoTimestamp(), randomInt(min, max), base64Encode(text), base64Decode(text), md5(text), sha256(text), hmacSha256(text, secret)</p>
        </div>
        {#if activeTab === 'post'}
          <div>
            <h4 class="font-medium text-vscode-foreground">test(name, fn)</h4>
            <p class="text-vscode-foreground" style="opacity: 0.6;">Define a test case</p>
          </div>
          <div>
            <h4 class="font-medium text-vscode-foreground">expect(value)</h4>
            <p class="text-vscode-foreground" style="opacity: 0.6;">toBe, toEqual, toContain, toHaveProperty, toBeTruthy, toBeFalsy, toBeGreaterThan, toBeLessThan, toMatch, toHaveLength, not</p>
          </div>
        {/if}
      </div>
    </div>
  </details>
</div>
