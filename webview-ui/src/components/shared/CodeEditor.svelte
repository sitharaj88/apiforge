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
  class="code-editor border border-vscode-border rounded overflow-hidden bg-vscode-input-bg"
  style="min-height: {minHeight}; max-height: {maxHeight};"
>
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-2 py-1 border-b border-vscode-border bg-vscode-sidebar-bg">
    <span class="text-xs text-vscode-foreground uppercase" style="opacity: 0.5;">{language}</span>
    <div class="flex items-center gap-2">
      {#if language === 'json'}
        <button
          class="text-xs text-vscode-link hover:text-vscode-link-hover"
          on:click={formatCode}
          title="Format JSON"
        >
          Format
        </button>
      {/if}
    </div>
  </div>

  <!-- Editor -->
  <div class="flex overflow-auto" style="max-height: calc({maxHeight} - 32px);">
    {#if showLineNumbers}
      <div
        bind:this={lineNumbersEl}
        class="line-numbers flex-shrink-0 px-2 py-2 text-right select-none bg-vscode-sidebar-bg border-r border-vscode-border overflow-hidden"
      >
        {#each lineNumbers as num}
          <div class="text-xs leading-5 text-vscode-foreground" style="opacity: 0.4;">{num}</div>
        {/each}
      </div>
    {/if}
    <textarea
      bind:this={textarea}
      bind:value
      class="flex-1 p-2 font-mono text-sm leading-5 resize-none outline-none bg-transparent text-vscode-foreground"
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
    font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, 'Liberation Mono', 'Courier New', monospace;
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
    min-width: 2.5rem;
  }
</style>
