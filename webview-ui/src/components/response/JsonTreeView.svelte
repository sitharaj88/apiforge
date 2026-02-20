<script lang="ts">
  export let data: any;
  export let depth = 0;
  export let keyName: string | number | null = null;
  export let isLast = true;

  let collapsed = depth > 2; // Auto-collapse after depth 2

  $: isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  $: isArray = Array.isArray(data);
  $: isPrimitive = !isObject && !isArray;
  $: keys = isObject ? Object.keys(data) : [];
  $: items = isArray ? data : [];

  function getValueClass(value: any): string {
    if (value === null) return 'json-null';
    if (typeof value === 'boolean') return 'json-boolean';
    if (typeof value === 'number') return 'json-number';
    if (typeof value === 'string') return 'json-string';
    return '';
  }

  function formatValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return `"${value}"`;
    return String(value);
  }

  function getPreview(data: any): string {
    if (Array.isArray(data)) {
      if (data.length === 0) return '[]';
      if (data.length <= 3) {
        const preview = data.map(v => {
          if (typeof v === 'string') return `"${v.length > 20 ? v.slice(0, 20) + '...' : v}"`;
          if (typeof v === 'object') return Array.isArray(v) ? '[...]' : '{...}';
          return String(v);
        }).join(', ');
        return `[${preview}]`;
      }
      return `[${data.length} items]`;
    }
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length === 0) return '{}';
      if (keys.length <= 3) {
        return `{ ${keys.join(', ')} }`;
      }
      return `{${keys.length} keys}`;
    }
    return '';
  }
</script>

<div class="json-node" class:depth-indent={depth > 0}>
  {#if isPrimitive}
    <span class="json-line">
      {#if keyName !== null}
        <span class="json-key">"{keyName}"</span>
        <span class="json-colon">: </span>
      {/if}
      <span class={getValueClass(data)}>{formatValue(data)}</span>
      {#if !isLast}<span class="json-comma">,</span>{/if}
    </span>
  {:else}
    <div class="json-container">
      <button
        class="json-toggle"
        on:click={() => collapsed = !collapsed}
        aria-label={collapsed ? 'Expand' : 'Collapse'}
      >
        <svg class="toggle-icon" class:collapsed viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <span class="json-line">
        {#if keyName !== null}
          <span class="json-key">"{keyName}"</span>
          <span class="json-colon">: </span>
        {/if}
        <span class="json-bracket">{isArray ? '[' : '{'}</span>
        {#if collapsed}
          <button type="button" class="json-preview" on:click={() => collapsed = false}>{getPreview(data)}</button>
          <span class="json-bracket">{isArray ? ']' : '}'}</span>
          {#if !isLast}<span class="json-comma">,</span>{/if}
        {/if}
      </span>

      {#if !collapsed}
        <div class="json-children">
          {#if isArray}
            {#each items as item, i (i)}
              <svelte:self
                data={item}
                depth={depth + 1}
                keyName={i}
                isLast={i === items.length - 1}
              />
            {/each}
          {:else}
            {#each keys as key, i (key)}
              <svelte:self
                data={data[key]}
                depth={depth + 1}
                keyName={key}
                isLast={i === keys.length - 1}
              />
            {/each}
          {/if}
        </div>
        <span class="json-line closing-bracket">
          <span class="json-bracket">{isArray ? ']' : '}'}</span>
          {#if !isLast}<span class="json-comma">,</span>{/if}
        </span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .json-node {
    font-family: var(--vscode-editor-font-family, 'SF Mono', 'Fira Code', 'Consolas', monospace);
    font-size: 13px;
    line-height: 1.6;
  }

  .depth-indent {
    margin-left: 1.5rem;
    border-left: 1px solid rgba(var(--vscode-border-rgb, 128, 128, 128), 0.1);
    padding-left: 0.5rem;
  }

  .json-line {
    display: inline-flex;
    align-items: center;
    padding: 0.1rem 0.25rem;
    border-radius: 4px;
    transition: background-color 0.15s;
  }

  .json-line:hover {
    background-color: rgba(var(--vscode-editor-foreground-rgb, 255, 255, 255), 0.05);
  }

  .json-container {
    position: relative;
  }

  .json-toggle {
    position: absolute;
    left: -1.25rem;
    top: 0.15rem;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    opacity: 0.5;
    transition: all 0.15s;
    color: var(--vscode-foreground);
  }

  .json-toggle:hover {
    opacity: 1;
    background: rgba(var(--vscode-editor-foreground-rgb, 255, 255, 255), 0.1);
  }

  .toggle-icon {
    width: 12px;
    height: 12px;
    transition: transform 0.15s;
  }

  .toggle-icon.collapsed {
    transform: rotate(-90deg);
  }

  .json-key {
    color: #9cdcfe;
  }

  .json-colon {
    color: var(--vscode-foreground);
    opacity: 0.7;
  }

  .json-comma {
    color: var(--vscode-foreground);
    opacity: 0.5;
  }

  .json-bracket {
    color: var(--vscode-foreground);
    opacity: 0.6;
  }

  .json-string {
    color: #ce9178;
  }

  .json-number {
    color: #b5cea8;
  }

  .json-boolean {
    color: #569cd6;
  }

  .json-null {
    color: #569cd6;
    font-style: italic;
  }

  .json-preview {
    color: var(--vscode-foreground);
    opacity: 0.4;
    font-style: italic;
    cursor: pointer;
    padding: 0 0.25rem;
    transition: opacity 0.15s;
  }

  .json-preview:hover {
    opacity: 0.7;
  }

  .json-children {
    margin-left: 0;
  }

  .closing-bracket {
    display: block;
  }
</style>
