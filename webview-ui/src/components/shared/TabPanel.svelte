<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let tabs: { id: string; label: string; badge?: number }[] = [];
  export let activeTab: string;

  const dispatch = createEventDispatcher<{ change: string }>();

  function handleTabClick(tabId: string) {
    dispatch('change', tabId);
  }
</script>

<div class="flex items-center gap-1 border-b border-vscode-border/30 bg-vscode-editor-background/30 backdrop-blur-sm px-2 pt-2">
  {#each tabs as tab}
    <button
      class="tab relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-t-lg"
      class:text-vscode-foreground={activeTab === tab.id}
      class:text-vscode-foreground-muted={activeTab !== tab.id}
      class:hover:text-vscode-foreground={activeTab !== tab.id}
      class:hover:bg-vscode-editor-background/50={activeTab !== tab.id}
      on:click={() => handleTabClick(tab.id)}
    >
      <div class="flex items-center gap-2">
        {tab.label}
        {#if tab.badge && tab.badge > 0}
          <span class="badge bg-api-primary/20 text-api-primary border border-api-primary/30 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{tab.badge}</span>
        {/if}
      </div>
      {#if activeTab === tab.id}
        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-api-primary to-api-purple shadow-[0_0_8px_var(--api-primary)]"></div>
      {/if}
    </button>
  {/each}
</div>
