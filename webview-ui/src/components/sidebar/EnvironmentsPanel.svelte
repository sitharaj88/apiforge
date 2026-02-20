<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Variable {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
  }

  interface Environment {
    id: string;
    name: string;
    variables: Variable[];
  }

  export let environments: Environment[] = [];
  export let activeEnvironmentId: string | null = null;

  const dispatch = createEventDispatcher();

  let showNewEnvInput = false;
  let newEnvName = '';

  function createEnvironment() {
    if (newEnvName.trim()) {
      dispatch('createEnvironment', { name: newEnvName.trim() });
      newEnvName = '';
      showNewEnvInput = false;
    }
  }

  function selectEnvironment(id: string | null) {
    dispatch('selectEnvironment', { id });
  }

  function deleteEnvironment(id: string) {
    dispatch('deleteEnvironment', { id });
  }

  function getVariableCount(env: Environment): number {
    return env.variables.filter(v => v.enabled && v.key).length;
  }
</script>

<div class="flex flex-col h-full bg-vscode-sidebar-bg/30 backdrop-blur-xl border-r border-vscode-border/30 shadow-[4px_0_24px_rgba(0,0,0,0.1)]">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/40 backdrop-blur-md">
    <span class="text-xs font-semibold text-vscode-foreground/80 uppercase tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Environments</span>
    <button
      class="p-1.5 rounded-md hover:bg-api-primary/20 text-vscode-foreground/70 hover:text-api-primary transition-all duration-300 hover:shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.3)]"
      title="New Environment"
      on:click={() => showNewEnvInput = true}
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>

  <!-- New Environment Input -->
  {#if showNewEnvInput}
    <div class="px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/50 backdrop-blur-md shadow-inner">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        class="input w-full text-sm py-1.5 px-3 bg-vscode-editor-background/50 border-vscode-border/50 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-300 shadow-inner"
        placeholder="Environment name..."
        bind:value={newEnvName}
        on:keydown={(e) => {
          if (e.key === 'Enter') createEnvironment();
          if (e.key === 'Escape') showNewEnvInput = false;
        }}
        autofocus
      />
      <div class="flex gap-2 mt-3">
        <button class="btn btn-primary py-1.5 px-3 text-xs flex-1 shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.3)] hover:shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.5)] transition-all duration-300" on:click={createEnvironment}>Create</button>
        <button class="btn btn-secondary py-1.5 px-3 text-xs flex-1 bg-vscode-editor-background/50 hover:bg-vscode-editor-background/80 border border-vscode-border/50 transition-all duration-300" on:click={() => showNewEnvInput = false}>Cancel</button>
      </div>
    </div>
  {/if}

  <!-- No Environment Option -->
  <div class="px-2 pt-2">
    <button
      class="env-item flex items-center gap-2.5 w-full px-3 py-2 rounded-md hover:bg-vscode-list-hover/50 transition-all duration-300"
      class:env-item-active={!activeEnvironmentId}
      class:bg-api-primary={!activeEnvironmentId}
      class:bg-opacity-10={!activeEnvironmentId}
      class:shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.1)]={!activeEnvironmentId}
      on:click={() => selectEnvironment(null)}
    >
      <svg class="w-4.5 h-4.5 {!activeEnvironmentId ? 'text-api-primary drop-shadow-[0_0_5px_rgba(var(--api-primary-rgb),0.5)]' : 'text-vscode-foreground/40'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
      <span class="text-sm font-medium transition-colors duration-300" class:text-api-primary={!activeEnvironmentId} class:text-vscode-foreground={activeEnvironmentId} style={activeEnvironmentId ? 'opacity: 0.6;' : ''}>No Environment</span>
    </button>
  </div>

  <!-- Environments List -->
  <div class="flex-1 overflow-auto py-2 custom-scrollbar">
    {#if environments.length === 0}
      <div class="flex flex-col items-center justify-center h-full p-6 text-center text-vscode-foreground/50">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/30 backdrop-blur-sm flex items-center justify-center border border-vscode-border/30 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <svg class="w-8 h-8 text-vscode-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        </div>
        <p class="text-sm font-medium text-vscode-foreground/70">No environments yet</p>
        <button
          class="text-sm text-api-primary mt-2 hover:text-api-purple hover:underline transition-colors drop-shadow-[0_0_8px_rgba(var(--api-primary-rgb),0.5)]"
          on:click={() => showNewEnvInput = true}
        >
          Create your first environment
        </button>
      </div>
    {:else}
      <div class="space-y-1 px-2">
      {#each environments as env (env.id)}
        <div
          class="env-item flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-vscode-list-hover/50 group transition-all duration-300 border border-transparent"
          class:env-item-active={activeEnvironmentId === env.id}
          class:bg-api-primary={activeEnvironmentId === env.id}
          class:bg-opacity-10={activeEnvironmentId === env.id}
          class:shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.1)]={activeEnvironmentId === env.id}
        >
          <button
            class="flex items-center gap-2.5 flex-1"
            on:click={() => selectEnvironment(env.id)}
          >
            {#if activeEnvironmentId === env.id}
              <svg class="w-4.5 h-4.5 text-api-primary drop-shadow-[0_0_5px_rgba(var(--api-primary-rgb),0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            {:else}
              <svg class="w-4.5 h-4.5 text-vscode-foreground/30 group-hover:text-api-primary/50 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            {/if}
            <span class="text-sm font-medium flex-1 text-left truncate transition-colors duration-300" class:text-api-primary={activeEnvironmentId === env.id} class:text-vscode-foreground={activeEnvironmentId !== env.id}>{env.name}</span>
            <span class="text-xs font-medium px-1.5 py-0.5 rounded-md bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner transition-colors duration-300" class:text-api-primary={activeEnvironmentId === env.id} class:text-vscode-foreground={activeEnvironmentId !== env.id} style={activeEnvironmentId !== env.id ? 'opacity: 0.5;' : 'opacity: 0.8;'}>{getVariableCount(env)} vars</span>
          </button>

          <button
            class="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-api-primary/10 text-vscode-foreground/40 hover:text-api-primary transition-all duration-200"
            title="Edit"
            on:click={() => dispatch('editEnvironment', { environment: env })}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            class="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-vscode-foreground/40 hover:text-red-400 transition-all duration-200"
            title="Delete"
            on:click={() => deleteEnvironment(env.id)}
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .env-item-active {
    background: linear-gradient(90deg, rgba(var(--api-primary-rgb), 0.1), transparent) !important;
    border-color: rgba(var(--api-primary-rgb), 0.2) !important;
  }

  .env-item-active:hover {
    background: linear-gradient(90deg, rgba(var(--api-primary-rgb), 0.15), transparent) !important;
  }
</style>
