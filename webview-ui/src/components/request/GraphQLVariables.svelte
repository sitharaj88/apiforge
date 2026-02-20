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

<div class="flex flex-col h-full">
  <!-- Toolbar -->
  <div
    class="flex items-center justify-between px-3 py-2 border-b border-vscode-border bg-vscode-sidebar-bg"
  >
    <div class="flex items-center gap-2">
      <span class="text-xs text-vscode-foreground" style="opacity: 0.6;">
        JSON Variables
      </span>
      {#if error}
        <span class="text-xs text-red-400">{error}</span>
      {/if}
    </div>
    <div class="flex items-center gap-2">
      <button
        class="text-xs text-vscode-link hover:text-vscode-link-hover"
        on:click={formatVariables}
      >
        Format
      </button>
      <button
        class="text-xs text-vscode-foreground hover:text-red-400"
        style="opacity: 0.6;"
        on:click={clearVariables}
      >
        Clear
      </button>
    </div>
  </div>

  <!-- Editor -->
  <div class="flex-1 overflow-hidden">
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
    class="px-3 py-2 text-xs border-t border-vscode-border bg-vscode-sidebar-bg text-vscode-foreground"
    style="opacity: 0.6;"
  >
    <p>
      Define variables as JSON. Use <code
        class="px-1 py-0.5 bg-vscode-input-bg rounded">$variableName</code
      > in your query.
    </p>
  </div>
</div>
