<script lang="ts">
  import { collections, activeEnvironmentId } from '../../lib/stores';
  import { vscode } from '../../lib/vscode-api';
  import { onMount, onDestroy } from 'svelte';

  export let isOpen = false;
  export let onClose: () => void = () => {};

  type ExportFormat = 'openapi' | 'postman' | 'markdown';

  let selectedCollection: string = '';
  let exportFormat: ExportFormat = 'openapi';
  let isExporting = false;
  let exportResult: string = '';
  let exportError: string = '';

  const exportFormats = [
    { id: 'openapi', name: 'OpenAPI 3.0', description: 'Standard API specification format', icon: '📄' },
    { id: 'postman', name: 'Postman Collection', description: 'Import directly into Postman', icon: '📮' },
    { id: 'markdown', name: 'Markdown Docs', description: 'Human-readable documentation', icon: '📝' },
  ];

  $: collectionList = $collections;
  $: if (collectionList.length > 0 && !selectedCollection) {
    selectedCollection = collectionList[0].id;
  }

  function handleClose() {
    exportResult = '';
    exportError = '';
    isExporting = false;
    onClose();
  }

  function handleExport() {
    if (!selectedCollection) return;

    isExporting = true;
    exportError = '';
    exportResult = '';

    vscode.postMessage({
      type: 'export',
      payload: {
        collectionId: selectedCollection,
        format: exportFormat,
        environmentId: $activeEnvironmentId || undefined,
      },
    });
  }

  async function copyToClipboard() {
    if (exportResult) {
      await navigator.clipboard.writeText(exportResult);
    }
  }

  function downloadFile() {
    if (!exportResult) return;

    const extensions: Record<ExportFormat, string> = {
      openapi: 'json',
      postman: 'json',
      markdown: 'md',
    };

    const collection = collectionList.find(c => c.id === selectedCollection);
    const filename = `${collection?.name || 'export'}.${extensions[exportFormat]}`;

    const blob = new Blob([exportResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Listen for export results
  function handleMessage(event: MessageEvent) {
    const message = event.data;
    if (message.type === 'exportResult') {
      isExporting = false;
      if (message.payload?.success) {
        exportResult = message.payload.data;
      } else {
        exportError = message.payload?.error || 'Export failed';
      }
    }
  }

  onMount(() => {
    window.addEventListener('message', handleMessage);
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });

  $: if (!isOpen) {
    window.removeEventListener('message', handleMessage);
  }
</script>

{#if isOpen}
  <div
    class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
    on:click|self={handleClose}
    on:keydown={(e) => e.key === 'Escape' && handleClose()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="modal-content w-full max-w-2xl max-h-[85vh] flex flex-col" on:click|stopPropagation={() => {}}>
      <!-- Header -->
      <div class="modal-header flex items-center justify-between px-6 py-5 flex-shrink-0">
        <div class="flex items-center gap-4">
          <div class="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 ring-1 ring-purple-500/20">
            <svg class="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h2 id="modal-title" class="text-base font-semibold text-vscode-foreground">Export Collection</h2>
            <p class="text-xs text-purple-400/70">Export to OpenAPI, Postman, or Markdown</p>
          </div>
        </div>
        <button
          class="p-2 rounded-lg hover:bg-white/5 text-vscode-foreground/60 hover:text-vscode-foreground transition-all"
          on:click={handleClose}
          aria-label="Close"
          type="button"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 flex-1 overflow-auto">
        {#if !exportResult}
          <!-- Collection Selector -->
          <div class="mb-5">
            <label for="collection-select" class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider mb-3">
              Select Collection
            </label>
            <select
              id="collection-select"
              class="input-modern w-full"
              bind:value={selectedCollection}
            >
              {#each collectionList as collection}
                <option value={collection.id}>{collection.name} ({collection.requests.length} requests)</option>
              {/each}
            </select>
          </div>

          <!-- Format Selector -->
          <div class="mb-5">
            <label class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider mb-3">
              Export Format
            </label>
            <div class="space-y-2">
              {#each exportFormats as format}
                <button
                  class="format-option w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all {exportFormat === format.id
                    ? 'bg-gradient-to-r from-purple-500/15 to-pink-500/15 ring-1 ring-purple-500/30'
                    : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/5'}"
                  on:click={() => exportFormat = format.id as ExportFormat}
                >
                  <span class="text-2xl">{format.icon}</span>
                  <div class="flex-1">
                    <div class="text-sm font-medium text-vscode-foreground">{format.name}</div>
                    <div class="text-xs text-vscode-foreground/50">{format.description}</div>
                  </div>
                  {#if exportFormat === format.id}
                    <svg class="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  {/if}
                </button>
              {/each}
            </div>
          </div>

          <!-- Error Message -->
          {#if exportError}
            <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{exportError}</span>
            </div>
          {/if}
        {:else}
          <!-- Export Result -->
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider">Export Result</span>
            <div class="flex items-center gap-2">
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-purple-400 hover:bg-purple-500/10 transition-all"
                on:click={copyToClipboard}
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
              <button
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-purple-400 hover:bg-purple-500/10 transition-all"
                on:click={downloadFile}
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            </div>
          </div>
          <pre class="export-result p-4 rounded-xl text-sm font-mono text-vscode-foreground/80 overflow-auto max-h-80">{exportResult}</pre>
        {/if}
      </div>

      <!-- Footer -->
      <div class="modal-footer flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div class="text-xs text-vscode-foreground/50">
          {#if !exportResult}
            {collectionList.find(c => c.id === selectedCollection)?.requests.length || 0} requests will be exported
          {:else}
            Export completed successfully
          {/if}
        </div>
        <div class="flex items-center gap-3">
          {#if exportResult}
            <button
              class="px-5 py-2.5 text-sm font-medium rounded-xl text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-white/5 transition-all"
              on:click={() => { exportResult = ''; exportError = ''; }}
              type="button"
            >
              Export Another
            </button>
          {/if}
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-xl text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-white/5 transition-all"
            on:click={handleClose}
            type="button"
          >
            {exportResult ? 'Close' : 'Cancel'}
          </button>
          {#if !exportResult}
            <button
              class="btn-export px-6 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
              on:click={handleExport}
              disabled={!selectedCollection || isExporting}
              type="button"
            >
              {#if isExporting}
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Exporting...
              {:else}
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
  }

  .modal-content {
    background: var(--vscode-editor-background);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 25px 50px -12px rgba(0, 0, 0, 0.6),
      0 0 80px -20px rgba(168, 85, 247, 0.15);
    overflow: hidden;
  }

  .modal-header {
    background: linear-gradient(180deg, rgba(168, 85, 247, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(168, 85, 247, 0.15);
  }

  .modal-footer {
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.15) 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .input-modern {
    padding: 12px 16px;
    font-size: 14px;
    background: var(--vscode-input-background, rgba(30, 30, 30, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: var(--vscode-input-foreground, var(--vscode-foreground));
    transition: all 0.2s ease;
  }

  .input-modern:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  .input-modern:focus {
    outline: none;
    border-color: rgba(168, 85, 247, 0.5);
    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
  }

  .btn-export {
    background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
    color: white;
    font-weight: 500;
    border: none;
    box-shadow: 0 2px 8px rgba(168, 85, 247, 0.3);
  }

  .btn-export:hover:not(:disabled) {
    background: linear-gradient(135deg, #9333ea 0%, #db2777 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(168, 85, 247, 0.4);
  }

  .btn-export:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .export-result {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
