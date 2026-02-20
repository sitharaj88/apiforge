<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface HistoryEntry {
    id: string;
    request: {
      method: string;
      name: string;
      url: string;
    };
    response?: {
      status: number;
    };
    timestamp: number;
  }

  export let history: HistoryEntry[] = [];

  const dispatch = createEventDispatcher();

  function formatTimestamp(ts: number): string {
    const now = Date.now();
    const diff = now - ts;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function getMethodColor(method: string): string {
    const colors: Record<string, string> = {
      GET: 'text-green-400',
      POST: 'text-yellow-400',
      PUT: 'text-blue-400',
      PATCH: 'text-purple-400',
      DELETE: 'text-red-400',
      HEAD: 'text-gray-400',
      OPTIONS: 'text-cyan-400',
    };
    return colors[method] || 'text-vscode-foreground';
  }

  function getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return 'text-green-400';
    if (status >= 300 && status < 400) return 'text-yellow-400';
    if (status >= 400 && status < 500) return 'text-orange-400';
    return 'text-red-400';
  }

  function getUrlPath(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  }
</script>

<div class="flex flex-col h-full bg-vscode-sidebar-bg/50 backdrop-blur-sm">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border bg-vscode-editor-background/30">
    <span class="text-xs font-semibold text-vscode-foreground/70 uppercase tracking-wider">History</span>
    {#if history.length > 0}
      <button
        class="p-1.5 rounded-md hover:bg-red-500/10 text-vscode-foreground/70 hover:text-red-400 transition-all duration-200"
        title="Clear History"
        on:click={() => dispatch('clearHistory')}
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- History List -->
  <div class="flex-1 overflow-auto py-2">
    {#if history.length === 0}
      <div class="flex flex-col items-center justify-center h-full p-6 text-center text-vscode-foreground/50">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 flex items-center justify-center border border-vscode-border shadow-sm">
          <svg class="w-8 h-8 text-vscode-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/70">No history yet</p>
        <p class="text-xs mt-1.5 text-vscode-foreground/50">Send a request to start</p>
      </div>
    {:else}
      <div class="space-y-1 px-2">
      {#each history as entry (entry.id)}
        <div
          class="flex items-start gap-3 w-full px-3 py-2.5 rounded-md hover:bg-vscode-list-hover/50 group transition-colors duration-150 border border-transparent hover:border-vscode-border/50 text-left cursor-pointer"
          role="button"
          tabindex="0"
          on:click={() => dispatch('selectHistory', { entry })}
          on:keydown={(e) => e.key === 'Enter' && dispatch('selectHistory', { entry })}
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5">
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-vscode-editor-background/50 border border-vscode-border/50 {getMethodColor(entry.request.method)}">{entry.request.method}</span>
              {#if entry.response}
                <span class="text-xs font-mono {getStatusColor(entry.response.status)}">{entry.response.status}</span>
              {/if}
            </div>
            <div class="text-xs text-vscode-foreground truncate mt-0.5" title={entry.request.url}>
              {getUrlPath(entry.request.url)}
            </div>
            <div class="text-xs mt-0.5 text-vscode-foreground" style="opacity: 0.4;">
              {formatTimestamp(entry.timestamp)}
            </div>
          </div>
          <button
            class="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-vscode-foreground hover:text-red-400 flex-shrink-0"
            title="Delete"
            on:click|stopPropagation={() => dispatch('deleteHistory', { id: entry.id })}
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    {/if}
  </div>
</div>
