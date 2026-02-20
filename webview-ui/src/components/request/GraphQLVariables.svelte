<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import CodeEditor from "../shared/CodeEditor.svelte";

  export let value = "{}";

  const dispatch = createEventDispatcher<{ change: string }>();

  let error = "";

  function handleChange(e: CustomEvent<string>) {
    value = e.detail;

    // Validate JSON
    if (value.trim()) {
      try {
        JSON.parse(value);
        error = "";
      } catch (e) {
        error = "Invalid JSON";
      }
    } else {
      error = "";
    }

    dispatch("change", value);
  }

  function formatVariables() {
    try {
      const parsed = JSON.parse(value);
      value = JSON.stringify(parsed, null, 2);
      error = "";
      dispatch("change", value);
    } catch {
      error = "Cannot format: Invalid JSON";
    }
  }

  function clearVariables() {
    value = "{}";
    error = "";
    dispatch("change", value);
  }
</script>

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md border border-vscode-border/20 rounded-xl overflow-hidden shadow-inner m-4">
  <!-- Toolbar -->
  <div
    class="flex items-center justify-between px-4 py-2.5 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl"
  >
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-vscode-foreground/70 uppercase tracking-wider">
        JSON Variables
      </span>
      {#if error}
        <span class="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">{error}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <button
        class="text-xs font-medium text-vscode-foreground/70 hover:text-api-primary transition-colors px-2 py-1.5 rounded-md hover:bg-api-primary/10"
        on:click={formatVariables}
      >
        Format
      </button>
      <button
        class="text-xs font-medium text-vscode-foreground/70 hover:text-red-400 transition-colors px-2 py-1.5 rounded-md hover:bg-red-500/10"
        on:click={clearVariables}
      >
        Clear
      </button>
    </div>
  </div>

  <!-- Editor -->
  <div class="flex-1 overflow-hidden bg-vscode-editor-background/50">
    <CodeEditor
      {value}
      language="json"
      placeholder={`{\n  "variableName": "value"\n}`}
      minHeight="100%"
      maxHeight="100%"
      on:change={handleChange}
    />
  </div>

  <!-- Help Text -->
  <div
    class="px-4 py-2.5 text-xs border-t border-vscode-border/30 bg-api-primary/5 flex items-start gap-2"
  >
    <svg class="w-4 h-4 text-api-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p class="text-vscode-foreground/70 leading-relaxed">
      Define variables as JSON. Use <code
        class="px-1.5 py-0.5 bg-vscode-editor-background/50 border border-vscode-border/30 rounded-md text-api-primary font-mono"
      >$variableName</code> in your query.
    </p>
  </div>
</div>
