<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';

  export let value = '';
  export let language: 'json' | 'graphql' | 'javascript' | 'xml' | 'text' = 'text';
  export let placeholder = '';
  export let readonly = false;
  export let minHeight = '200px';
  export let maxHeight = '400px';
  export let showLineNumbers = true;

  const dispatch = createEventDispatcher<{ change: string }>();

  let textarea: HTMLTextAreaElement;
  let lineNumbers: number[] = [];

  $: lines = value.split('\n').length;
  $: lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    value = target.value;
    dispatch('change', value);
    syncScroll();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      value = value.substring(0, start) + '  ' + value.substring(end);
      dispatch('change', value);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }

  let lineNumbersEl: HTMLDivElement;

  function syncScroll() {
    if (lineNumbersEl && textarea) {
      lineNumbersEl.scrollTop = textarea.scrollTop;
    }
  }

  function formatCode() {
    if (language === 'json') {
      try {
        const parsed = JSON.parse(value);
        value = JSON.stringify(parsed, null, 2);
        dispatch('change', value);
      } catch {
        // Invalid JSON, don't format
      }
    }
  }

  onMount(() => {
    if (textarea) {
      textarea.addEventListener('scroll', syncScroll);
      return () => textarea.removeEventListener('scroll', syncScroll);
    }
  });
</script>

<div
  class="code-editor border border-vscode-border/30 rounded-xl overflow-hidden bg-vscode-editor-background/30 backdrop-blur-md shadow-inner transition-all duration-200 focus-within:border-api-primary/50 focus-within:ring-1 focus-within:ring-api-primary/50"
  style="min-height: {minHeight}; max-height: {maxHeight};"
>
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-3 py-2 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl">
    <span class="text-[10px] font-semibold text-vscode-foreground/50 uppercase tracking-wider px-2 py-1 rounded-md bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner">{language}</span>
    <div class="flex items-center gap-2">
      {#if language === 'json'}
        <button
          class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors px-2.5 py-1 rounded-md hover:bg-api-primary/10"
          on:click={formatCode}
          title="Format JSON"
        >
          Format
        </button>
      {/if}
    </div>
  </div>

  <!-- Editor -->
  <div class="flex overflow-auto bg-vscode-editor-background/20" style="max-height: calc({maxHeight} - 32px);">
    {#if showLineNumbers}
      <div
        bind:this={lineNumbersEl}
        class="line-numbers flex-shrink-0 px-3 py-3 text-right select-none bg-vscode-editor-background/30 border-r border-vscode-border/20 overflow-hidden"
      >
        {#each lineNumbers as num}
          <div class="text-xs leading-6 text-vscode-foreground/30">{num}</div>
        {/each}
      </div>
    {/if}
    <textarea
      bind:this={textarea}
      bind:value
      class="flex-1 p-3 font-mono text-sm leading-6 resize-none outline-none bg-transparent text-vscode-foreground/90 placeholder-vscode-foreground/30"
      class:readonly
      {placeholder}
      {readonly}
      spellcheck="false"
      on:input={handleInput}
      on:keydown={handleKeydown}
    ></textarea>
  </div>
</div>

<style>
  .code-editor {
    font-family: var(--vscode-editor-font-family, 'SF Mono', Monaco, 'Cascadia Code', Consolas, 'Liberation Mono', 'Courier New', monospace);
  }

  textarea {
    tab-size: 2;
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: auto;
  }

  textarea.readonly {
    cursor: default;
  }

  .line-numbers {
    min-width: 3rem;
  }
</style>
