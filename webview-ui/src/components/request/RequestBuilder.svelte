<script lang="ts">
  import UrlBar from './UrlBar.svelte';
  import KeyValueEditor from '../shared/KeyValueEditor.svelte';
  import BodyEditor from './BodyEditor.svelte';
  import AuthEditor from './AuthEditor.svelte';
  import GraphQLEditor from './GraphQLEditor.svelte';
  import WebSocketPanel from './WebSocketPanel.svelte';
  import ScriptEditor from './ScriptEditor.svelte';
  import AssertionEditor from './AssertionEditor.svelte';
  import {
    activeRequest,
    activeTab,
    error,
    graphqlSchema,
    introspectGraphQL,
    wsStatus,
    wsMessages,
    wsError,
    wsConnect,
    wsDisconnect,
    wsSend,
    wsPing,
    wsClearMessages,
    generateId,
    type KeyValue,
  } from '../../lib/stores';

  type Protocol = 'http' | 'graphql' | 'websocket';

  let protocol: Protocol = 'http';

  const httpTabs = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'assertions', label: 'Tests' },
  ] as const;

  const graphqlTabs = [
    { id: 'query', label: 'Query' },
    { id: 'headers', label: 'Headers' },
    { id: 'auth', label: 'Auth' },
  ] as const;

  $: currentTabs = protocol === 'http' ? httpTabs : protocol === 'graphql' ? graphqlTabs : [];

  function handleTabChange(tabId: string) {
    activeTab.set(tabId);
  }

  function handleProtocolChange(newProtocol: Protocol) {
    protocol = newProtocol;
    // Reset to first tab when protocol changes
    if (newProtocol === 'http') {
      activeTab.set('params');
    } else if (newProtocol === 'graphql') {
      activeTab.set('query');
    }
  }

  function getParamsCount(): number {
    return $activeRequest.params.filter(p => p.enabled && p.key).length;
  }

  function getHeadersCount(): number {
    return $activeRequest.headers.filter(h => h.enabled && h.key).length;
  }

  // GraphQL state
  let graphqlQuery = '';
  let graphqlVariables = '{}';

  // WebSocket state
  let localWsUrl = 'wss://';
  let localWsHeaders: KeyValue[] = [{ id: generateId(), key: '', value: '', enabled: true }];

  // Scripts state
  let preScript = '';
  let postScript = '';

  // Assertions state
  let assertions: any[] = [];

  // Handle WebSocket events
  function handleWsConnect(e: CustomEvent<{ url: string; headers: KeyValue[] }>) {
    localWsUrl = e.detail.url;
    localWsHeaders = e.detail.headers;
    wsConnect(e.detail.url, e.detail.headers);
  }

  function handleWsDisconnect() {
    wsDisconnect();
  }

  function handleWsSend(e: CustomEvent<string>) {
    wsSend(e.detail);
  }

  function handleWsPing() {
    wsPing();
  }

  function handleWsClear() {
    wsClearMessages();
  }

  // Handle GraphQL introspection
  function handleIntrospect() {
    if ($activeRequest.url) {
      const headers: Record<string, string> = {};
      $activeRequest.headers.filter(h => h.enabled && h.key).forEach(h => {
        headers[h.key] = h.value;
      });
      introspectGraphQL($activeRequest.url, headers);
    }
  }
</script>

<div class="flex flex-col h-full bg-vscode-editor-background">
  <!-- Protocol Selector -->
  <div class="flex items-center gap-3 px-6 py-3 border-b border-vscode-border bg-vscode-sidebar-bg/50 backdrop-blur-sm">
    <span class="text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider">Protocol</span>
    <div class="flex rounded-lg overflow-hidden border border-vscode-border bg-vscode-editor-background/50 shadow-sm">
      <button
        class="px-4 py-1.5 text-xs font-medium transition-all duration-200 {protocol === 'http' ? 'bg-blue-500/10 text-blue-400 shadow-inner' : 'text-vscode-foreground hover:bg-vscode-list-hover'}"
        on:click={() => handleProtocolChange('http')}
      >
        HTTP
      </button>
      <button
        class="px-4 py-1.5 text-xs font-medium border-l border-vscode-border transition-all duration-200 {protocol === 'graphql' ? 'bg-purple-500/10 text-purple-400 shadow-inner' : 'text-vscode-foreground hover:bg-vscode-list-hover'}"
        on:click={() => handleProtocolChange('graphql')}
      >
        GraphQL
      </button>
      <button
        class="px-4 py-1.5 text-xs font-medium border-l border-vscode-border transition-all duration-200 {protocol === 'websocket' ? 'bg-green-500/10 text-green-400 shadow-inner' : 'text-vscode-foreground hover:bg-vscode-list-hover'}"
        on:click={() => handleProtocolChange('websocket')}
      >
        WebSocket
      </button>
    </div>
  </div>

  {#if protocol === 'websocket'}
    <!-- WebSocket Panel -->
    <WebSocketPanel
      url={localWsUrl}
      headers={localWsHeaders}
      status={$wsStatus}
      messages={$wsMessages}
      error={$wsError}
      on:connect={handleWsConnect}
      on:disconnect={handleWsDisconnect}
      on:send={handleWsSend}
      on:ping={handleWsPing}
      on:clear={handleWsClear}
    />
  {:else}
    <!-- URL Bar (HTTP and GraphQL) -->
    <div class="p-6 border-b border-vscode-border bg-vscode-editor-background/30">
      <UrlBar />

      {#if $error}
        <div class="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-start gap-2 shadow-sm">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{$error}</span>
        </div>
      {/if}
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-2 px-6 border-b border-vscode-border bg-vscode-sidebar-bg/30">
      {#each currentTabs as tab}
        <button
          class="tab"
          class:tab-active={$activeTab === tab.id}
          on:click={() => handleTabChange(tab.id)}
        >
          {tab.label}
          {#if tab.id === 'params' && getParamsCount() > 0}
            <span class="ml-1.5 badge">{getParamsCount()}</span>
          {:else if tab.id === 'headers' && getHeadersCount() > 0}
            <span class="ml-1.5 badge">{getHeadersCount()}</span>
          {:else if tab.id === 'scripts' && (preScript.trim() || postScript.trim())}
            <span class="ml-1.5 w-2 h-2 rounded-full bg-blue-400 inline-block shadow-[0_0_8px_rgba(96,165,250,0.6)]"></span>
          {:else if tab.id === 'assertions' && assertions.length > 0}
            <span class="ml-1.5 badge">{assertions.length}</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-hidden">
      {#if protocol === 'graphql'}
        {#if $activeTab === 'query'}
          <GraphQLEditor
            query={graphqlQuery}
            variables={graphqlVariables}
            schema={$graphqlSchema}
            on:queryChange={(e) => graphqlQuery = e.detail}
            on:variablesChange={(e) => graphqlVariables = e.detail}
            on:introspect={handleIntrospect}
          />
        {:else if $activeTab === 'headers'}
          <div class="p-4">
            <KeyValueEditor
              items={$activeRequest.headers}
              on:change={(e) => activeRequest.update(r => ({ ...r, headers: e.detail }))}
              keyPlaceholder="Header name"
              valuePlaceholder="Value"
            />
          </div>
        {:else if $activeTab === 'auth'}
          <div class="p-4">
            <AuthEditor />
          </div>
        {/if}
      {:else}
        <!-- HTTP Protocol -->
        {#if $activeTab === 'params'}
          <div class="p-4 h-full overflow-auto">
            <KeyValueEditor
              items={$activeRequest.params}
              on:change={(e) => activeRequest.update(r => ({ ...r, params: e.detail }))}
              keyPlaceholder="Parameter name"
              valuePlaceholder="Value"
            />
          </div>
        {:else if $activeTab === 'headers'}
          <div class="p-4 h-full overflow-auto">
            <KeyValueEditor
              items={$activeRequest.headers}
              on:change={(e) => activeRequest.update(r => ({ ...r, headers: e.detail }))}
              keyPlaceholder="Header name"
              valuePlaceholder="Value"
            />
          </div>
        {:else if $activeTab === 'body'}
          <div class="h-full overflow-auto">
            <BodyEditor />
          </div>
        {:else if $activeTab === 'auth'}
          <div class="p-4 h-full overflow-auto">
            <AuthEditor />
          </div>
        {:else if $activeTab === 'scripts'}
          <ScriptEditor
            {preScript}
            {postScript}
            on:preScriptChange={(e) => preScript = e.detail}
            on:postScriptChange={(e) => postScript = e.detail}
          />
        {:else if $activeTab === 'assertions'}
          <AssertionEditor
            {assertions}
            on:change={(e) => assertions = e.detail}
          />
        {/if}
      {/if}
    </div>
  {/if}
</div>
