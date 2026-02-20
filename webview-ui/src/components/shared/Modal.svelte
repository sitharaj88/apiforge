<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  export let open = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  export let showClose = true;
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;

  const dispatch = createEventDispatcher<{ close: void }>();

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  };

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (closeOnEscape && e.key === 'Escape' && open) {
      handleClose();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300"
    on:click={handleBackdropClick}
  >
    <div
      class="bg-vscode-editor-background/80 backdrop-blur-xl border border-vscode-border/30 rounded-xl shadow-2xl w-full mx-4 {sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-vscode-border/30 bg-vscode-editor-background/50">
        <h2 id="modal-title" class="text-lg font-semibold text-vscode-foreground flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-api-primary shadow-[0_0_8px_var(--api-primary)]"></div>
          {title}
        </h2>
        {#if showClose}
          <button
            class="p-1.5 rounded-md text-vscode-foreground/60 hover:text-vscode-foreground hover:bg-vscode-editor-background/80 transition-colors"
            on:click={handleClose}
            aria-label="Close"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-auto p-5">
        <slot />
      </div>

      <!-- Footer (optional) -->
      {#if $$slots.footer}
        <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-vscode-border/30 bg-vscode-sidebar-background/30 backdrop-blur-md">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}
