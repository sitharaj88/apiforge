<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CollectionsPanel from './CollectionsPanel.svelte';
  import EnvironmentsPanel from './EnvironmentsPanel.svelte';
  import HistoryPanel from './HistoryPanel.svelte';

  type SidebarTab = 'collections' | 'environments' | 'history';

  export let collections: any[] = [];
  export let environments: any[] = [];
  export let activeEnvironmentId: string | null = null;
  export let history: any[] = [];

  const dispatch = createEventDispatcher();

  let activeTab: SidebarTab = 'collections';
  let isCollapsed = false;

  const tabs: { id: SidebarTab; label: string; icon: string }[] = [
    { id: 'collections', label: 'Collections', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />' },
    { id: 'environments', label: 'Environments', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />' },
    { id: 'history', label: 'History', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />' },
  ];
</script>

<aside class="sidebar flex flex-col h-full bg-vscode-sidebar-bg/80 backdrop-blur-md border-r border-vscode-border flex-shrink-0 transition-all duration-300 ease-in-out" class:sidebar-collapsed={isCollapsed}>
  <!-- Tab Icons -->
  <div class="flex items-center px-2 py-2 border-b border-vscode-border bg-vscode-editor-background/50" class:justify-center={isCollapsed} class:justify-between={!isCollapsed}>
    {#if isCollapsed}
      <!-- Collapsed: Stack icons vertically -->
      <div class="flex flex-col items-center gap-2">
        {#each tabs as tab}
          <button
            class="p-2 rounded-lg transition-all duration-200 {activeTab === tab.id ? 'bg-blue-500/10 text-blue-400 shadow-sm' : 'text-vscode-foreground hover:bg-vscode-list-hover'}"
            style={activeTab !== tab.id ? 'opacity: 0.7;' : ''}
            title={tab.label}
            on:click={() => { activeTab = tab.id; isCollapsed = false; }}
          >
            <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {@html tab.icon}
            </svg>
          </button>
        {/each}
        <div class="w-6 h-px bg-vscode-border my-1"></div>
        <button
          class="p-2 rounded-lg hover:bg-vscode-list-hover text-vscode-foreground transition-all duration-200"
          style="opacity: 0.7;"
          title="Expand"
          on:click={() => isCollapsed = false}
        >
          <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {:else}
      <!-- Expanded: Horizontal layout -->
      <div class="flex items-center gap-1.5">
        {#each tabs as tab}
          <button
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 {activeTab === tab.id ? 'bg-blue-500/10 text-blue-400 shadow-sm font-medium' : 'text-vscode-foreground hover:bg-vscode-list-hover'}"
            style={activeTab !== tab.id ? 'opacity: 0.7;' : ''}
            title={tab.label}
            on:click={() => { activeTab = tab.id; }}
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {@html tab.icon}
            </svg>
            <span class="text-xs">{tab.label}</span>
          </button>
        {/each}
      </div>
      <button
        class="p-1.5 rounded-lg hover:bg-vscode-list-hover text-vscode-foreground transition-all duration-200"
        style="opacity: 0.7;"
        title="Collapse"
        on:click={() => isCollapsed = true}
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    {/if}
  </div>

  {#if !isCollapsed}
    <!-- Panel Content -->
    <div class="flex-1 overflow-hidden">
      {#if activeTab === 'collections'}
        <CollectionsPanel
          {collections}
          on:createCollection
          on:deleteCollection
          on:selectRequest
          on:deleteRequest
        />
      {:else if activeTab === 'environments'}
        <EnvironmentsPanel
          {environments}
          {activeEnvironmentId}
          on:createEnvironment
          on:selectEnvironment
          on:deleteEnvironment
          on:editEnvironment
        />
      {:else if activeTab === 'history'}
        <HistoryPanel
          {history}
          on:selectHistory
          on:deleteHistory
          on:clearHistory
        />
      {/if}
    </div>
  {/if}
</aside>

<style>
  .sidebar {
    width: 260px;
    min-width: 260px;
    background: var(--vscode-sideBar-background, var(--vscode-editor-background));
    border-color: var(--border-subtle);
  }

  .sidebar-collapsed {
    width: 48px;
    min-width: 48px;
  }
</style>
