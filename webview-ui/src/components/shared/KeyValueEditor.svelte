<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { generateId, type KeyValue } from '../../lib/stores';

  export let items: KeyValue[] = [];
  export let keyPlaceholder = 'Key';
  export let valuePlaceholder = 'Value';
  export let showDescription = false;

  const dispatch = createEventDispatcher<{ change: KeyValue[] }>();

  function updateItem(index: number, field: keyof KeyValue, value: string | boolean) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index]!, [field]: value };

    // Auto-add new row when typing in the last row
    if (index === items.length - 1 && field === 'key' && typeof value === 'string' && value) {
      newItems.push({ id: generateId(), key: '', value: '', enabled: true });
    }

    dispatch('change', newItems);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      // Reset the last item instead of removing
      dispatch('change', [{ id: generateId(), key: '', value: '', enabled: true }]);
    } else {
      const newItems = items.filter((_, i) => i !== index);
      dispatch('change', newItems);
    }
  }

  function toggleItem(index: number) {
    updateItem(index, 'enabled', !items[index]!.enabled);
  }
</script>

<div class="space-y-1 bg-vscode-editor-background/30 rounded-xl border border-vscode-border overflow-hidden shadow-sm">
  <table class="kv-table">
    <thead>
      <tr class="bg-vscode-sidebar-bg/50 backdrop-blur-sm">
        <th class="w-10 text-center">
          <svg class="w-4 h-4 inline-block text-vscode-foreground/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </th>
        <th class="w-2/5 font-semibold text-vscode-foreground/70">{keyPlaceholder}</th>
        <th class="w-2/5 font-semibold text-vscode-foreground/70">{valuePlaceholder}</th>
        {#if showDescription}
          <th class="font-semibold text-vscode-foreground/70">Description</th>
        {/if}
        <th class="w-10"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-vscode-border/50">
      {#each items as item, index (item.id)}
        <tr class="group transition-colors duration-150 hover:bg-vscode-list-hover/30" class:opacity-60={!item.enabled}>
          <td class="text-center align-middle">
            <div class="flex items-center justify-center h-full">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-vscode-border text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0 bg-vscode-editor-background/50 cursor-pointer transition-all duration-200"
                checked={item.enabled}
                on:change={() => toggleItem(index)}
              />
            </div>
          </td>
          <td class="p-1.5">
            <input
              type="text"
              class="input py-1.5 px-3 bg-transparent border-transparent hover:border-vscode-border focus:bg-vscode-editor-background focus:border-blue-500/50 transition-all duration-200 shadow-none focus:shadow-sm"
              placeholder={keyPlaceholder}
              value={item.key}
              on:input={(e) => updateItem(index, 'key', e.currentTarget.value)}
            />
          </td>
          <td class="p-1.5">
            <input
              type="text"
              class="input py-1.5 px-3 bg-transparent border-transparent hover:border-vscode-border focus:bg-vscode-editor-background focus:border-blue-500/50 transition-all duration-200 shadow-none focus:shadow-sm"
              placeholder={valuePlaceholder}
              value={item.value}
              on:input={(e) => updateItem(index, 'value', e.currentTarget.value)}
            />
          </td>
          {#if showDescription}
            <td class="p-1.5">
              <input
                type="text"
                class="input py-1.5 px-3 bg-transparent border-transparent hover:border-vscode-border focus:bg-vscode-editor-background focus:border-blue-500/50 transition-all duration-200 shadow-none focus:shadow-sm"
                placeholder="Description"
                value={item.description || ''}
                on:input={(e) => updateItem(index, 'description', e.currentTarget.value)}
              />
            </td>
          {/if}
          <td class="text-center align-middle">
            <div class="flex items-center justify-center h-full">
              <button
                class="btn-icon opacity-0 group-hover:opacity-100 text-vscode-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                on:click={() => removeItem(index)}
                title="Remove"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
