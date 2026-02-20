<script lang="ts">
  import { importFromCurl, importData, importResult } from '../../lib/stores';

  export let isOpen = false;
  export let onClose: () => void = () => {};

  let importType: 'curl' | 'postman' | 'openapi' | 'har' = 'curl';
  let importContent = '';
  let isImporting = false;

  const importTypes = [
    { id: 'curl', label: 'cURL', icon: '💻', description: 'Import from cURL command', placeholder: 'curl -X GET https://api.example.com/users -H "Authorization: Bearer token"' },
    { id: 'postman', label: 'Postman', icon: '📮', description: 'Postman Collection v2.1', placeholder: 'Paste Postman collection JSON...' },
    { id: 'openapi', label: 'OpenAPI', icon: '📄', description: 'OpenAPI 3.0/Swagger 2.0', placeholder: 'Paste OpenAPI/Swagger JSON...' },
    { id: 'har', label: 'HAR', icon: '🌐', description: 'HTTP Archive format', placeholder: 'Paste HAR file content...' },
  ];

  $: currentPlaceholder = importTypes.find(t => t.id === importType)?.placeholder || '';

  function handleImport() {
    if (!importContent.trim()) return;

    isImporting = true;

    if (importType === 'curl') {
      importFromCurl(importContent);
    } else {
      importData(importContent, importType);
    }
  }

  // Watch for import result
  $: if ($importResult) {
    isImporting = false;
    if ($importResult.success) {
      handleClose();
    }
  }

  function handleClose() {
    importContent = '';
    importResult.set(null);
    onClose();
  }
</script>

{#if isOpen}
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
  on:click|self={handleClose}
  on:keydown={(e) => e.key === 'Escape' && handleClose()}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  tabindex="-1"
>
  <div
    class="modal-content w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Header -->
    <div class="modal-header flex items-center justify-between px-6 py-5 flex-shrink-0">
      <div class="flex items-center gap-4">
        <div class="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 ring-1 ring-blue-500/20">
          <svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div>
          <h2 id="modal-title" class="text-base font-semibold text-vscode-foreground">Import Request</h2>
          <p class="text-xs text-blue-400/70">Import from cURL, Postman, OpenAPI, or HAR</p>
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
      <!-- Import Type Selector -->
      <div class="mb-5">
        <label class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider mb-3">
          Import Type
        </label>
        <div class="grid grid-cols-2 gap-2">
          {#each importTypes as type}
            <button
              class="import-type-option flex items-center gap-3 p-3 rounded-xl text-left transition-all {importType === type.id
                ? 'bg-gradient-to-r from-blue-500/15 to-indigo-500/15 ring-1 ring-blue-500/30'
                : 'bg-white/[0.02] hover:bg-white/[0.04] border border-white/5'}"
              on:click={() => importType = type.id as typeof importType}
            >
              <span class="text-xl">{type.icon}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-vscode-foreground">{type.label}</div>
                <div class="text-xs text-vscode-foreground/50 truncate">{type.description}</div>
              </div>
              {#if importType === type.id}
                <svg class="w-4 h-4 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <!-- Import Content -->
      <div>
        <label class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider mb-3">
          {importType === 'curl' ? 'cURL Command' : `${importTypes.find(t => t.id === importType)?.label} Content`}
        </label>
        <textarea
          class="input-modern w-full font-mono text-sm"
          rows="8"
          placeholder={currentPlaceholder}
          bind:value={importContent}
        ></textarea>
      </div>

      <!-- Result Messages -->
      {#if $importResult}
        {#if $importResult.success}
          <div class="mt-5 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Successfully imported {$importResult.collections || 0} collection(s)
              {#if $importResult.environments}
                and {$importResult.environments} environment(s)
              {/if}
            </span>
          </div>
        {:else if $importResult.errors?.length}
          <div class="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              {#each $importResult.errors as err}
                <p>{err}</p>
              {/each}
            </div>
          </div>
        {/if}
        {#if $importResult.warnings?.length}
          <div class="mt-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              {#each $importResult.warnings as warning}
                <p>{warning}</p>
              {/each}
            </div>
          </div>
        {/if}
      {/if}

      <!-- Tips -->
      <div class="mt-5 p-4 rounded-xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/10 text-xs">
        <div class="flex items-start gap-3">
          <div class="p-1.5 rounded-lg bg-blue-500/10 flex-shrink-0">
            <svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1 text-vscode-foreground/70">
            {#if importType === 'curl'}
              <p class="font-medium text-vscode-foreground/90 mb-1">How to get a cURL command:</p>
              <ul class="space-y-1 list-disc list-inside ml-0.5">
                <li>Open browser DevTools → Network tab</li>
                <li>Right-click a request → Copy as cURL</li>
                <li>Or copy from API documentation</li>
              </ul>
            {:else if importType === 'postman'}
              <p class="font-medium text-vscode-foreground/90 mb-1">How to export from Postman:</p>
              <ul class="space-y-1 list-disc list-inside ml-0.5">
                <li>Click the three dots on your collection</li>
                <li>Select "Export" → Collection v2.1</li>
                <li>Copy the JSON content</li>
              </ul>
            {:else if importType === 'openapi'}
              <p class="font-medium text-vscode-foreground/90 mb-1">Supported formats:</p>
              <ul class="space-y-1 list-disc list-inside ml-0.5">
                <li>OpenAPI 3.0 / 3.1 specification</li>
                <li>Swagger 2.0 specification</li>
                <li>JSON format only</li>
              </ul>
            {:else if importType === 'har'}
              <p class="font-medium text-vscode-foreground/90 mb-1">How to export HAR file:</p>
              <ul class="space-y-1 list-disc list-inside ml-0.5">
                <li>Open browser DevTools → Network tab</li>
                <li>Right-click → "Save all as HAR"</li>
                <li>Open and copy file contents</li>
              </ul>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="modal-footer flex items-center justify-between px-6 py-4 flex-shrink-0">
      <div class="text-xs text-vscode-foreground/50">
        {#if importContent.trim()}
          Ready to import {importTypes.find(t => t.id === importType)?.label} data
        {:else}
          Paste {importTypes.find(t => t.id === importType)?.label} content above
        {/if}
      </div>
      <div class="flex items-center gap-3">
        <button
          class="px-5 py-2.5 text-sm font-medium rounded-xl text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-white/5 transition-all"
          on:click={handleClose}
          type="button"
        >
          Cancel
        </button>
        <button
          class="btn-import px-6 py-2.5 text-sm font-medium rounded-xl transition-all flex items-center gap-2"
          on:click={handleImport}
          disabled={!importContent.trim() || isImporting}
          type="button"
        >
          {#if isImporting}
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Importing...
          {:else}
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          {/if}
        </button>
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
      0 0 80px -20px rgba(59, 130, 246, 0.15);
    overflow: hidden;
  }

  .modal-header {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(59, 130, 246, 0.15);
  }

  .modal-footer {
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.15) 100%);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .input-modern {
    padding: 14px 16px;
    font-size: 13px;
    background: var(--vscode-input-background, rgba(30, 30, 30, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    color: var(--vscode-input-foreground, var(--vscode-foreground));
    transition: all 0.2s ease;
    resize: vertical;
  }

  .input-modern:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  .input-modern:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input-modern::placeholder {
    color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.4));
  }

  .btn-import {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-weight: 500;
    border: none;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-import:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4);
  }

  .btn-import:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  }

  .btn-import:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }

  .import-type-option {
    transition: all 0.2s ease;
  }

  .import-type-option:hover {
    transform: translateY(-1px);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
