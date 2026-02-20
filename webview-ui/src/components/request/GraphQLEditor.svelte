<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CodeEditor from '../shared/CodeEditor.svelte';
  import GraphQLVariables from './GraphQLVariables.svelte';

  export let query = '';
  export let variables = '{}';
  export let operationName = '';
  export let schema: any = null;

  const dispatch = createEventDispatcher<{
    queryChange: string;
    variablesChange: string;
    operationNameChange: string;
    introspect: void;
  }>();

  let activeTab: 'query' | 'variables' = 'query';
  let isIntrospecting = false;

  function handleQueryChange(e: CustomEvent<string>) {
    query = e.detail;
    dispatch('queryChange', query);

    // Extract operation name from query
    const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/);
    if (match && match[1]) {
      operationName = match[1];
      dispatch('operationNameChange', operationName);
    }
  }

  function handleVariablesChange(e: CustomEvent<string>) {
    variables = e.detail;
    dispatch('variablesChange', variables);
  }

  function handleIntrospect() {
    isIntrospecting = true;
    dispatch('introspect');
    setTimeout(() => {
      isIntrospecting = false;
    }, 2000);
  }

  function formatQuery() {
    // Simple GraphQL formatting
    let formatted = query.trim();
    let indent = 0;
    let result = '';
    let inString = false;

    for (let i = 0; i < formatted.length; i++) {
      const char = formatted[i];
      const prevChar = formatted[i - 1];

      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
        continue;
      }

      if (inString) {
        result += char;
        continue;
      }

      if (char === '{') {
        result += ' {\n';
        indent++;
        result += '  '.repeat(indent);
      } else if (char === '}') {
        indent--;
        result += '\n' + '  '.repeat(indent) + '}';
      } else if (char === '\n') {
        result += '\n' + '  '.repeat(indent);
      } else if (char === ' ' && formatted[i + 1] === ' ') {
        // Skip extra spaces
      } else {
        result += char;
      }
    }

    query = result.trim();
    dispatch('queryChange', query);
  }

  // Sample queries for quick start
  const sampleQueries = [
    {
      name: 'Basic Query',
      query: `query {
  users {
    id
    name
    email
  }
}`
    },
    {
      name: 'Query with Variables',
      query: `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts {
      title
    }
  }
}`,
      variables: '{\n  "id": "1"\n}'
    },
    {
      name: 'Mutation',
      query: `mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    name
    email
  }
}`,
      variables: '{\n  "input": {\n    "name": "John Doe",\n    "email": "john@example.com"\n  }\n}'
    }
  ];

  function insertSample(sample: (typeof sampleQueries)[0]) {
    query = sample.query;
    dispatch('queryChange', query);
    if (sample.variables) {
      variables = sample.variables;
      dispatch('variablesChange', variables);
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-vscode-border bg-vscode-sidebar-bg">
    <div class="flex items-center gap-2">
      <!-- Tabs -->
      <div class="flex">
        <button
          class="px-3 py-1 text-sm border-b-2 {activeTab === 'query'
            ? 'border-vscode-focus-border text-vscode-foreground'
            : 'border-transparent text-vscode-foreground'}"
          style={activeTab !== 'query' ? 'opacity: 0.6;' : ''}
          on:click={() => (activeTab = 'query')}
        >
          Query
        </button>
        <button
          class="px-3 py-1 text-sm border-b-2 {activeTab === 'variables'
            ? 'border-vscode-focus-border text-vscode-foreground'
            : 'border-transparent text-vscode-foreground'}"
          style={activeTab !== 'variables' ? 'opacity: 0.6;' : ''}
          on:click={() => (activeTab = 'variables')}
        >
          Variables
        </button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <!-- Sample Queries Dropdown -->
      <div class="relative group">
        <button class="text-xs text-vscode-link hover:text-vscode-link-hover">
          Examples
          <svg class="w-3 h-3 inline-block ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute right-0 top-full mt-1 w-48 py-1 bg-vscode-editor-bg border border-vscode-border rounded shadow-lg hidden group-hover:block z-10">
          {#each sampleQueries as sample}
            <button
              class="w-full px-3 py-1.5 text-left text-xs text-vscode-foreground hover:bg-vscode-list-hover"
              on:click={() => insertSample(sample)}
            >
              {sample.name}
            </button>
          {/each}
        </div>
      </div>

      <button
        class="text-xs text-vscode-link hover:text-vscode-link-hover"
        on:click={formatQuery}
        title="Format Query"
      >
        Format
      </button>

      <button
        class="text-xs text-vscode-link hover:text-vscode-link-hover flex items-center gap-1"
        class:opacity-50={isIntrospecting}
        disabled={isIntrospecting}
        on:click={handleIntrospect}
        title="Fetch Schema"
      >
        {#if isIntrospecting}
          <svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {/if}
        Schema
      </button>
    </div>
  </div>

  <!-- Operation Name (if detected) -->
  {#if operationName}
    <div class="px-3 py-1 text-xs bg-vscode-sidebar-bg border-b border-vscode-border">
      <span class="text-vscode-foreground" style="opacity: 0.6;">Operation:</span>
      <span class="ml-1 text-vscode-link">{operationName}</span>
    </div>
  {/if}

  <!-- Editor Content -->
  <div class="flex-1 overflow-hidden">
    {#if activeTab === 'query'}
      <CodeEditor
        value={query}
        language="graphql"
        placeholder="Enter your GraphQL query or mutation..."
        minHeight="100%"
        maxHeight="100%"
        on:change={handleQueryChange}
      />
    {:else}
      <GraphQLVariables
        value={variables}
        on:change={handleVariablesChange}
      />
    {/if}
  </div>

  <!-- Schema Types (if available) -->
  {#if schema && schema.types && schema.types.length > 0}
    <div class="border-t border-vscode-border">
      <details class="text-xs">
        <summary class="px-3 py-2 cursor-pointer hover:bg-vscode-list-hover text-vscode-foreground">
          Schema Types ({schema.types.length})
        </summary>
        <div class="max-h-32 overflow-auto px-3 py-2 bg-vscode-sidebar-bg">
          <div class="flex flex-wrap gap-1">
            {#each schema.types.slice(0, 50) as type}
              <span class="px-1.5 py-0.5 text-xs rounded bg-vscode-badge-bg text-vscode-badge-fg">
                {type.name}
              </span>
            {/each}
            {#if schema.types.length > 50}
              <span class="px-1.5 py-0.5 text-xs text-vscode-foreground" style="opacity: 0.5;">
                +{schema.types.length - 50} more
              </span>
            {/if}
          </div>
        </div>
      </details>
    </div>
  {/if}
</div>

<style>
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
