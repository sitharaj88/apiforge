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

<div class="flex flex-col h-full">
  <!-- Connection Bar -->
  <div class="flex items-center gap-2 p-3 border-b border-vscode-border bg-vscode-sidebar-bg">
    <!-- Status Indicator -->
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full {statusColors[status]}"></span>
      <span class="text-xs text-vscode-foreground" style="opacity: 0.7;">
        {statusLabels[status]}
      </span>
    </div>

    <!-- URL Input -->
    <input
      type="text"
      class="input flex-1 font-mono text-sm"
      placeholder="wss://example.com/socket"
      bind:value={url}
      disabled={status === 'connected' || status === 'connecting'}
    />

    <!-- Connect/Disconnect Button -->
    <button
      class="btn {status === 'connected' ? 'btn-danger' : 'btn-primary'}"
      on:click={handleConnect}
      disabled={status === 'connecting' || !url.trim()}
    >
      {#if status === 'connecting'}
        <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      {:else if status === 'connected'}
        Disconnect
      {:else}
        Connect
      {/if}
    </button>

    <!-- Headers Toggle -->
    <button
      class="btn-icon text-vscode-foreground"
      class:text-vscode-link={showHeaders}
      on:click={() => (showHeaders = !showHeaders)}
      title="Headers"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>
  </div>

  <!-- Error Display -->
  {#if error}
    <div class="px-3 py-2 text-sm text-red-400 bg-red-900/20 border-b border-red-500/30">
      {error}
    </div>
  {/if}

  <!-- Headers Panel -->
  {#if showHeaders}
    <div class="p-3 border-b border-vscode-border bg-vscode-sidebar-bg">
      <h3 class="text-xs font-medium text-vscode-foreground mb-2" style="opacity: 0.7;">Connection Headers</h3>
      <KeyValueEditor
        items={headers}
        on:change={handleHeadersChange}
      />
    </div>
  {/if}

  <!-- Messages Area -->
  <div class="flex-1 overflow-hidden">
    <WebSocketMessages {messages} on:clear={handleClear} />
  </div>

  <!-- Message Input -->
  <div class="border-t border-vscode-border bg-vscode-sidebar-bg">
    <!-- Format Tabs -->
    <div class="flex items-center gap-2 px-3 py-1 border-b border-vscode-border">
      <button
        class="text-xs px-2 py-0.5 rounded {messageFormat === 'text'
          ? 'bg-vscode-button-bg text-vscode-button-fg'
          : 'text-vscode-foreground'}"
        style={messageFormat !== 'text' ? 'opacity: 0.6;' : ''}
        on:click={() => (messageFormat = 'text')}
      >
        Text
      </button>
      <button
        class="text-xs px-2 py-0.5 rounded {messageFormat === 'json'
          ? 'bg-vscode-button-bg text-vscode-button-fg'
          : 'text-vscode-foreground'}"
        style={messageFormat !== 'json' ? 'opacity: 0.6;' : ''}
        on:click={() => (messageFormat = 'json')}
      >
        JSON
      </button>

      <div class="flex-1"></div>

      {#if messageFormat === 'json'}
        <button
          class="text-xs text-vscode-link hover:text-vscode-link-hover"
          on:click={formatMessage}
        >
          Format
        </button>
      {/if}

      <button
        class="text-xs text-vscode-link hover:text-vscode-link-hover"
        on:click={handlePing}
        disabled={status !== 'connected'}
        class:opacity-50={status !== 'connected'}
      >
        Ping
      </button>
    </div>

    <!-- Input Area -->
    <div class="flex gap-2 p-3">
      <textarea
        class="input flex-1 font-mono text-sm resize-none"
        rows="3"
        placeholder={messageFormat === 'json' ? '{"message": "Hello"}' : 'Enter message...'}
        bind:value={messageInput}
        on:keydown={handleKeydown}
        disabled={status !== 'connected'}
      ></textarea>
      <button
        class="btn btn-primary self-end"
        on:click={handleSend}
        disabled={status !== 'connected' || !messageInput.trim()}
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        Send
      </button>
    </div>
  </div>
</div>

<style>
  .btn-danger {
    background-color: #dc2626;
    color: white;
  }

  .btn-danger:hover {
    background-color: #b91c1c;
  }

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
