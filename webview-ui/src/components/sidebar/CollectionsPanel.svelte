<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Request {
    id: string;
    name: string;
    method: string;
    url: string;
  }

  interface Collection {
    id: string;
    name: string;
    requests: Request[];
    folders: any[];
  }

  export let collections: Collection[] = [];

  const dispatch = createEventDispatcher();

  let expandedCollections: Set<string> = new Set();
  let showNewCollectionInput = false;
  let newCollectionName = '';

  function toggleCollection(id: string) {
    if (expandedCollections.has(id)) {
      expandedCollections.delete(id);
    } else {
      expandedCollections.add(id);
    }
    expandedCollections = expandedCollections;
  }

  function createCollection() {
    if (newCollectionName.trim()) {
      dispatch('createCollection', { name: newCollectionName.trim() });
      newCollectionName = '';
      showNewCollectionInput = false;
    }
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
</script>

<div class="flex flex-col h-full bg-vscode-sidebar-bg/50 backdrop-blur-sm">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border bg-vscode-editor-background/30">
    <span class="text-xs font-semibold text-vscode-foreground/70 uppercase tracking-wider">Collections</span>
    <button
      class="p-1.5 rounded-md hover:bg-blue-500/10 text-vscode-foreground/70 hover:text-blue-400 transition-all duration-200"
      title="New Collection"
      on:click={() => showNewCollectionInput = true}
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>

  <!-- New Collection Input -->
  {#if showNewCollectionInput}
    <div class="px-4 py-3 border-b border-vscode-border bg-vscode-editor-background/50 shadow-inner">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        class="input w-full text-sm py-1.5 px-3 bg-vscode-editor-background border-vscode-border focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-200"
        placeholder="Collection name..."
        bind:value={newCollectionName}
        on:keydown={(e) => {
          if (e.key === 'Enter') createCollection();
          if (e.key === 'Escape') showNewCollectionInput = false;
        }}
        autofocus
      />
      <div class="flex gap-2 mt-3">
        <button class="btn btn-primary py-1.5 px-3 text-xs flex-1 shadow-sm" on:click={createCollection}>Create</button>
        <button class="btn btn-secondary py-1.5 px-3 text-xs flex-1" on:click={() => showNewCollectionInput = false}>Cancel</button>
      </div>
    </div>
  {/if}

  <!-- Collections List -->
  <div class="flex-1 overflow-auto py-2">
    {#if collections.length === 0}
      <div class="flex flex-col items-center justify-center h-full p-6 text-center text-vscode-foreground/50">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 flex items-center justify-center border border-vscode-border shadow-sm">
          <svg class="w-8 h-8 text-vscode-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/70">No collections yet</p>
        <button
          class="text-sm text-blue-400 mt-2 hover:text-blue-300 hover:underline transition-colors"
          on:click={() => showNewCollectionInput = true}
        >
          Create your first collection
        </button>
      </div>
    {:else}
      <div class="space-y-1 px-2">
      {#each collections as collection (collection.id)}
        <div class="rounded-lg overflow-hidden border border-transparent hover:border-vscode-border/50 transition-colors duration-200">
          <!-- Collection Header -->
          <div
            class="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-vscode-list-hover/50 group cursor-pointer rounded-md transition-colors duration-150"
            role="button"
            tabindex="0"
            on:click={() => toggleCollection(collection.id)}
            on:keydown={(e) => e.key === 'Enter' && toggleCollection(collection.id)}
          >
            <svg
              class="w-3.5 h-3.5 text-vscode-foreground/50 transition-transform duration-200"
              class:rotate-90={expandedCollections.has(collection.id)}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <svg class="w-4.5 h-4.5 text-blue-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span class="flex-1 text-sm font-medium text-left text-vscode-foreground/90 truncate">{collection.name}</span>
            <span class="text-xs font-medium px-1.5 py-0.5 rounded-md bg-vscode-editor-background/50 text-vscode-foreground/50 border border-vscode-border/50">{collection.requests.length}</span>
            <button
              class="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-vscode-foreground/40 hover:text-red-400 transition-all duration-200"
              title="Delete collection"
              on:click|stopPropagation={() => dispatch('deleteCollection', { id: collection.id })}
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <!-- Requests -->
          {#if expandedCollections.has(collection.id)}
            <div class="bg-vscode-editor-background/20 pb-1">
              {#each collection.requests as request (request.id)}
                <div
                  class="flex items-center gap-3 w-full px-3 py-1.5 pl-10 hover:bg-vscode-list-hover/50 group cursor-pointer transition-colors duration-150"
                  role="button"
                  tabindex="0"
                  on:click={() => dispatch('selectRequest', { collectionId: collection.id, request })}
                  on:keydown={(e) => e.key === 'Enter' && dispatch('selectRequest', { collectionId: collection.id, request })}
                >
                  <span class="text-[10px] font-mono font-bold w-12 {getMethodColor(request.method)}">{request.method}</span>
                  <span class="flex-1 text-xs text-left text-vscode-foreground/80 truncate">{request.name}</span>
                  <button
                    class="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-vscode-foreground/40 hover:text-red-400 transition-all duration-200"
                    title="Delete request"
                    on:click|stopPropagation={() => dispatch('deleteRequest', { collectionId: collection.id, requestId: request.id })}
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              {/each}
              {#if collection.requests.length === 0}
                <div class="px-3 py-2 pl-10 text-xs text-vscode-foreground/40 italic">
                  No requests
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .rotate-90 {
    transform: rotate(90deg);
  }

  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
</style>
