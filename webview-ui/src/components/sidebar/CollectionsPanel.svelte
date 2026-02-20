<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';

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

  // ── Inline rename state ──────────────────────────────────────────
  type EditingItem =
    | { type: 'collection'; id: string }
    | { type: 'request'; collectionId: string; requestId: string };

  let editingItem: EditingItem | null = null;
  let editingName = '';
  let editInput: HTMLInputElement;

  async function startEditCollection(e: Event, id: string, name: string) {
    e.stopPropagation();
    e.preventDefault();
    if (editingItem) commitEdit();
    editingItem = { type: 'collection', id };
    editingName = name;
    await tick();
    editInput?.focus();
    editInput?.select();
  }

  async function startEditRequest(e: Event, collectionId: string, requestId: string, name: string) {
    e.stopPropagation();
    e.preventDefault();
    if (editingItem) commitEdit();
    editingItem = { type: 'request', collectionId, requestId };
    editingName = name;
    await tick();
    editInput?.focus();
    editInput?.select();
  }

  function commitEdit() {
    if (!editingItem) return;
    const captured = editingItem;
    const name = editingName.trim();
    editingItem = null; // close input first
    if (name) {
      if (captured.type === 'collection') {
        dispatch('renameCollection', { id: captured.id, name });
      } else {
        dispatch('renameRequest', { collectionId: captured.collectionId, requestId: captured.requestId, name });
      }
    }
  }

  function cancelEdit() {
    editingItem = null;
  }

  function handleEditKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commitEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelEdit(); }
  }

  // Commit when clicking anywhere outside the active input
  function handlePanelPointerDown(e: PointerEvent) {
    if (!editingItem) return;
    if (editInput && !editInput.contains(e.target as Node)) {
      commitEdit();
    }
  }

  // ────────────────────────────────────────────────────────────────

  function toggleCollection(_e: MouseEvent, id: string) {
    if (editingItem) return; // don't toggle while renaming
    toggleCollectionId(id);
  }

  function toggleCollectionId(id: string) {
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

<div class="flex flex-col h-full bg-vscode-sidebar-bg/30 backdrop-blur-xl border-r border-vscode-border/30 shadow-[4px_0_24px_rgba(0,0,0,0.1)]"
  on:pointerdown={handlePanelPointerDown}>
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/40 backdrop-blur-md">
    <span class="text-xs font-semibold text-vscode-foreground/80 uppercase tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Collections</span>
    <button
      class="p-1.5 rounded-md hover:bg-api-primary/20 text-vscode-foreground/70 hover:text-api-primary transition-all duration-300 hover:shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.3)]"
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
    <div class="px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/50 backdrop-blur-md shadow-inner">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        class="input w-full text-sm py-1.5 px-3 bg-vscode-editor-background/50 border-vscode-border/50 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-300 shadow-inner"
        placeholder="Collection name..."
        bind:value={newCollectionName}
        on:keydown={(e) => {
          if (e.key === 'Enter') createCollection();
          if (e.key === 'Escape') showNewCollectionInput = false;
        }}
        autofocus
      />
      <div class="flex gap-2 mt-3">
        <button class="btn btn-primary py-1.5 px-3 text-xs flex-1 shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.3)] hover:shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.5)] transition-all duration-300" on:click={createCollection}>Create</button>
        <button class="btn btn-secondary py-1.5 px-3 text-xs flex-1 bg-vscode-editor-background/50 hover:bg-vscode-editor-background/80 border border-vscode-border/50 transition-all duration-300" on:click={() => showNewCollectionInput = false}>Cancel</button>
      </div>
    </div>
  {/if}

  <!-- Collections List -->
  <div class="flex-1 overflow-auto py-2 custom-scrollbar">
    {#if collections.length === 0}
      <div class="flex flex-col items-center justify-center h-full p-6 text-center text-vscode-foreground/50">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/30 backdrop-blur-sm flex items-center justify-center border border-vscode-border/30 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <svg class="w-8 h-8 text-vscode-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/70">No collections yet</p>
        <button
          class="text-sm text-api-primary mt-2 hover:text-api-purple hover:underline transition-colors drop-shadow-[0_0_8px_rgba(var(--api-primary-rgb),0.5)]"
          on:click={() => showNewCollectionInput = true}
        >
          Create your first collection
        </button>
      </div>
    {:else}
      <div class="space-y-1 px-2">
      {#each collections as collection (collection.id)}
        <div class="rounded-lg overflow-hidden border border-transparent hover:border-vscode-border/30 hover:bg-vscode-editor-background/30 transition-all duration-300">
          <!-- Collection Header -->
          <div
            class="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-vscode-list-hover/50 group cursor-pointer rounded-md transition-colors duration-150"
            role="button"
            tabindex="0"
            on:click={(e) => toggleCollection(e, collection.id)}
            on:keydown={(e) => e.key === 'Enter' && toggleCollectionId(collection.id)}
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
            <svg class="w-4.5 h-4.5 text-api-primary/80 drop-shadow-[0_0_5px_rgba(var(--api-primary-rgb),0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            {#if editingItem?.type === 'collection' && editingItem.id === collection.id}
              <!-- svelte-ignore a11y_autofocus -->
              <input
                bind:this={editInput}
                class="inline-name-input flex-1"
                bind:value={editingName}
                on:click|stopPropagation
                on:keydown={handleEditKeydown}
                autofocus
              />
            {:else}
              <span
                role="button"
                tabindex="0"
                class="flex-1 text-sm font-medium text-left text-vscode-foreground/90 truncate group-hover:text-api-primary transition-colors duration-200"
                title="Double-click to rename"
                on:dblclick={(e) => startEditCollection(e, collection.id, collection.name)}
                on:keydown={(e) => e.key === 'F2' && startEditCollection(e, collection.id, collection.name)}
              >{collection.name}</span>
            {/if}
            <span class="text-xs font-medium px-1.5 py-0.5 rounded-md bg-vscode-editor-background/50 text-vscode-foreground/50 border border-vscode-border/30 shadow-inner">{collection.requests.length}</span>
            <button
              class="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-api-primary/15 text-vscode-foreground/40 hover:text-api-primary transition-all duration-200"
              title="Add request to collection"
              on:click|stopPropagation={() => { dispatch('addRequest', { collectionId: collection.id }); expandedCollections.add(collection.id); expandedCollections = expandedCollections; }}
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
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
            <div class="bg-vscode-editor-background/10 pb-1 border-l-2 border-api-primary/20 ml-4 pl-1 mt-1">
              {#each collection.requests as request (request.id)}
                <div
                  class="flex items-center gap-3 w-full px-3 py-1.5 hover:bg-vscode-list-hover/50 group cursor-pointer transition-colors duration-150 rounded-md"
                  role="button"
                  tabindex="0"
                  on:click={(e) => { if (editingItem) { e.stopPropagation(); return; } dispatch('selectRequest', { collectionId: collection.id, request }); }}
                  on:keydown={(e) => e.key === 'Enter' && !editingItem && dispatch('selectRequest', { collectionId: collection.id, request })}
                >
                  <span class="text-[10px] font-mono font-bold w-12 {getMethodColor(request.method)} drop-shadow-[0_0_5px_currentColor]">{request.method}</span>
                  {#if editingItem?.type === 'request' && editingItem.collectionId === collection.id && editingItem.requestId === request.id}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      bind:this={editInput}
                      class="inline-name-input flex-1"
                      bind:value={editingName}
                      on:click|stopPropagation
                      on:keydown={handleEditKeydown}
                      autofocus
                    />
                  {:else}
                    <span
                      role="button"
                      tabindex="0"
                      class="flex-1 text-xs text-left text-vscode-foreground/80 truncate group-hover:text-vscode-foreground transition-colors duration-200"
                      title="Double-click to rename"
                      on:dblclick={(e) => startEditRequest(e, collection.id, request.id, request.name)}
                      on:keydown={(e) => e.key === 'F2' && startEditRequest(e, collection.id, request.id, request.name)}
                    >{request.name}</span>
                  {/if}
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
                <div class="px-3 py-2 text-xs text-vscode-foreground/40 italic">
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

  /* Inline rename input — inherits text style, minimal chrome */
  .inline-name-input {
    background: var(--vscode-input-background, var(--vscode-editor-background));
    color: var(--vscode-input-foreground, var(--vscode-foreground));
    border: 1px solid var(--vscode-focusBorder, rgba(var(--api-primary-rgb), 0.6));
    border-radius: 3px;
    padding: 0 4px;
    font-size: inherit;
    font-weight: inherit;
    line-height: 1.4;
    outline: none;
    width: 100%;
    min-width: 0;
  }
</style>
