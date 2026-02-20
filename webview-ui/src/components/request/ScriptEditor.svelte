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

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl overflow-hidden shadow-inner m-4">
  <!-- Tabs -->
  <div class="flex items-center justify-between px-4 py-2.5 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl">
    <div class="flex bg-vscode-editor-background/50 p-1 rounded-lg border border-vscode-border/30">
      <button
        class="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 {activeTab === 'pre' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
        style={activeTab !== 'pre' ? 'opacity: 0.7;' : ''}
        on:click={() => (activeTab = 'pre')}
      >
        Pre-request
        {#if preScript.trim()}
          <span class="w-2 h-2 rounded-full {activeTab === 'pre' ? 'bg-white' : 'bg-api-primary'} shadow-[0_0_8px_var(--api-primary)]"></span>
        {/if}
      </button>
      <button
        class="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 {activeTab === 'post' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
        style={activeTab !== 'post' ? 'opacity: 0.7;' : ''}
        on:click={() => (activeTab = 'post')}
      >
        Tests
        {#if postScript.trim()}
          <span class="w-2 h-2 rounded-full {activeTab === 'post' ? 'bg-white' : 'bg-api-primary'} shadow-[0_0_8px_var(--api-primary)]"></span>
        {/if}
      </button>
    </div>

    <!-- Snippets Dropdown -->
    <div class="relative group">
      <button class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-api-primary/10">
        Snippets
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div class="absolute right-0 top-full mt-2 w-56 py-1.5 bg-vscode-editor-background/95 backdrop-blur-xl border border-vscode-border/30 rounded-xl shadow-2xl hidden group-hover:block z-50 ring-1 ring-white/5 origin-top-right transition-all">
        {#each currentSnippets as snippet}
          <button
            class="w-full px-4 py-2 text-left text-sm text-vscode-foreground hover:bg-api-primary/10 hover:text-api-primary transition-colors"
            on:click={() => insertSnippet(snippet.code)}
          >
            {snippet.name}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Description -->
  <div class="px-4 py-2.5 text-xs bg-api-primary/5 border-b border-vscode-border/30 flex items-start gap-2">
    <svg class="w-4 h-4 text-api-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p class="text-vscode-foreground/70 leading-relaxed">
      {#if activeTab === 'pre'}
        Pre-request scripts run before the request is sent. Use them to set headers, generate tokens, or modify the request.
      {:else}
        Test scripts run after the response is received. Use them to validate responses and extract data.
      {/if}
    </p>
  </div>

  <!-- Editor -->
  <div class="flex-1 overflow-hidden bg-vscode-editor-background/50">
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
  <details class="border-t border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-md group">
    <summary class="px-4 py-2.5 cursor-pointer hover:bg-vscode-list-hover/50 text-vscode-foreground font-medium flex items-center gap-2 transition-colors text-xs">
      <svg class="w-4 h-4 text-vscode-foreground/50 group-open:rotate-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      API Reference
    </summary>
    <div class="px-4 py-3 text-xs bg-vscode-editor-background/30 border-t border-vscode-border/20 max-h-48 overflow-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-1">
          <h4 class="font-medium text-api-primary">request</h4>
          <p class="text-vscode-foreground/60 font-mono text-[10px]">url, method, headers, body, params</p>
        </div>
        {#if activeTab === 'post'}
          <div class="space-y-1">
            <h4 class="font-medium text-api-primary">response</h4>
            <p class="text-vscode-foreground/60 font-mono text-[10px]">status, statusText, headers, body, time, size</p>
          </div>
        {/if}
        <div class="space-y-1">
          <h4 class="font-medium text-api-primary">env</h4>
          <p class="text-vscode-foreground/60 font-mono text-[10px]">get(key), set(key, value), unset(key), all()</p>
        </div>
        <div class="space-y-1">
          <h4 class="font-medium text-api-primary">variables</h4>
          <p class="text-vscode-foreground/60 font-mono text-[10px]">get(key), set(key, value), clear()</p>
        </div>
        <div class="space-y-1 md:col-span-2">
          <h4 class="font-medium text-api-primary">utils</h4>
          <p class="text-vscode-foreground/60 font-mono text-[10px] leading-relaxed">uuid(), timestamp(), isoTimestamp(), randomInt(min, max), base64Encode(text), base64Decode(text), md5(text), sha256(text), hmacSha256(text, secret)</p>
        </div>
        {#if activeTab === 'post'}
          <div class="space-y-1">
            <h4 class="font-medium text-api-primary">test(name, fn)</h4>
            <p class="text-vscode-foreground/60 font-mono text-[10px]">Define a test case</p>
          </div>
          <div class="space-y-1">
            <h4 class="font-medium text-api-primary">expect(value)</h4>
            <p class="text-vscode-foreground/60 font-mono text-[10px] leading-relaxed">toBe, toEqual, toContain, toHaveProperty, toBeTruthy, toBeFalsy, toBeGreaterThan, toBeLessThan, toMatch, toHaveLength, not</p>
          </div>
        {/if}
      </div>
    </div>
  </details>
</div>
