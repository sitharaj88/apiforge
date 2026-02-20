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

<div class="flex flex-col gap-3 p-4 rounded-xl" style="background: var(--bg-glass); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255,255,255,0.04); backdrop-filter: blur(16px);">
  <!-- Request Name -->
  <div class="flex items-center gap-2">
    {#if isEditingName}
      <input
        type="text"
        class="text-sm font-medium rounded-md outline-none py-1 px-2 min-w-[200px] transition-all duration-200"
        style="background: var(--bg-glass-md); border: 1px solid rgba(var(--api-primary-rgb),0.45); color: var(--text-primary); box-shadow: 0 0 12px rgba(var(--api-primary-rgb),0.15);"
        bind:this={nameInput}
        bind:value={$activeRequest.name}
        on:blur={finishEditingName}
        on:keydown={handleNameKeyDown}
      />
    {:else}
      <button
        class="flex items-center gap-2 text-sm font-medium text-vscode-foreground/80 hover:text-api-primary transition-colors group px-2 py-1 rounded-md hover:bg-api-primary/10"
        on:click={startEditingName}
        title="Click to rename request"
      >
        <svg class="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-api-primary transition-all duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span class="group-hover:drop-shadow-[0_0_8px_rgba(var(--api-primary-rgb),0.5)] transition-all duration-200">{$activeRequest.name || 'New Request'}</span>
      </button>
    {/if}
    {#if $activeRequestSourceCollection}
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-api-primary/10 text-api-primary border border-api-primary/20 shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.1)]">
        In Collection
      </span>
    {/if}
  </div>

  <!-- URL Bar -->
  <div class="flex items-center gap-3">
  <!-- Method Selector -->
  <select
    class="select font-bold min-w-[110px] text-center {getMethodClass($activeRequest.method)}"
    style="background: var(--bg-glass-md); backdrop-filter: blur(8px); border-color: var(--border-default); font-size: 12px; letter-spacing: 0.04em;"
    bind:value={$activeRequest.method}
  >
    {#each methods as method}
      <option value={method} class={getMethodClass(method)}>{method}</option>
    {/each}
  </select>

  <!-- URL Input -->
  <div class="flex-1 relative group">
    <div class="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style="background: radial-gradient(ellipse at 30% 50%, rgba(var(--api-primary-rgb),0.06), transparent 60%);"></div>
    <input
      type="text"
      class="input pr-10 font-mono relative z-10"
      style="background: var(--bg-glass-md); font-size: 12.5px; letter-spacing: 0.01em;"
      placeholder="Enter request URL..."
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
      class="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 min-w-[100px] shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-500/30 backdrop-blur-sm transition-all duration-300"
      on:click={cancelRequest}
    >
      <svg class="w-4 h-4 mr-1.5 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
      Cancel
    </button>
  {:else}
    <button
      class="btn btn-primary min-w-[100px] relative overflow-hidden group"
      style="min-width: 88px; box-shadow: var(--shadow-glow-sm), var(--shadow-sm);"
      on:click={sendRequest}
      disabled={!$activeRequest.url}
    >
      <!-- Shine sweep on hover -->
      <span class="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);"></span>
      <svg class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
      </svg>
      Send
    </button>
  {/if}
  </div>
</div>
