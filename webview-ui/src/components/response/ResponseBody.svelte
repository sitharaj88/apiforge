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

<div class="flex flex-col h-full bg-vscode-editor-background/30 backdrop-blur-md">
  <!-- Toolbar -->
  <div class="flex items-center justify-between px-4 py-2.5 border-b border-vscode-border/30 bg-vscode-editor-background/80 backdrop-blur-xl shadow-sm">
    <div class="flex items-center gap-1.5 bg-vscode-editor-background/50 p-1 rounded-lg border border-vscode-border/30 shadow-inner">
      <button
        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 {viewMode === 'pretty' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
        style={viewMode !== 'pretty' ? 'opacity: 0.7;' : ''}
        on:click={() => viewMode = 'pretty'}
      >
        Pretty
      </button>
      {#if isJson() && parsedJson !== null}
        <button
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 {viewMode === 'tree' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
          style={viewMode !== 'tree' ? 'opacity: 0.7;' : ''}
          on:click={() => viewMode = 'tree'}
        >
          Tree
        </button>
      {/if}
      <button
        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 {viewMode === 'raw' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
        style={viewMode !== 'raw' ? 'opacity: 0.7;' : ''}
        on:click={() => viewMode = 'raw'}
      >
        Raw
      </button>
      {#if isHtml()}
        <button
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 {viewMode === 'preview' ? 'bg-api-primary text-white' : 'text-vscode-foreground hover:bg-vscode-editor-background/80'}"
          style={viewMode !== 'preview' ? 'opacity: 0.7;' : ''}
          on:click={() => viewMode = 'preview'}
        >
          Preview
        </button>
      {/if}
    </div>
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-xs cursor-pointer text-vscode-foreground/70 hover:text-vscode-foreground transition-colors">
        <input type="checkbox" class="w-3.5 h-3.5 rounded border-vscode-border/50 bg-vscode-editor-background/50 text-api-primary focus:ring-api-primary/50 focus:ring-offset-0 transition-all" bind:checked={wordWrap} />
        Word wrap
      </label>
      <div class="w-px h-4 bg-vscode-border/50"></div>
      <span class="text-[10px] font-semibold text-vscode-foreground/40 uppercase tracking-wider px-2 py-1 rounded-md bg-vscode-editor-background/50 border border-vscode-border/30 shadow-inner">{language}</span>
    </div>
  </div>

  <!-- Body Content -->
  <div class="flex-1 overflow-auto bg-vscode-editor-background/20">
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
        class="p-4 m-0 text-sm font-mono leading-relaxed text-vscode-foreground/90"
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
</style>
