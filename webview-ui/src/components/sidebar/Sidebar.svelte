<script lang="ts">
  import CollectionsPanel from './CollectionsPanel.svelte';
  import EnvironmentsPanel from './EnvironmentsPanel.svelte';
  import HistoryPanel from './HistoryPanel.svelte';

  type SidebarTab = 'collections' | 'environments' | 'history';

  export let collections: any[] = [];
  export let environments: any[] = [];
  export let activeEnvironmentId: string | null = null;
  export let history: any[] = [];

  let activeTab: SidebarTab = 'collections';
  let isCollapsed = false;

  const tabs: { id: SidebarTab; label: string; icon: string }[] = [
    { id: 'collections', label: 'Collections', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />' },
    { id: 'environments', label: 'Environments', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />' },
    { id: 'history', label: 'History', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />' },
  ];
</script>

<aside class="sidebar flex flex-col h-full bg-vscode-sidebar-bg/40 backdrop-blur-xl border-r border-vscode-border/30 flex-shrink-0 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.1)] relative z-20" class:sidebar-collapsed={isCollapsed}>
  <!-- Tab Icons -->
  <div class="flex items-center px-2 py-2 border-b border-vscode-border/30 bg-vscode-editor-background/30 backdrop-blur-md" class:justify-center={isCollapsed} class:justify-between={!isCollapsed}>
    {#if isCollapsed}
      <!-- Collapsed: Stack icons vertically -->
      <div class="flex flex-col items-center gap-2 w-full">
        {#each tabs as tab}
          <button
            class="p-2.5 rounded-xl transition-all duration-300 relative group {activeTab === tab.id ? 'bg-blue-500/15 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/30' : 'text-vscode-foreground/60 hover:text-vscode-foreground hover:bg-vscode-list-hover/50'}"
            title={tab.label}
            on:click={() => { activeTab = tab.id; isCollapsed = false; }}
          >
            <svg class="w-5 h-5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {@html tab.icon}
            </svg>
            {#if activeTab === tab.id}
              <div class="absolute inset-0 bg-blue-500/20 blur-md rounded-xl opacity-50"></div>
            {/if}
          </button>
        {/each}
        <div class="w-8 h-px bg-gradient-to-r from-transparent via-vscode-border/50 to-transparent my-2"></div>
        <button
          class="p-2.5 rounded-xl text-vscode-foreground/50 hover:text-vscode-foreground hover:bg-vscode-list-hover/50 transition-all duration-300 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)]"
          title="Expand"
          on:click={() => isCollapsed = false}
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    {:else}
      <!-- Expanded: Horizontal layout -->
      <div class="flex items-center gap-1.5 w-full">
        {#each tabs as tab}
          <button
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 relative group overflow-hidden {activeTab === tab.id ? 'bg-blue-500/15 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/30' : 'text-vscode-foreground/60 hover:text-vscode-foreground hover:bg-vscode-list-hover/50'}"
            title={tab.label}
            on:click={() => { activeTab = tab.id; }}
          >
            <svg class="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              {@html tab.icon}
            </svg>
            {#if activeTab === tab.id}
              <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-50"></div>
              <div class="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_-2px_8px_rgba(59,130,246,0.8)]"></div>
            {/if}
          </button>
        {/each}
        <div class="w-px h-6 bg-vscode-border/30 mx-1"></div>
        <button
          class="p-2 rounded-xl text-vscode-foreground/50 hover:text-vscode-foreground hover:bg-vscode-list-hover/50 transition-all duration-300 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)] flex-shrink-0"
          title="Collapse"
          on:click={() => isCollapsed = true}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
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
