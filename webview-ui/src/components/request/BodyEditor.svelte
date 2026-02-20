<script lang="ts">
  import { activeRequest, generateId, type BodyType, type KeyValue } from '../../lib/stores';

  const bodyTypes: { id: BodyType; label: string }[] = [
    { id: 'none', label: 'None' },
    { id: 'json', label: 'JSON' },
    { id: 'form-data', label: 'Form Data' },
    { id: 'x-www-form-urlencoded', label: 'URL Encoded' },
    { id: 'raw', label: 'Raw' },
    { id: 'binary', label: 'Binary' },
  ];

  // Form data items for form-data and url-encoded body types
  let formDataItems: KeyValue[] = [{ id: generateId(), key: '', value: '', enabled: true }];
  let formDataInitialized = false;

  function handleBodyTypeChange(type: BodyType) {
    // When switching to form types, try to parse existing body as form data
    if ((type === 'form-data' || type === 'x-www-form-urlencoded') && $activeRequest.bodyType !== type) {
      try {
        const parsed = JSON.parse($activeRequest.body);
        if (Array.isArray(parsed)) {
          formDataItems = parsed.length > 0 ? parsed : [{ id: generateId(), key: '', value: '', enabled: true }];
        }
      } catch {
        // Reset form data items
        formDataItems = [{ id: generateId(), key: '', value: '', enabled: true }];
      }
      formDataInitialized = true;
    }
    activeRequest.update((r) => ({ ...r, bodyType: type }));
  }

  function formatJson() {
    try {
      const parsed = JSON.parse($activeRequest.body);
      const formatted = JSON.stringify(parsed, null, 2);
      activeRequest.update((r) => ({ ...r, body: formatted }));
    } catch {
      // Invalid JSON, ignore
    }
  }

  function isValidJson(text: string): boolean {
    if (!text.trim()) return true;
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  // Form data functions
  function updateFormDataKey(index: number, value: string) {
    formDataItems[index].key = value;
    formDataItems = [...formDataItems];
    // Auto-add new row when typing in the last row
    if (index === formDataItems.length - 1 && value !== '') {
      formDataItems = [...formDataItems, { id: generateId(), key: '', value: '', enabled: true }];
    }
    syncFormDataToBody();
  }

  function updateFormDataValue(index: number, value: string) {
    formDataItems[index].value = value;
    formDataItems = [...formDataItems];
    syncFormDataToBody();
  }

  function toggleFormDataItem(index: number) {
    formDataItems[index].enabled = !formDataItems[index].enabled;
    formDataItems = [...formDataItems];
    syncFormDataToBody();
  }

  function removeFormDataItem(index: number) {
    if (formDataItems.length > 1) {
      formDataItems = formDataItems.filter((_, i) => i !== index);
      syncFormDataToBody();
    }
  }

  function syncFormDataToBody() {
    // Store form data as JSON in the body field
    const validItems = formDataItems.filter(item => item.key.trim() !== '');
    activeRequest.update((r) => ({ ...r, body: JSON.stringify(validItems) }));
  }

  // Initialize form data from body when switching to form types
  $: if (($activeRequest.bodyType === 'form-data' || $activeRequest.bodyType === 'x-www-form-urlencoded') && !formDataInitialized) {
    if ($activeRequest.body) {
      try {
        const parsed = JSON.parse($activeRequest.body);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasEmptyLast = parsed[parsed.length - 1]?.key === '';
          formDataItems = hasEmptyLast ? parsed : [...parsed, { id: generateId(), key: '', value: '', enabled: true }];
        }
      } catch {
        // Not valid JSON, initialize with empty
        formDataItems = [{ id: generateId(), key: '', value: '', enabled: true }];
      }
    } else {
      formDataItems = [{ id: generateId(), key: '', value: '', enabled: true }];
    }
    formDataInitialized = true;
  }

  // Reset initialization flag when switching away from form types
  $: if ($activeRequest.bodyType !== 'form-data' && $activeRequest.bodyType !== 'x-www-form-urlencoded') {
    formDataInitialized = false;
  }

  $: jsonValid = $activeRequest.bodyType === 'json' ? isValidJson($activeRequest.body) : true;

  // Binary file handling
  let selectedFile: { name: string; size: number; type: string; base64: string } | null = null;

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1] || '';
        selectedFile = {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          base64,
        };
        // Store file info as JSON in body
        activeRequest.update((r) => ({
          ...r,
          body: JSON.stringify({
            type: 'binary',
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            base64,
          }),
        }));
      };
      reader.readAsDataURL(file);
    }
  }

  function clearFile() {
    selectedFile = null;
    activeRequest.update((r) => ({ ...r, body: '' }));
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Initialize selected file from body if present
  $: if ($activeRequest.bodyType === 'binary' && $activeRequest.body && !selectedFile) {
    try {
      const parsed = JSON.parse($activeRequest.body);
      if (parsed.type === 'binary') {
        selectedFile = {
          name: parsed.filename,
          size: parsed.size,
          type: parsed.mimeType,
          base64: parsed.base64,
        };
      }
    } catch {
      // Not valid JSON, ignore
    }
  }

  // Clear file when switching away from binary
  $: if ($activeRequest.bodyType !== 'binary') {
    selectedFile = null;
  }
</script>

<div class="space-y-5 p-4">
  <!-- Body Type Selector -->
  <div class="flex items-center gap-2 flex-wrap bg-vscode-editor-background/30 p-1.5 rounded-xl border border-vscode-border/20 backdrop-blur-md w-fit">
    {#each bodyTypes as type}
      <button
        class="px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 {$activeRequest.bodyType === type.id ? 'bg-api-primary text-white' : 'text-vscode-foreground/70 hover:text-vscode-foreground hover:bg-vscode-editor-background/50'}"
        on:click={() => handleBodyTypeChange(type.id)}
      >
        {type.label}
      </button>
    {/each}
  </div>

  <!-- Body Content -->
  <div class="bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl p-5 shadow-inner min-h-[250px]">
    {#if $activeRequest.bodyType === 'none'}
      <div class="text-center py-16 text-vscode-foreground/50 flex flex-col items-center justify-center h-full">
        <div class="w-16 h-16 rounded-full bg-vscode-editor-background/50 flex items-center justify-center mb-4 shadow-inner border border-vscode-border/30">
          <svg class="w-8 h-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p class="text-sm font-medium">This request does not have a body</p>
      </div>
    {:else if $activeRequest.bodyType === 'json'}
      <div class="space-y-3 h-full flex flex-col">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider">JSON Body</span>
          <div class="flex items-center gap-3">
            {#if !jsonValid}
              <span class="text-xs font-medium text-red-400 flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Invalid JSON
              </span>
            {/if}
            <button
              class="text-xs font-medium text-api-primary hover:text-api-purple transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={formatJson}
              disabled={!jsonValid}
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Format
            </button>
          </div>
        </div>
        <textarea
          class="input flex-1 font-mono text-sm min-h-[200px] resize-y bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
          class:border-red-500={!jsonValid}
          class:focus:border-red-500={!jsonValid}
          class:focus:ring-red-500={!jsonValid}
          placeholder={`{\n  "key": "value"\n}`}
          bind:value={$activeRequest.body}
        ></textarea>
      </div>
    {:else if $activeRequest.bodyType === 'raw'}
      <div class="space-y-3 h-full flex flex-col">
        <span class="text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider">Raw Body</span>
        <textarea
          class="input flex-1 font-mono text-sm min-h-[200px] resize-y bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200"
          placeholder="Enter raw body content"
          bind:value={$activeRequest.body}
        ></textarea>
      </div>
    {:else if $activeRequest.bodyType === 'form-data' || $activeRequest.bodyType === 'x-www-form-urlencoded'}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider">
            {$activeRequest.bodyType === 'form-data' ? 'Form Data' : 'URL Encoded Form'}
          </span>
          <span class="text-xs font-medium bg-vscode-editor-background/50 px-2 py-1 rounded-md border border-vscode-border/30 text-vscode-foreground/70">
            {formDataItems.filter(i => i.key.trim()).length} field{formDataItems.filter(i => i.key.trim()).length !== 1 ? 's' : ''}
          </span>
        </div>

      <!-- Form Data Table -->
      <div class="border border-vscode-border/30 rounded-xl overflow-hidden bg-vscode-editor-background/50 backdrop-blur-sm shadow-inner">
        <!-- Header -->
        <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-vscode-editor-background/80 text-xs font-medium text-vscode-foreground/70 border-b border-vscode-border/30 uppercase tracking-wider">
          <div class="w-6"></div>
          <div>KEY</div>
          <div>VALUE</div>
          <div class="w-8"></div>
        </div>

        <!-- Rows -->
        <div class="max-h-[240px] overflow-auto">
          {#each formDataItems as item, index (item.id)}
            <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-3 px-4 py-2 border-b border-vscode-border/20 last:border-b-0 hover:bg-vscode-list-hover/30 transition-colors group items-center">
              <!-- Enable/Disable -->
              <button
                type="button"
                class="w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 {item.enabled ? 'text-api-primary bg-api-primary/10 shadow-[0_0_8px_rgba(var(--api-primary-rgb),0.2)]' : 'text-vscode-foreground/30 hover:bg-vscode-editor-background/80'}"
                on:click={() => toggleFormDataItem(index)}
                title={item.enabled ? 'Disable' : 'Enable'}
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  {#if item.enabled}
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  {:else}
                    <circle cx="12" cy="12" r="10" />
                  {/if}
                </svg>
              </button>

              <!-- Key Input -->
              <input
                type="text"
                value={item.key}
                on:input={(e) => updateFormDataKey(index, e.currentTarget.value)}
                placeholder="key"
                class="input-sm w-full font-mono bg-transparent border-transparent focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 {!item.enabled ? 'opacity-50' : ''}"
              />

              <!-- Value Input -->
              <input
                type="text"
                value={item.value}
                on:input={(e) => updateFormDataValue(index, e.currentTarget.value)}
                placeholder="value"
                class="input-sm w-full font-mono bg-transparent border-transparent focus:border-api-primary/50 focus:ring-1 focus:ring-api-primary/50 transition-all duration-200 {!item.enabled ? 'opacity-50' : ''}"
              />

              <!-- Delete Button -->
              <button
                type="button"
                class="w-8 h-8 rounded-md flex items-center justify-center text-vscode-foreground/40 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 {formDataItems.length <= 1 ? '!opacity-30 cursor-not-allowed hover:bg-transparent hover:text-vscode-foreground/40' : ''}"
                on:click={() => removeFormDataItem(index)}
                disabled={formDataItems.length <= 1}
                title="Remove"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      </div>

      <div class="flex items-start gap-2 mt-4 p-3 rounded-lg bg-api-primary/5 border border-api-primary/10">
        <svg class="w-4 h-4 text-api-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs text-vscode-foreground/60 leading-relaxed">
          {#if $activeRequest.bodyType === 'form-data'}
            Content-Type: <code class="px-1 py-0.5 rounded bg-vscode-editor-background/50 text-api-primary">multipart/form-data</code>
          {:else}
            Content-Type: <code class="px-1 py-0.5 rounded bg-vscode-editor-background/50 text-api-primary">application/x-www-form-urlencoded</code>
          {/if}
        </p>
      </div>
    </div>
  {:else if $activeRequest.bodyType === 'binary'}
    <div class="space-y-4 h-full flex flex-col">
      <span class="text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider">Binary File</span>

      {#if selectedFile}
        <!-- Selected File Display -->
        <div class="p-5 rounded-xl bg-vscode-editor-background/50 backdrop-blur-sm border border-vscode-border/30 shadow-inner">
          <div class="flex items-start gap-4">
            <!-- File Icon -->
            <div class="p-3 rounded-xl bg-gradient-to-br from-api-primary/20 to-api-purple/20 border border-api-primary/20 shadow-[0_0_15px_rgba(var(--api-primary-rgb),0.1)]">
              <svg class="w-8 h-8 text-api-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>

            <!-- File Info -->
            <div class="flex-1 min-w-0 pt-1">
              <p class="text-sm font-medium text-vscode-foreground truncate">{selectedFile.name}</p>
              <p class="text-xs text-vscode-foreground/50 mt-1 flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded bg-vscode-editor-background/50 border border-vscode-border/30">{formatFileSize(selectedFile.size)}</span>
                <span class="px-1.5 py-0.5 rounded bg-vscode-editor-background/50 border border-vscode-border/30">{selectedFile.type}</span>
              </p>
            </div>

            <!-- Remove Button -->
            <button
              class="p-2 rounded-lg hover:bg-red-500/10 text-vscode-foreground/40 hover:text-red-400 transition-all duration-200"
              on:click={clearFile}
              title="Remove file"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Change File Button -->
        <label class="block">
          <input
            type="file"
            class="hidden"
            on:change={handleFileSelect}
          />
          <span class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-vscode-editor-background/50 border border-vscode-border/30 hover:bg-vscode-editor-background/80 hover:border-api-primary/50 text-vscode-foreground cursor-pointer transition-all duration-200 shadow-sm">
            <svg class="w-4 h-4 text-api-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Change File
          </span>
        </label>
      {:else}
        <!-- File Drop Zone -->
        <label class="block flex-1">
          <input
            type="file"
            class="hidden"
            on:change={handleFileSelect}
          />
          <div class="h-full min-h-[200px] border-2 border-dashed border-vscode-border/30 rounded-xl p-8 text-center cursor-pointer hover:border-api-primary/50 hover:bg-api-primary/5 transition-all duration-300 flex flex-col items-center justify-center group">
            <div class="w-16 h-16 rounded-full bg-vscode-editor-background/50 flex items-center justify-center mb-4 shadow-inner border border-vscode-border/30 group-hover:scale-110 group-hover:border-api-primary/30 transition-all duration-300">
              <svg class="w-8 h-8 text-vscode-foreground/30 group-hover:text-api-primary transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p class="text-sm font-medium text-vscode-foreground/80">Click to select a file</p>
            <p class="text-xs text-vscode-foreground/50 mt-1">or drag and drop</p>
          </div>
        </label>
      {/if}

      <div class="flex items-start gap-2 mt-4 p-3 rounded-lg bg-api-primary/5 border border-api-primary/10">
        <svg class="w-4 h-4 text-api-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-xs text-vscode-foreground/60 leading-relaxed">
          The file will be sent as the raw request body with the appropriate <code class="px-1 py-0.5 rounded bg-vscode-editor-background/50 text-api-primary">Content-Type</code> header.
        </p>
      </div>
    </div>
  {/if}
  </div>
</div>

<style>
  .input-sm {
    padding: 6px 10px;
    font-size: 13px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    color: var(--vscode-input-foreground);
  }

  .input-sm:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
  }

  .input-sm::placeholder {
    color: var(--vscode-input-placeholderForeground);
  }
</style>
