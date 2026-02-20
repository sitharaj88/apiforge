<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Collection {
    id: string;
    name: string;
    folders?: Collection[];
    requests?: any[];
  }

  export let collections: Collection[] = [];

  const dispatch = createEventDispatcher();

  let selectedCollectionId = collections.length > 0 ? collections[0].id : '';
  let newCollectionName = '';
  let isCreatingNew = false;

  function handleSave() {
    if (isCreatingNew && newCollectionName.trim()) {
      dispatch('createAndSave', { name: newCollectionName.trim() });
    } else if (selectedCollectionId) {
      dispatch('save', { collectionId: selectedCollectionId });
    }
  }

  function handleClose() {
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !isCreatingNew) {
      handleSave();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
  on:click={handleBackdropClick}
  role="presentation"
>
  <div
    class="modal-content w-full max-w-md mx-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Header with gradient -->
    <div class="modal-header flex items-center justify-between px-5 py-4">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-vscode-link/20">
          <svg class="w-5 h-5 text-vscode-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        </div>
        <div>
          <h2 id="modal-title" class="text-base font-semibold text-vscode-foreground">Save Request</h2>
          <p class="text-xs text-vscode-foreground" style="opacity: 0.5;">Add to collection</p>
        </div>
      </div>
      <button
        class="p-2 rounded-lg hover:bg-vscode-list-hover text-vscode-foreground transition-colors"
        style="opacity: 0.6;"
        on:click={handleClose}
        aria-label="Close"
        type="button"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="px-5 py-4">
      <!-- Toggle Pills -->
      <div class="flex rounded-xl bg-black/20 p-1 mb-5" role="tablist">
        <button
          class="toggle-pill flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all {!isCreatingNew ? 'toggle-pill-active' : 'text-vscode-foreground hover:text-vscode-foreground'}"
          on:click={() => isCreatingNew = false}
          role="tab"
          aria-selected={!isCreatingNew}
          type="button"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Existing
          </span>
        </button>
        <button
          class="toggle-pill flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all {isCreatingNew ? 'toggle-pill-active' : 'text-vscode-foreground hover:text-vscode-foreground'}"
          on:click={() => isCreatingNew = true}
          role="tab"
          aria-selected={isCreatingNew}
          type="button"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </span>
        </button>
      </div>

      {#if isCreatingNew}
        <!-- New Collection Name -->
        <div class="space-y-2">
          <label for="collection-name" class="block text-xs font-semibold text-vscode-foreground uppercase tracking-wider" style="opacity: 0.6;">
            Collection Name
          </label>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            id="collection-name"
            type="text"
            bind:value={newCollectionName}
            placeholder="My API Collection"
            class="input-modern w-full"
            autofocus
          />
        </div>
      {:else}
        <!-- Collection Selector -->
        <div class="space-y-2">
          <span class="block text-xs font-semibold text-vscode-foreground uppercase tracking-wider" style="opacity: 0.6;">
            Select Collection
          </span>
          {#if collections.length === 0}
            <div class="empty-state text-center py-8 rounded-xl">
              <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-vscode-link/10 flex items-center justify-center">
                <svg class="w-8 h-8 text-vscode-link" style="opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <p class="text-sm text-vscode-foreground font-medium">No collections yet</p>
              <p class="text-xs text-vscode-foreground mt-1" style="opacity: 0.5;">Switch to "New" tab to create one</p>
            </div>
          {:else}
            <div class="collection-list space-y-1.5 max-h-56 overflow-auto pr-1" role="listbox" aria-label="Collections">
              {#each collections as collection}
                <button
                  class="collection-item flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all {selectedCollectionId === collection.id ? 'collection-item-selected' : ''}"
                  on:click={() => selectedCollectionId = collection.id}
                  role="option"
                  aria-selected={selectedCollectionId === collection.id}
                  type="button"
                >
                  <div class="p-2 rounded-lg {selectedCollectionId === collection.id ? 'bg-white/20' : 'bg-vscode-link/10'}">
                    <svg class="w-4 h-4 {selectedCollectionId === collection.id ? 'text-white' : 'text-vscode-link'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="block text-sm font-medium truncate {selectedCollectionId === collection.id ? 'text-white' : 'text-vscode-foreground'}">{collection.name}</span>
                    <span class="text-xs {selectedCollectionId === collection.id ? 'text-white/70' : 'text-vscode-foreground'}" style={selectedCollectionId !== collection.id ? 'opacity: 0.5;' : ''}>
                      {collection.requests?.length || 0} request{collection.requests?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {#if selectedCollectionId === collection.id}
                    <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="modal-footer flex items-center justify-end gap-3 px-5 py-4">
      <button
        class="px-5 py-2.5 text-sm font-medium rounded-lg text-vscode-foreground hover:bg-white/5 transition-colors"
        on:click={handleClose}
        type="button"
      >
        Cancel
      </button>
      <button
        class="btn-save px-5 py-2.5 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        disabled={(isCreatingNew && !newCollectionName.trim()) || (!isCreatingNew && collections.length === 0)}
        on:click={handleSave}
        type="button"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {isCreatingNew ? 'Create & Save' : 'Save Request'}
        </span>
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: linear-gradient(180deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
    border: 1px solid var(--vscode-widget-border, var(--vscode-editorWidget-border, rgba(255,255,255,0.1)));
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .modal-header {
    background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .modal-footer {
    background: rgba(0,0,0,0.2);
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .toggle-pill {
    opacity: 0.6;
  }

  .toggle-pill-active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    opacity: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  .input-modern {
    padding: 12px 16px;
    font-size: 14px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    color: var(--vscode-foreground);
    transition: all 0.2s;
  }

  .input-modern:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder), 0.1);
  }

  .input-modern::placeholder {
    color: var(--vscode-foreground);
    opacity: 0.3;
  }

  .empty-state {
    background: rgba(0,0,0,0.2);
    border: 1px dashed rgba(255,255,255,0.1);
  }

  .collection-list::-webkit-scrollbar {
    width: 6px;
  }

  .collection-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .collection-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }

  .collection-item {
    background: rgba(0,0,0,0.2);
    border: 1px solid transparent;
  }

  .collection-item:hover:not(.collection-item-selected) {
    background: rgba(0,0,0,0.3);
    border-color: rgba(255,255,255,0.05);
  }

  .collection-item-selected {
    background: var(--vscode-button-background);
    border-color: transparent;
    color: var(--vscode-button-foreground);
  }

  .btn-save {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }

  .btn-save:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
</style>
