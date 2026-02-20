<script lang="ts">
  import { createEventDispatcher, afterUpdate } from 'svelte';

  interface WebSocketMessage {
    id: string;
    type: 'sent' | 'received' | 'system';
    data: string;
    timestamp: number;
    format?: 'text' | 'json' | 'binary';
  }

  export let messages: WebSocketMessage[] = [];

  const dispatch = createEventDispatcher<{ clear: void }>();

  let messagesContainer: HTMLDivElement;
  let autoScroll = true;
  let filter = '';
  let filterType: 'all' | 'sent' | 'received' | 'system' = 'all';
  let copiedId: string | null = null;

  $: filteredMessages = messages.filter((msg) => {
    if (filterType !== 'all' && msg.type !== filterType) return false;
    if (filter && !msg.data.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  afterUpdate(() => {
    if (autoScroll && messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    autoScroll = scrollHeight - scrollTop - clientHeight < 50;
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleTimeString();
  }

  function formatData(data: string, format?: string): string {
    if (format === 'json') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    return data;
  }

  async function copyMessage(msg: WebSocketMessage) {
    await navigator.clipboard.writeText(msg.data);
    copiedId = msg.id;
    setTimeout(() => {
      copiedId = null;
    }, 1500);
  }

  function getTypeColor(type: WebSocketMessage['type']): string {
    switch (type) {
      case 'sent':
        return 'text-blue-400';
      case 'received':
        return 'text-green-400';
      case 'system':
        return 'text-yellow-400';
      default:
        return 'text-vscode-foreground';
    }
  }

  function getTypeIcon(type: WebSocketMessage['type']): string {
    switch (type) {
      case 'sent':
        return '<path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />';
      case 'received':
        return '<path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />';
      case 'system':
        return '<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
      default:
        return '';
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-vscode-border bg-vscode-sidebar-bg">
    <div class="flex items-center gap-2">
      <!-- Filter Input -->
      <input
        type="text"
        class="input py-1 text-xs max-w-[150px]"
        placeholder="Filter messages..."
        bind:value={filter}
      />

      <!-- Type Filter -->
      <select
        class="input py-1 text-xs"
        bind:value={filterType}
      >
        <option value="all">All</option>
        <option value="sent">Sent</option>
        <option value="received">Received</option>
        <option value="system">System</option>
      </select>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-xs text-vscode-foreground" style="opacity: 0.5;">
        {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
      </span>

      <!-- Auto-scroll Toggle -->
      <button
        class="text-xs flex items-center gap-1 {autoScroll ? 'text-vscode-link' : 'text-vscode-foreground'}"
        style={!autoScroll ? 'opacity: 0.5;' : ''}
        on:click={() => (autoScroll = !autoScroll)}
        title="Auto-scroll"
      >
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      <!-- Clear Button -->
      <button
        class="text-xs text-vscode-foreground hover:text-red-400"
        style="opacity: 0.6;"
        on:click={() => dispatch('clear')}
        title="Clear messages"
      >
        Clear
      </button>
    </div>
  </div>

  <!-- Messages List -->
  <div
    bind:this={messagesContainer}
    class="flex-1 overflow-auto"
    on:scroll={handleScroll}
  >
    {#if filteredMessages.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground" style="opacity: 0.5;">
        <svg class="w-12 h-12 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-sm">No messages yet</p>
        <p class="text-xs mt-1">Connect to a WebSocket server to start</p>
      </div>
    {:else}
      <div class="divide-y divide-vscode-border">
        {#each filteredMessages as msg (msg.id)}
          <div class="group px-3 py-2 hover:bg-vscode-list-hover">
            <!-- Header -->
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 {getTypeColor(msg.type)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  {@html getTypeIcon(msg.type)}
                </svg>
                <span class="text-xs font-medium {getTypeColor(msg.type)} capitalize">
                  {msg.type}
                </span>
                {#if msg.format && msg.format !== 'text'}
                  <span class="text-xs px-1.5 py-0.5 rounded bg-vscode-badge-bg text-vscode-badge-fg uppercase">
                    {msg.format}
                  </span>
                {/if}
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-vscode-foreground" style="opacity: 0.4;">
                  {formatTimestamp(msg.timestamp)}
                </span>
                <button
                  class="btn-icon opacity-0 group-hover:opacity-100 text-vscode-foreground"
                  class:text-green-400={copiedId === msg.id}
                  on:click={() => copyMessage(msg)}
                  title="Copy"
                >
                  {#if copiedId === msg.id}
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  {:else}
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  {/if}
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="ml-6">
              <pre class="text-xs font-mono text-vscode-foreground whitespace-pre-wrap break-all">{formatData(msg.data, msg.format)}</pre>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
