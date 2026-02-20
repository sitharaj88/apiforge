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

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl overflow-hidden shadow-inner m-4">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-2.5 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl">
    <div class="flex items-center gap-2">
      <!-- Tabs -->
      <div class="flex bg-vscode-editor-background/50 p-1 rounded-lg border border-vscode-border/30">
        <button
          class="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 {activeTab === 'query' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
          style={activeTab !== 'query' ? 'opacity: 0.7;' : ''}
          on:click={() => (activeTab = 'query')}
        >
          Query
        </button>
        <button
          class="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 {activeTab === 'variables' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
          style={activeTab !== 'variables' ? 'opacity: 0.7;' : ''}
          on:click={() => (activeTab = 'variables')}
        >
          Variables
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <!-- Sample Queries Dropdown -->
      <div class="relative group">
        <button class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-api-primary/10">
          Examples
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute right-0 top-full mt-2 w-56 py-1.5 bg-vscode-editor-background/95 backdrop-blur-xl border border-vscode-border/30 rounded-xl shadow-2xl hidden group-hover:block z-50 ring-1 ring-white/5 origin-top-right transition-all">
          {#each sampleQueries as sample}
            <button
              class="w-full px-4 py-2 text-left text-sm text-vscode-foreground hover:bg-api-primary/10 hover:text-api-primary transition-colors"
              on:click={() => insertSample(sample)}
            >
              {sample.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="w-px h-4 bg-vscode-border/50"></div>

      <button
        class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors px-2 py-1.5 rounded-md hover:bg-api-primary/10"
        on:click={formatQuery}
        title="Format Query"
      >
        Format
      </button>

      <button
        class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-api-primary/10"
        class:opacity-50={isIntrospecting}
        disabled={isIntrospecting}
        on:click={handleIntrospect}
        title="Fetch Schema"
      >
        {#if isIntrospecting}
          <svg class="w-3.5 h-3.5 animate-spin text-api-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        {/if}
        Schema
      </button>
    </div>
  </div>

  <!-- Operation Name (if detected) -->
  {#if operationName}
    <div class="px-4 py-2 text-xs bg-api-primary/5 border-b border-vscode-border/30 flex items-center gap-2">
      <span class="text-vscode-foreground/60 font-medium uppercase tracking-wider">Operation:</span>
      <span class="text-api-primary font-mono font-bold bg-api-primary/10 px-2 py-0.5 rounded-md border border-api-primary/20">{operationName}</span>
    </div>
  {/if}

  <!-- Editor Content -->
  <div class="flex-1 overflow-hidden bg-vscode-editor-background/50">
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
    <div class="border-t border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-md">
      <details class="text-xs group">
        <summary class="px-4 py-2.5 cursor-pointer hover:bg-vscode-list-hover/50 text-vscode-foreground font-medium flex items-center gap-2 transition-colors">
          <svg class="w-4 h-4 text-vscode-foreground/50 group-open:rotate-90 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Schema Types <span class="bg-vscode-editor-background/50 px-1.5 py-0.5 rounded-md border border-vscode-border/30 text-vscode-foreground/70">{schema.types.length}</span>
        </summary>
        <div class="max-h-40 overflow-auto px-4 py-3 bg-vscode-editor-background/30 border-t border-vscode-border/20">
          <div class="flex flex-wrap gap-2">
            {#each schema.types.slice(0, 50) as type}
              <span class="px-2 py-1 text-[10px] font-mono rounded-md bg-api-primary/10 text-api-primary border border-api-primary/20 hover:bg-api-primary/20 transition-colors cursor-default">
                {type.name}
              </span>
            {/each}
            {#if schema.types.length > 50}
              <span class="px-2 py-1 text-[10px] font-mono rounded-md bg-vscode-editor-background/50 text-vscode-foreground/50 border border-vscode-border/30">
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
