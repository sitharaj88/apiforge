<script lang="ts">
  export let headers: Record<string, string>;

  let filter = '';
  let copiedKey: string | null = null;

  $: filteredHeaders = Object.entries(headers).filter(([key, value]) => {
    const searchTerm = filter.toLowerCase();
    return key.toLowerCase().includes(searchTerm) || value.toLowerCase().includes(searchTerm);
  });

  async function copyHeader(key: string, value: string) {
    await navigator.clipboard.writeText(`${key}: ${value}`);
    copiedKey = key;
    setTimeout(() => {
      copiedKey = null;
    }, 1500);
  }

  async function copyAllHeaders() {
    const text = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
  }
</script>

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl shadow-sm">
    <div class="relative w-full max-w-xs">
      <input
        type="text"
        class="input py-1.5 pl-8 pr-3 text-sm w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 rounded-lg"
        placeholder="Filter headers..."
        bind:value={filter}
      />
      <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-vscode-foreground/40">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
    </div>
    <button
      class="px-3 py-1.5 text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors rounded-md hover:bg-api-primary/10 flex items-center gap-1.5"
      on:click={copyAllHeaders}
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      Copy All
    </button>
  </div>

  <!-- Headers List -->
  <div class="flex-1 overflow-auto bg-vscode-editor-background/20 p-4">
    {#if filteredHeaders.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-vscode-foreground/40">
        <div class="w-16 h-16 mb-4 rounded-full bg-vscode-editor-background/50 border border-vscode-border/30 flex items-center justify-center shadow-inner">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        {#if filter}
          <p class="text-sm font-medium text-vscode-foreground/60">No headers match "{filter}"</p>
        {:else}
          <p class="text-sm font-medium text-vscode-foreground/60">No response headers</p>
        {/if}
      </div>
    {:else}
      <div class="rounded-xl border border-vscode-border/20 bg-vscode-editor-background/40 backdrop-blur-sm shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-vscode-border/20 bg-vscode-editor-background/50">
              <th class="px-4 py-3 text-xs font-semibold text-vscode-foreground/60 uppercase tracking-wider w-1/3">Header</th>
              <th class="px-4 py-3 text-xs font-semibold text-vscode-foreground/60 uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-vscode-border/10">
            {#each filteredHeaders as [key, value]}
              <tr class="group hover:bg-vscode-editor-background/60 transition-colors duration-150">
                <td class="px-4 py-3 text-sm font-medium text-api-primary align-top">
                  {key}
                </td>
                <td class="px-4 py-3 text-sm font-mono text-vscode-foreground/80 break-all">
                  <div class="flex items-start justify-between gap-3">
                    <span class="flex-1 leading-relaxed">{value}</span>
                    <button
                      class="p-1.5 rounded-md opacity-0 group-hover:opacity-100 shrink-0 transition-all duration-200 hover:bg-vscode-editor-background/80 border border-transparent hover:border-vscode-border/30"
                      class:text-green-400={copiedKey === key}
                      class:text-vscode-foreground={copiedKey !== key}
                      on:click={() => copyHeader(key, value)}
                      title="Copy"
                    >
                      {#if copiedKey === key}
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      {:else}
                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      {/if}
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
