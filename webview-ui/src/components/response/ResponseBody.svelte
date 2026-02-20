<script lang="ts">
  import JsonTreeView from './JsonTreeView.svelte';

  export let body: string;
  export let headers: Record<string, string>;

  let viewMode: 'pretty' | 'raw' | 'tree' | 'preview' = 'pretty';
  let wordWrap = true;

  function getContentType(): string {
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    return contentType.toLowerCase();
  }

  function isJson(): boolean {
    const ct = getContentType();
    return ct.includes('application/json') || ct.includes('+json');
  }

  function isXml(): boolean {
    const ct = getContentType();
    return ct.includes('xml');
  }

  function isHtml(): boolean {
    const ct = getContentType();
    return ct.includes('text/html');
  }

  function formatJson(text: string): string {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  function formatXml(text: string): string {
    // Simple XML formatting
    let formatted = '';
    let indent = 0;
    const parts = text.replace(/>\s*</g, '>\n<').split('\n');

    for (const part of parts) {
      if (part.match(/^<\/\w/)) indent--;
      formatted += '  '.repeat(Math.max(0, indent)) + part + '\n';
      if (part.match(/^<\w[^>]*[^\/]>$/)) indent++;
    }

    return formatted.trim();
  }

  $: formattedBody = (() => {
    if (viewMode === 'raw') return body;
    if (isJson()) return formatJson(body);
    if (isXml()) return formatXml(body);
    return body;
  })();

  $: language = (() => {
    if (isJson()) return 'json';
    if (isXml() || isHtml()) return 'xml';
    return 'text';
  })();

  $: parsedJson = (() => {
    if (!isJson()) return null;
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  })();
</script>

<div class="flex flex-col h-full">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-2 border-b border-vscode-border bg-vscode-sidebar-bg">
    <div class="flex items-center gap-1">
      <button
        class="view-btn px-2.5 py-1.5 text-xs rounded-lg transition-all"
        class:view-btn-active={viewMode === 'pretty'}
        on:click={() => viewMode = 'pretty'}
      >
        Pretty
      </button>
      {#if isJson() && parsedJson !== null}
        <button
          class="view-btn px-2.5 py-1.5 text-xs rounded-lg transition-all"
          class:view-btn-active={viewMode === 'tree'}
          on:click={() => viewMode = 'tree'}
        >
          Tree
        </button>
      {/if}
      <button
        class="view-btn px-2.5 py-1.5 text-xs rounded-lg transition-all"
        class:view-btn-active={viewMode === 'raw'}
        on:click={() => viewMode = 'raw'}
      >
        Raw
      </button>
      {#if isHtml()}
        <button
          class="view-btn px-2.5 py-1.5 text-xs rounded-lg transition-all"
          class:view-btn-active={viewMode === 'preview'}
          on:click={() => viewMode = 'preview'}
        >
          Preview
        </button>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <label class="flex items-center gap-1.5 text-xs cursor-pointer opacity-70">
        <input type="checkbox" class="accent-vscode-focus-border" bind:checked={wordWrap} />
        Word wrap
      </label>
      <span class="text-xs opacity-50 uppercase">{language}</span>
    </div>
  </div>

  <!-- Body Content -->
  <div class="flex-1 overflow-auto body-content">
    {#if viewMode === 'preview' && isHtml()}
      <iframe
        class="w-full h-full border-0 bg-white"
        srcdoc={body}
        sandbox="allow-same-origin"
        title="HTML Preview"
      ></iframe>
    {:else if viewMode === 'tree' && parsedJson !== null}
      <div class="p-4">
        <JsonTreeView data={parsedJson} />
      </div>
    {:else}
      <pre
        class="p-4 m-0 text-sm font-mono leading-relaxed"
        class:whitespace-pre-wrap={wordWrap}
        class:whitespace-pre={!wordWrap}
      ><code class="language-{language}">{formattedBody}</code></pre>
    {/if}
  </div>
</div>

<style>
  pre {
    tab-size: 2;
  }

  code {
    font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
  }

  .view-btn {
    background: transparent;
    color: var(--vscode-foreground);
    opacity: 0.6;
    border: 1px solid transparent;
  }

  .view-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    opacity: 0.9;
  }

  .view-btn-active {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    opacity: 1;
    border-color: rgba(59, 130, 246, 0.3);
  }

  .view-btn-active:hover {
    background: rgba(59, 130, 246, 0.2);
  }

  .body-content {
    background: var(--vscode-editor-background);
  }
</style>
