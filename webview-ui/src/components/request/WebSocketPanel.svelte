<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import KeyValueEditor from '../shared/KeyValueEditor.svelte';
  import WebSocketMessages from './WebSocketMessages.svelte';
  import type { KeyValue } from '../../lib/stores';

  export let url = 'wss://';
  export let headers: KeyValue[] = [{ id: '1', key: '', value: '', enabled: true }];
  export let status: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  export let messages: Array<{
    id: string;
    type: 'sent' | 'received' | 'system';
    data: string;
    timestamp: number;
    format?: 'text' | 'json' | 'binary';
  }> = [];
  export let error = '';

  const dispatch = createEventDispatcher<{
    connect: { url: string; headers: KeyValue[] };
    disconnect: void;
    send: string;
    ping: void;
    clear: void;
  }>();

  let messageInput = '';
  let messageFormat: 'text' | 'json' = 'text';
  let showHeaders = false;

  const statusColors = {
    disconnected: 'bg-gray-500',
    connecting: 'bg-yellow-500',
    connected: 'bg-green-500',
    error: 'bg-red-500'
  };

  const statusLabels = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Error'
  };

  function handleConnect() {
    if (status === 'connected') {
      dispatch('disconnect');
    } else {
      dispatch('connect', { url, headers });
    }
  }

  function handleSend() {
    if (!messageInput.trim() || status !== 'connected') return;

    // Validate JSON if format is json
    if (messageFormat === 'json') {
      try {
        JSON.parse(messageInput);
      } catch {
        return; // Invalid JSON
      }
    }

    dispatch('send', messageInput);
    messageInput = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSend();
    }
  }

  function handlePing() {
    dispatch('ping');
  }

  function handleClear() {
    dispatch('clear');
  }

  function formatMessage() {
    if (messageFormat === 'json') {
      try {
        const parsed = JSON.parse(messageInput);
        messageInput = JSON.stringify(parsed, null, 2);
      } catch {
        // Invalid JSON
      }
    }
  }

  function handleHeadersChange(e: CustomEvent<KeyValue[]>) {
    headers = e.detail;
  }
</script>

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl overflow-hidden shadow-inner m-4">
  <!-- Connection Bar -->
  <div class="flex items-center gap-3 p-4 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl">
    <!-- Status Indicator -->
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner">
      <span class="w-2.5 h-2.5 rounded-full {statusColors[status]} shadow-[0_0_8px_currentColor]"></span>
      <span class="text-xs font-medium text-vscode-foreground/80 uppercase tracking-wider">
        {statusLabels[status]}
      </span>
    </div>

    <!-- URL Input -->
    <div class="flex-1 relative">
      <input
        type="text"
        class="input w-full font-mono text-sm bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 pl-10"
        placeholder="wss://example.com/socket"
        bind:value={url}
        disabled={status === 'connected' || status === 'connecting'}
      />
      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-vscode-foreground/40">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      </div>
    </div>

    <!-- Connect/Disconnect Button -->
    <button
      class="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed {status === 'connected' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30' : 'bg-gradient-to-r from-api-primary to-api-purple text-white hover:opacity-90 shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.3)]'}"
      on:click={handleConnect}
      disabled={status === 'connecting' || !url.trim()}
    >
      {#if status === 'connecting'}
        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Connecting...
      {:else if status === 'connected'}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
        Disconnect
      {:else}
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
        Connect
      {/if}
    </button>

    <!-- Headers Toggle -->
    <button
      class="p-2 rounded-lg transition-colors {showHeaders ? 'bg-api-primary/20 text-api-primary border border-api-primary/30' : 'text-vscode-foreground/60 hover:bg-vscode-editor-background/80 hover:text-vscode-foreground'}"
      on:click={() => (showHeaders = !showHeaders)}
      title="Headers"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="px-4 py-3 text-sm text-red-400 bg-red-500/10 border-b border-red-500/20 flex items-start gap-3 shadow-inner">
      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p>{error}</p>
    </div>
  {/if}

  <!-- Headers Panel -->
  {#if showHeaders}
    <div class="p-4 border-b border-vscode-border/30 bg-vscode-editor-background/50 backdrop-blur-sm shadow-inner">
      <h3 class="text-xs font-medium text-vscode-foreground/70 mb-3 uppercase tracking-wider flex items-center gap-2">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        Connection Headers
      </h3>
      <KeyValueEditor
        items={headers}
        on:change={handleHeadersChange}
      />
    </div>
  {/if}

  <!-- Messages Area -->
  <div class="flex-1 overflow-hidden bg-vscode-editor-background/30">
    <WebSocketMessages {messages} on:clear={handleClear} />
  </div>

  <!-- Message Input -->
  <div class="border-t border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl">
    <!-- Format Tabs -->
    <div class="flex items-center gap-3 px-4 py-2 border-b border-vscode-border/20">
      <div class="flex bg-vscode-editor-background/50 p-1 rounded-lg border border-vscode-border/30">
        <button
          class="text-xs px-3 py-1.5 rounded-md font-medium transition-all duration-200 {messageFormat === 'text' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
          style={messageFormat !== 'text' ? 'opacity: 0.7;' : ''}
          on:click={() => (messageFormat = 'text')}
        >
          Text
        </button>
        <button
          class="text-xs px-3 py-1.5 rounded-md font-medium transition-all duration-200 {messageFormat === 'json' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
          style={messageFormat !== 'json' ? 'opacity: 0.7;' : ''}
          on:click={() => (messageFormat = 'json')}
        >
          JSON
        </button>
      </div>

      <div class="flex-1"></div>

      {#if messageFormat === 'json'}
        <button
          class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors px-2 py-1.5 rounded-md hover:bg-api-primary/10"
          on:click={formatMessage}
        >
          Format
        </button>
      {/if}

      <div class="w-px h-4 bg-vscode-border/50"></div>

      <button
        class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors px-3 py-1.5 rounded-md hover:bg-api-primary/10 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-vscode-foreground/70"
        on:click={handlePing}
        disabled={status !== 'connected'}
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
        </svg>
        Ping
      </button>
    </div>

    <!-- Input Area -->
    <div class="flex gap-3 p-4">
      <textarea
        class="input flex-1 font-mono text-sm resize-none bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
        rows="3"
        placeholder={messageFormat === 'json' ? '{\n  "message": "Hello"\n}' : 'Enter message...'}
        bind:value={messageInput}
        on:keydown={handleKeydown}
        disabled={status !== 'connected'}
      ></textarea>
      <button
        class="px-6 py-2 rounded-xl bg-gradient-to-r from-api-primary to-api-purple text-white text-sm font-medium hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none self-end h-[42px]"
        on:click={handleSend}
        disabled={status !== 'connected' || !messageInput.trim()}
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        Send
      </button>
    </div>
  </div>
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
