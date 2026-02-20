<script lang="ts">
  import { activeRequest, sendRequest, cancelRequest, isLoading, activeRequestSourceCollection, updateRequestInCollection, type HttpMethod } from '../../lib/stores';

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  let isEditingName = false;
  let nameInput: HTMLInputElement;

  function getMethodClass(method: HttpMethod): string {
    const classes: Record<HttpMethod, string> = {
      GET: 'text-method-get',
      POST: 'text-method-post',
      PUT: 'text-method-put',
      PATCH: 'text-method-patch',
      DELETE: 'text-method-delete',
      HEAD: 'text-method-head',
      OPTIONS: 'text-method-options',
    };
    return classes[method];
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !$isLoading) {
      sendRequest();
    }
  }

  function startEditingName() {
    isEditingName = true;
    setTimeout(() => nameInput?.select(), 0);
  }

  function finishEditingName() {
    isEditingName = false;
    if (!$activeRequest.name.trim()) {
      activeRequest.update(r => ({ ...r, name: 'New Request' }));
    }
    // Auto-update if request is from a collection
    if ($activeRequestSourceCollection) {
      updateRequestInCollection();
    }
  }

  function handleNameKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === 'Escape') {
      finishEditingName();
    }
  }
</script>

<div class="flex flex-col gap-2">
  <!-- Request Name -->
  <div class="flex items-center gap-2">
    {#if isEditingName}
      <input
        type="text"
        class="text-sm font-medium bg-transparent border-b border-vscode-focus-border text-vscode-foreground outline-none py-0.5 px-1 min-w-[200px]"
        bind:this={nameInput}
        bind:value={$activeRequest.name}
        on:blur={finishEditingName}
        on:keydown={handleNameKeyDown}
      />
    {:else}
      <button
        class="flex items-center gap-1.5 text-sm font-medium text-vscode-foreground hover:text-vscode-link transition-colors group"
        on:click={startEditingName}
        title="Click to rename request"
      >
        <svg class="w-4 h-4 opacity-50 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span>{$activeRequest.name || 'New Request'}</span>
      </button>
    {/if}
    {#if $activeRequestSourceCollection}
      <span class="text-xs px-2 py-0.5 rounded-full bg-vscode-badge-bg text-vscode-badge-fg">
        In Collection
      </span>
    {/if}
  </div>

  <!-- URL Bar -->
  <div class="flex items-center gap-3 mt-2">
  <!-- Method Selector -->
  <select
    class="select font-bold min-w-[110px] text-center shadow-sm {getMethodClass($activeRequest.method)}"
    bind:value={$activeRequest.method}
  >
    {#each methods as method}
      <option value={method} class={getMethodClass(method)}>{method}</option>
    {/each}
  </select>

  <!-- URL Input -->
  <div class="flex-1 relative group">
    <div class="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    <input
      type="text"
      class="input pr-10 font-mono relative z-10 shadow-sm"
      placeholder="Enter request URL (e.g., https://api.example.com/users)"
      bind:value={$activeRequest.url}
      on:keydown={handleKeyDown}
    />
    {#if $activeRequest.url}
      <button
        class="absolute right-3 top-1/2 -translate-y-1/2 text-vscode-foreground opacity-40 hover:opacity-100 transition-opacity z-20"
        on:click={() => activeRequest.update(r => ({ ...r, url: '' }))}
        title="Clear URL"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Send/Cancel Button -->
  {#if $isLoading}
    <button
      class="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 min-w-[100px] shadow-sm border border-red-500/30"
      on:click={cancelRequest}
    >
      <svg class="w-4 h-4 mr-1.5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
      Cancel
    </button>
  {:else}
    <button
      class="btn btn-primary min-w-[100px] shadow-md relative overflow-hidden group"
      on:click={sendRequest}
      disabled={!$activeRequest.url}
    >
      <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
      <div class="relative flex items-center justify-center">
        <svg class="w-4 h-4 mr-1.5 group-hover:translate-x-1 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 12h15" />
        </svg>
        Send
      </div>
    </button>
  {/if}
  </div>
</div>
