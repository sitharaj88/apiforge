<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface Variable {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
  }

  interface Environment {
    id: string;
    name: string;
    variables: Variable[];
  }

  export let environment: Environment;

  const dispatch = createEventDispatcher();

  let editedName = environment.name;
  let editedVariables: Variable[] = JSON.parse(JSON.stringify(environment.variables));

  // Ensure at least one empty row
  if (editedVariables.length === 0 || editedVariables[editedVariables.length - 1].key !== '') {
    editedVariables = [...editedVariables, { id: generateId(), key: '', value: '', enabled: true }];
  }

  function generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }

  function handleVariableChange(index: number) {
    // Trigger Svelte reactivity by reassigning the array
    editedVariables = [...editedVariables];
    // Auto-add new row when typing in the last row
    if (index === editedVariables.length - 1 && editedVariables[index].key !== '') {
      editedVariables = [...editedVariables, { id: generateId(), key: '', value: '', enabled: true }];
    }
  }

  function updateVariableKey(index: number, value: string) {
    editedVariables[index].key = value;
    handleVariableChange(index);
  }

  function updateVariableValue(index: number, value: string) {
    editedVariables[index].value = value;
    editedVariables = [...editedVariables];
  }

  function removeVariable(index: number) {
    if (editedVariables.length > 1) {
      editedVariables = editedVariables.filter((_, i) => i !== index);
    }
  }

  function toggleVariable(index: number) {
    editedVariables[index].enabled = !editedVariables[index].enabled;
  }

  function handleSave() {
    // Filter out empty variables
    const validVariables = editedVariables.filter(v => v.key.trim() !== '');
    dispatch('save', {
      ...environment,
      name: editedName.trim() || environment.name,
      variables: validVariables
    });
  }

  function handleClose() {
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<div
  class="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
  on:click={handleBackdropClick}
  role="presentation"
>
  <div
    class="modal-content w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col bg-vscode-editor-background/80 backdrop-blur-xl border border-vscode-border/30 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Header -->
    <div class="modal-header flex items-center justify-between px-6 py-5 flex-shrink-0 border-b border-vscode-border/20 bg-vscode-editor-background/50 backdrop-blur-md">
      <div class="flex items-center gap-4">
        <div class="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 ring-1 ring-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
          <svg class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <div>
          <h2 id="modal-title" class="text-base font-semibold text-vscode-foreground flex items-center gap-2">
            Edit Environment
            <span class="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse"></span>
          </h2>
          <p class="text-xs text-green-400/70 mt-0.5">Configure variables for {editedName || 'this environment'}</p>
        </div>
      </div>
      <button
        class="p-2 rounded-lg hover:bg-vscode-editor-background/80 text-vscode-foreground/60 hover:text-vscode-foreground transition-all duration-200 border border-transparent hover:border-vscode-border/30"
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
    <div class="px-6 py-5 flex-1 overflow-auto bg-vscode-editor-background/30">
      <!-- Environment Name -->
      <div class="mb-6">
        <label for="env-name" class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider mb-2.5">
          Environment Name
        </label>
        <input
          id="env-name"
          type="text"
          bind:value={editedName}
          placeholder="e.g., Development, Production"
          class="input-modern w-full bg-vscode-editor-background/50 backdrop-blur-sm border-vscode-border/30 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all duration-200"
        />
      </div>

      <!-- Variables -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <span class="block text-xs font-medium text-vscode-foreground/60 uppercase tracking-wider">
            Variables
          </span>
          <span class="text-xs text-vscode-foreground/50 flex items-center gap-2">
            Use as <code class="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[11px] shadow-inner">{'{{variableName}}'}</code>
          </span>
        </div>

        <!-- Variable Header -->
        <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-3 mb-2 px-3 py-2 rounded-lg bg-vscode-editor-background/50 border border-vscode-border/20">
          <div class="w-7"></div>
          <span class="text-[10px] font-bold text-vscode-foreground/50 uppercase tracking-wider">Key</span>
          <span class="text-[10px] font-bold text-vscode-foreground/50 uppercase tracking-wider">Value</span>
          <div class="w-8"></div>
        </div>

        <!-- Variable Rows -->
        <div class="variables-list space-y-2 max-h-72 overflow-auto pr-1">
          {#each editedVariables as variable, index (variable.id)}
            <div class="variable-row grid grid-cols-[auto_1fr_1fr_auto] gap-3 items-center p-2 rounded-xl border border-vscode-border/10 bg-vscode-editor-background/40 hover:bg-vscode-editor-background/60 hover:border-vscode-border/30 transition-all duration-200 group">
              <!-- Enable/Disable -->
              <button
                type="button"
                class="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 {variable.enabled ? 'bg-green-500/20 text-green-400 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'bg-vscode-editor-background/80 text-vscode-foreground/30 border border-vscode-border/30'}"
                on:click={() => toggleVariable(index)}
                title={variable.enabled ? 'Disable variable' : 'Enable variable'}
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  {#if variable.enabled}
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  {:else}
                    <circle cx="12" cy="12" r="8" stroke-width="2" />
                  {/if}
                </svg>
              </button>

              <!-- Key Input -->
              <input
                type="text"
                value={variable.key}
                on:input={(e) => updateVariableKey(index, e.currentTarget.value)}
                placeholder="variable_name"
                class="input-sm w-full font-mono text-[13px] bg-vscode-editor-background/50 border-vscode-border/20 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all duration-200 {!variable.enabled ? 'opacity-40' : ''}"
              />

              <!-- Value Input -->
              <input
                type="text"
                value={variable.value}
                on:input={(e) => updateVariableValue(index, e.currentTarget.value)}
                placeholder="value"
                class="input-sm w-full font-mono text-[13px] bg-vscode-editor-background/50 border-vscode-border/20 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all duration-200 {!variable.enabled ? 'opacity-40' : ''}"
              />

              <!-- Delete Button -->
              <button
                type="button"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-vscode-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all {editedVariables.length <= 1 ? 'opacity-20 cursor-not-allowed' : ''}"
                on:click={() => removeVariable(index)}
                disabled={editedVariables.length <= 1}
                title="Remove variable"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          {/each}
        </div>

        <!-- Add Variable Button -->
        <button
          type="button"
          class="flex items-center justify-center gap-2 w-full mt-4 px-4 py-3 rounded-xl text-sm text-green-400/80 hover:text-green-400 border border-dashed border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5 transition-all"
          on:click={() => {
            editedVariables = [...editedVariables, { id: generateId(), key: '', value: '', enabled: true }];
          }}
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Variable
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="modal-footer flex items-center justify-between px-6 py-4 flex-shrink-0">
      <div class="flex items-center gap-2 text-xs text-vscode-foreground/50">
        <svg class="w-4 h-4 text-green-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>{editedVariables.filter(v => v.key.trim()).length} variable{editedVariables.filter(v => v.key.trim()).length !== 1 ? 's' : ''} defined</span>
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
          class="btn-save px-6 py-2.5 text-sm font-medium rounded-xl transition-all"
          on:click={handleSave}
          type="button"
        >
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </span>
        </button>
      </div>
    </div>
  </div>
</div>

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
      0 0 80px -20px rgba(34, 197, 94, 0.15);
    overflow: hidden;
  }

  .modal-header {
    background: linear-gradient(180deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%);
    border-bottom: 1px solid rgba(34, 197, 94, 0.15);
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
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
  }

  .input-modern::placeholder {
    color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.4));
  }

  .input-sm {
    padding: 10px 14px;
    font-size: 13px;
    background: var(--vscode-input-background, rgba(30, 30, 30, 0.8));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: var(--vscode-input-foreground, var(--vscode-foreground));
    transition: all 0.2s ease;
  }

  .input-sm:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  .input-sm:focus {
    outline: none;
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
  }

  .input-sm::placeholder {
    color: var(--vscode-input-placeholderForeground, rgba(255, 255, 255, 0.4));
  }

  .variable-row {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    transition: all 0.15s ease;
  }

  .variable-row:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .variable-row:focus-within {
    background: rgba(34, 197, 94, 0.03);
    border-color: rgba(34, 197, 94, 0.2);
  }

  .btn-save {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    font-weight: 500;
    border: none;
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  }

  .btn-save:hover {
    background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4);
  }

  .btn-save:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
  }

  /* Custom scrollbar for variables list */
  .variables-list::-webkit-scrollbar {
    width: 6px;
  }

  .variables-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .variables-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .variables-list::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }
</style>
