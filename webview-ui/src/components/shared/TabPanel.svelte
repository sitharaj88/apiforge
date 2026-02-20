<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let tabs: { id: string; label: string; badge?: number }[] = [];
  export let activeTab: string;

  const dispatch = createEventDispatcher<{ change: string }>();

  function handleTabClick(tabId: string) {
    dispatch('change', tabId);
  }
</script>

<div class="flex items-center gap-0.5 px-2 pt-1.5" style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-glass); backdrop-filter: blur(8px);">
  {#each tabs as tab}
    <button
      class="tab relative flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-t-md {activeTab === tab.id ? 'tab-active' : ''}"
      on:click={() => handleTabClick(tab.id)}
    >
      {tab.label}
      {#if tab.badge && tab.badge > 0}
        <span class="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold" style="background: rgba(var(--api-primary-rgb),0.18); color: var(--api-primary); border: 1px solid rgba(var(--api-primary-rgb),0.25);">{tab.badge}</span>
      {/if}
    </button>
  {/each}
</div>
