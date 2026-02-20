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

<div class="flex flex-col h-full">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-vscode-border bg-vscode-sidebar-bg">
    <input
      type="text"
      class="input py-1 max-w-xs"
      placeholder="Filter headers..."
      bind:value={filter}
    />
    <button
      class="text-xs text-vscode-link hover:text-vscode-link-hover"
      on:click={copyAllHeaders}
    >
      Copy All
    </button>
  </div>

  <!-- Headers List -->
  <div class="flex-1 overflow-auto">
    {#if filteredHeaders.length === 0}
      <div class="p-4 text-center text-vscode-foreground opacity-50">
        {#if filter}
          <p class="text-sm">No headers match "{filter}"</p>
        {:else}
          <p class="text-sm">No response headers</p>
        {/if}
      </div>
    {:else}
      <table class="w-full">
        <tbody>
          {#each filteredHeaders as [key, value]}
            <tr class="group hover:bg-vscode-list-hover">
              <td class="px-4 py-2 text-sm font-medium text-vscode-link w-1/3 align-top border-b border-vscode-border">
                {key}
              </td>
              <td class="px-4 py-2 text-sm font-mono break-all border-b border-vscode-border">
                <div class="flex items-start justify-between gap-2">
                  <span class="flex-1">{value}</span>
                  <button
                    class="btn-icon opacity-0 group-hover:opacity-100 shrink-0 text-vscode-foreground"
                    class:text-green-400={copiedKey === key}
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
    {/if}
  </div>
</div>
