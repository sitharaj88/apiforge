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

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl shadow-sm">
    <div class="flex items-center gap-3">
      <!-- Filter Input -->
      <div class="relative">
        <input
          type="text"
          class="input py-1.5 pl-8 pr-3 text-xs w-[180px] bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
          placeholder="Filter messages..."
          bind:value={filter}
        />
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-vscode-foreground/40">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
      </div>

      <!-- Type Filter -->
      <div class="relative">
        <select
          class="input py-1.5 pl-3 pr-8 text-xs bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg appearance-none"
          bind:value={filterType}
        >
          <option value="all">All Messages</option>
          <option value="sent">Sent</option>
          <option value="received">Received</option>
          <option value="system">System</option>
        </select>
        <div class="absolute right-2.5 top-1/2 -translate-y-1/2 text-vscode-foreground/40 pointer-events-none">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 px-2.5 py-1 rounded-md bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner">
        <span class="text-xs font-medium text-vscode-foreground/70">
          {filteredMessages.length}
        </span>
        <span class="text-[10px] uppercase tracking-wider text-vscode-foreground/40">
          Msg{filteredMessages.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div class="w-px h-4 bg-vscode-border/50"></div>

      <!-- Auto-scroll Toggle -->
      <button
        class="p-1.5 rounded-md transition-all duration-200 flex items-center gap-1.5 {autoScroll ? 'bg-api-primary/20 text-api-primary border border-api-primary/30 shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.2)]' : 'text-vscode-foreground/50 hover:bg-vscode-editor-background/80 hover:text-vscode-foreground/80 border border-transparent'}"
        on:click={() => (autoScroll = !autoScroll)}
        title="Auto-scroll"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      <!-- Clear Button -->
      <button
        class="p-1.5 rounded-md text-vscode-foreground/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-200"
        on:click={() => dispatch('clear')}
        title="Clear messages"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Messages List -->
  <div
    bind:this={messagesContainer}
    class="flex-1 overflow-auto p-4 space-y-3"
    on:scroll={handleScroll}
  >
    {#if filteredMessages.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/40">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 border border-vscode-border/30 flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/60">No messages yet</p>
        <p class="text-xs mt-1">Connect to a WebSocket server to start</p>
      </div>
    {:else}
      {#each filteredMessages as msg (msg.id)}
        <div class="group relative rounded-xl border border-vscode-border/20 bg-vscode-editor-background/40 backdrop-blur-sm hover:bg-vscode-editor-background/60 hover:border-vscode-border/40 transition-all duration-200 shadow-sm overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-vscode-border/10 bg-vscode-editor-background/30">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-6 h-6 rounded-full bg-vscode-editor-background/80 border border-vscode-border/30 shadow-inner {getTypeColor(msg.type)}">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  {@html getTypeIcon(msg.type)}
                </svg>
              </div>
              <span class="text-xs font-semibold {getTypeColor(msg.type)} uppercase tracking-wider">
                {msg.type}
              </span>
              {#if msg.format && msg.format !== 'text'}
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-vscode-editor-background/80 border border-vscode-border/30 text-vscode-foreground/70 uppercase tracking-wider shadow-inner">
                  {msg.format}
                </span>
              {/if}
            </div>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-medium text-vscode-foreground/40 uppercase tracking-wider">
                {formatTimestamp(msg.timestamp)}
              </span>
              <button
                class="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-vscode-editor-background/80 border border-transparent hover:border-vscode-border/30"
                class:text-green-400={copiedId === msg.id}
                class:text-vscode-foreground={copiedId !== msg.id}
                on:click={() => copyMessage(msg)}
                title="Copy"
              >
                {#if copiedId === msg.id}
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                {:else}
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                {/if}
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="p-4 bg-vscode-editor-background/20">
            <pre class="text-xs font-mono text-vscode-foreground/90 whitespace-pre-wrap break-all leading-relaxed">{formatData(msg.data, msg.format)}</pre>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
