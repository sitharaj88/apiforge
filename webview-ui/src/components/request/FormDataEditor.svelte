<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { generateId } from '../../lib/stores';

  interface FormDataItem {
    id: string;
    key: string;
    value: string;
    type: 'text' | 'file';
    enabled: boolean;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }

  export let items: FormDataItem[] = [];

  const dispatch = createEventDispatcher<{ change: FormDataItem[] }>();

  function updateItem(index: number, field: keyof FormDataItem, value: string | boolean) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index]!, [field]: value };

    // Auto-add new row when typing in the last row
    if (index === items.length - 1 && field === 'key' && typeof value === 'string' && value) {
      newItems.push({ id: generateId(), key: '', value: '', type: 'text', enabled: true });
    }

    dispatch('change', newItems);
  }

  function removeItem(index: number) {
    if (items.length <= 1) {
      dispatch('change', [{ id: generateId(), key: '', value: '', type: 'text', enabled: true }]);
    } else {
      const newItems = items.filter((_, i) => i !== index);
      dispatch('change', newItems);
    }
  }

  function toggleItem(index: number) {
    updateItem(index, 'enabled', !items[index]!.enabled);
  }

  function changeType(index: number, type: 'text' | 'file') {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index]!,
      type,
      value: '',
      fileName: undefined,
      fileSize: undefined,
      fileType: undefined
    };
    dispatch('change', newItems);
  }

  function handleFileSelect(index: number) {
    // Send message to extension to open file picker
    const vscode = (window as any).vscode;
    if (vscode) {
      vscode.postMessage({
        type: 'selectFile',
        payload: { index }
      });
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Handle file selection response from extension
  function handleMessage(event: MessageEvent) {
    const message = event.data;
    if (message.type === 'fileSelected' && message.payload) {
      const { index, filePath, fileName, fileSize, fileType } = message.payload;
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index]!,
        value: filePath,
        fileName,
        fileSize,
        fileType
      };
      dispatch('change', newItems);
    }
  }

  // Listen for messages from extension
  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }
</script>

<div class="space-y-1">
  <table class="kv-table">
    <thead>
      <tr>
        <th class="w-8"></th>
        <th class="w-1/4">Key</th>
        <th class="w-20">Type</th>
        <th>Value</th>
        <th class="w-8"></th>
      </tr>
    </thead>
    <tbody>
      {#each items as item, index (item.id)}
        <tr class="group" class:opacity-50={!item.enabled}>
          <td>
            <input
              type="checkbox"
              class="w-4 h-4 accent-vscode-focus-border"
              checked={item.enabled}
              on:change={() => toggleItem(index)}
            />
          </td>
          <td>
            <input
              type="text"
              class="input py-1"
              placeholder="Key"
              value={item.key}
              on:input={(e) => updateItem(index, 'key', e.currentTarget.value)}
            />
          </td>
          <td>
            <select
              class="input py-1 text-xs"
              value={item.type}
              on:change={(e) => changeType(index, e.currentTarget.value as 'text' | 'file')}
            >
              <option value="text">Text</option>
              <option value="file">File</option>
            </select>
          </td>
          <td>
            {#if item.type === 'file'}
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-sm flex-shrink-0"
                  on:click={() => handleFileSelect(index)}
                >
                  <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Select File
                </button>
                {#if item.fileName}
                  <div class="flex items-center gap-2 text-xs text-vscode-foreground overflow-hidden">
                    <svg class="w-4 h-4 flex-shrink-0 text-vscode-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="truncate" title={item.fileName}>{item.fileName}</span>
                    {#if item.fileSize}
                      <span class="text-vscode-foreground flex-shrink-0" style="opacity: 0.5;">
                        ({formatFileSize(item.fileSize)})
                      </span>
                    {/if}
                  </div>
                {:else}
                  <span class="text-xs text-vscode-foreground" style="opacity: 0.5;">No file selected</span>
                {/if}
              </div>
            {:else}
              <input
                type="text"
                class="input py-1"
                placeholder="Value"
                value={item.value}
                on:input={(e) => updateItem(index, 'value', e.currentTarget.value)}
              />
            {/if}
          </td>
          <td>
            <button
              class="btn-icon opacity-0 group-hover:opacity-100 text-vscode-foreground hover:text-red-400"
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

<style>
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
</style>
