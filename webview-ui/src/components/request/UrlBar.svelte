<script lang="ts">
  import { activeRequest, sendRequest, cancelRequest, isLoading, activeRequestSourceCollection, updateRequestInCollection, activeEnvironment, type HttpMethod } from '../../lib/stores';

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  let isEditingName = false;
  let nameInput: HTMLInputElement;
  let urlInput: HTMLInputElement;
  let highlightDiv: HTMLDivElement;

  // ── Tooltip state ────────────────────────────────────────────────
  let tooltipVisible = false;
  let tooltipText = '';
  let tooltipResolved = '';
  let tooltipIsUnset = false;
  let tooltipX = 0;
  let tooltipY = 0;

  // ── URL variable parsing ─────────────────────────────────────────
  interface UrlSegment {
    text: string;
    isVar: boolean;
    varName: string;
  }

  function parseUrl(url: string): UrlSegment[] {
    const segments: UrlSegment[] = [];
    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(url)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: url.slice(lastIndex, match.index), isVar: false, varName: '' });
      }
      segments.push({ text: match[0], isVar: true, varName: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < url.length) {
      segments.push({ text: url.slice(lastIndex), isVar: false, varName: '' });
    }
    return segments;
  }

  function resolveVar(name: string): string | undefined {
    return $activeEnvironment?.variables.find(v => v.enabled && v.key === name)?.value;
  }

  $: urlSegments = parseUrl($activeRequest.url);

  // Keep highlight div scroll in sync with input scroll
  function syncScroll() {
    if (highlightDiv && urlInput) {
      highlightDiv.scrollLeft = urlInput.scrollLeft;
    }
  }

  // ── Mouse move: find which {{var}} the cursor is over ─────────────
  let measureCanvas: HTMLCanvasElement | null = null;

  function getCharIndexAtX(mouseX: number): number {
    if (!urlInput) return -1;
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (!ctx) return -1;
    const cs = getComputedStyle(urlInput);
    ctx.font = `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`;
    const paddingLeft = parseFloat(cs.paddingLeft);
    // Account for horizontal scroll
    let x = paddingLeft - (urlInput.scrollLeft || 0);
    const url = $activeRequest.url;
    for (let i = 0; i < url.length; i++) {
      const w = ctx.measureText(url[i]).width;
      if (mouseX < x + w / 2) return i;
      x += w;
    }
    return url.length;
  }

  function handleUrlMouseMove(event: MouseEvent) {
    if (!urlInput || !$activeRequest.url) { tooltipVisible = false; return; }
    const rect = urlInput.getBoundingClientRect();
    const charIdx = getCharIndexAtX(event.clientX - rect.left);

    let pos = 0;
    for (const seg of urlSegments) {
      if (seg.isVar && charIdx >= pos && charIdx < pos + seg.text.length) {
        const resolved = resolveVar(seg.varName);
        tooltipIsUnset = resolved === undefined;
        tooltipText = seg.varName;
        tooltipResolved = resolved ?? 'not set';
        // Position tooltip above the input
        tooltipX = event.clientX;
        tooltipY = rect.top - 4;
        tooltipVisible = true;
        return;
      }
      pos += seg.text.length;
    }
    tooltipVisible = false;
  }

  function handleUrlMouseLeave() {
    tooltipVisible = false;
  }

  // ── Other handlers ───────────────────────────────────────────────
  function getMethodClass(method: HttpMethod): string {
    const classes: Record<HttpMethod, string> = {
      GET: 'text-method-get',
      POST: 'text-method-post',
      PUT: 'text-method-put',
      PATCH: 'text-method-patch',
      DELETE: 'text-method-delete',
      HEAD: 'text-method-head',
      OPTIONS: 'text-method-options',
    };
    return classes[method];
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !$isLoading) {
      sendRequest();
    }
  }

  function startEditingName() {
    isEditingName = true;
    setTimeout(() => nameInput?.select(), 0);
  }

  function finishEditingName() {
    isEditingName = false;
    if (!$activeRequest.name.trim()) {
      activeRequest.update(r => ({ ...r, name: 'New Request' }));
    }
    if ($activeRequestSourceCollection) {
      updateRequestInCollection();
    }
  }

  function handleNameKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === 'Escape') {
      finishEditingName();
    }
  }
</script>

<div class="flex flex-col gap-3 p-4 rounded-xl" style="background: var(--bg-glass-md); border: 1px solid var(--border-subtle);">
  <!-- Request Name -->
  <div class="flex items-center gap-2">
    {#if isEditingName}
      <input
        type="text"
        class="text-sm font-medium rounded-md outline-none py-1 px-2 min-w-[200px] transition-all duration-200"
        style="background: var(--bg-glass-md); border: 1px solid rgba(var(--api-primary-rgb),0.45); color: var(--text-primary); box-shadow: 0 0 12px rgba(var(--api-primary-rgb),0.15);"
        bind:this={nameInput}
        bind:value={$activeRequest.name}
        on:blur={finishEditingName}
        on:keydown={handleNameKeyDown}
      />
    {:else}
      <button
        class="flex items-center gap-2 text-sm font-medium text-vscode-foreground/80 hover:text-api-primary transition-colors group px-2 py-1 rounded-md hover:bg-api-primary/10"
        on:click={startEditingName}
        title="Click to rename request"
      >
        <svg class="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-api-primary transition-all duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span class="group-hover:drop-shadow-[0_0_8px_rgba(var(--api-primary-rgb),0.5)] transition-all duration-200">{$activeRequest.name || 'New Request'}</span>
      </button>
    {/if}
    {#if $activeRequestSourceCollection}
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-api-primary/10 text-api-primary border border-api-primary/20 shadow-[0_0_10px_rgba(var(--api-primary-rgb),0.1)]">
        In Collection
      </span>
    {/if}
  </div>

  <!-- URL Bar -->
  <div class="flex items-center gap-3">
  <!-- Method Selector -->
  <select
    class="select font-bold min-w-[110px] text-center {getMethodClass($activeRequest.method)}"
    style="background: var(--bg-glass-md); backdrop-filter: blur(8px); border-color: var(--border-default); font-size: 12px; letter-spacing: 0.04em;"
    bind:value={$activeRequest.method}
  >
    {#each methods as method}
      <option value={method} class={getMethodClass(method)}>{method}</option>
    {/each}
  </select>

  <!-- URL Input with variable highlighting -->
  <div class="flex-1 relative url-field-wrapper">

    <!-- Highlight mirror layer (sits behind the input, mirrors text) -->
    <div
      bind:this={highlightDiv}
      aria-hidden="true"
      class="url-highlight"
    >{#each urlSegments as seg}{#if seg.isVar}<span
          class="var-token {resolveVar(seg.varName) !== undefined ? 'var-resolved' : 'var-unset'}"
        >{seg.text}</span>{:else}{seg.text}{/if}{/each}</div>

    <!-- Actual input — text is transparent so the highlight layer shows through -->
    <input
      type="text"
      class="url-input"
      placeholder="Enter request URL..."
      bind:this={urlInput}
      bind:value={$activeRequest.url}
      on:keydown={handleKeyDown}
      on:scroll={syncScroll}
      on:mousemove={handleUrlMouseMove}
      on:mouseleave={handleUrlMouseLeave}
    />

    {#if $activeRequest.url}
      <button
        class="absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-150 z-20"
        style="color: var(--text-muted);"
        on:mouseenter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'}
        on:mouseleave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'}
        on:click={() => activeRequest.update(r => ({ ...r, url: '' }))}
        title="Clear URL"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>

  <!-- Send/Cancel Button -->
  {#if $isLoading}
    <button
      class="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 min-w-[100px] shadow-[0_0_15px_rgba(239,68,68,0.2)] border border-red-500/30 backdrop-blur-sm transition-all duration-300"
      on:click={cancelRequest}
    >
      <svg class="w-4 h-4 mr-1.5 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
      Cancel
    </button>
  {:else}
    <button
      class="btn btn-primary min-w-[100px] relative overflow-hidden group"
      style="min-width: 88px;"
      on:click={sendRequest}
      disabled={!$activeRequest.url}
    >
      <!-- Shine sweep on hover -->
      <span class="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out" style="background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);"></span>
      <svg class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
      </svg>
      Send
    </button>
  {/if}
  </div>
</div>

<!-- Variable value tooltip — rendered fixed so it's never clipped -->
{#if tooltipVisible}
  <div
    class="var-tooltip"
    style="left: {tooltipX}px; top: {tooltipY}px;"
    aria-hidden="true"
  >
    <span class="var-tooltip-name">&#123;&#123;{tooltipText}&#125;&#125;</span>
    <span class="var-tooltip-arrow">→</span>
    <span class="var-tooltip-value" class:var-tooltip-unset={tooltipIsUnset}>{tooltipResolved}</span>
  </div>
{/if}

<style>
  /* ── URL field wrapper (holds all visual styling) ── */
  .url-field-wrapper {
    position: relative;
    background: var(--bg-glass-md);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    transition: border-color 200ms, box-shadow 200ms;
  }
  .url-field-wrapper:hover {
    border-color: var(--border-strong);
  }
  .url-field-wrapper:focus-within {
    border-color: rgba(var(--api-primary-rgb), 0.6);
    box-shadow: 0 0 0 3px rgba(var(--api-primary-rgb), 0.12);
  }

  /* ── Highlight mirror (behind the input) ──────── */
  .url-highlight {
    position: absolute;
    inset: 0;
    /* MUST exactly match .url-input padding so text overlays pixel-perfectly */
    padding: 0.5rem 2.25rem 0.5rem 0.75rem;
    font-family: var(--vscode-editor-font-family, 'JetBrains Mono', 'Fira Code', 'Consolas', monospace);
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.5; /* must match .url-input line-height */
    white-space: pre;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
    /* Plain text renders in normal color; only var spans get special colors */
    color: var(--text-primary);
    box-sizing: border-box;
  }

  /* ── Variable token base ──────────────────────── */
  :global(.var-token) {
    border-radius: 3px;
    padding: 1px 0;
  }

  /* Variable with a value in the active environment */
  :global(.var-resolved) {
    background: rgba(16, 185, 129, 0.18);  /* emerald tint */
    color: #34d399;
    border-bottom: 1.5px solid rgba(16, 185, 129, 0.45);
    text-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
  }

  /* Variable with no value / env not active */
  :global(.var-unset) {
    background: rgba(245, 158, 11, 0.15);  /* amber tint */
    color: #fbbf24;
    border-bottom: 1.5px dashed rgba(245, 158, 11, 0.5);
    text-shadow: 0 0 6px rgba(245, 158, 11, 0.25);
  }

  /* ── Actual input (fully transparent — wrapper provides visuals) ── */
  .url-input {
    position: relative;
    z-index: 2;
    display: block;
    width: 100%;
    padding: 0.5rem 2.25rem 0.5rem 0.75rem; /* must match .url-highlight */
    font-family: var(--vscode-editor-font-family, 'JetBrains Mono', 'Fira Code', 'Consolas', monospace);
    font-size: 12.5px;
    font-weight: 400;
    letter-spacing: 0.01em;
    line-height: 1.5;
    border-radius: 0.5rem;
    /* KEY: no background or backdrop-filter — those are on the wrapper */
    background: transparent;
    border: none;
    /* TEXT must be transparent so the highlight layer beneath shows through */
    color: transparent;
    caret-color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
  }

  .url-input::placeholder {
    /* Placeholder text IS visible (input text-color doesn't affect placeholder in all browsers) */
    color: var(--text-placeholder);
  }

  /* Make text-selection visible even though text is transparent */
  .url-input::selection {
    background: rgba(var(--api-primary-rgb), 0.3);
    color: transparent;
  }

  /* ── Floating variable tooltip ────────────────── */
  .var-tooltip {
    position: fixed;
    transform: translate(-50%, -100%);
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 11.5px;
    font-family: var(--vscode-font-family, system-ui, sans-serif);
    line-height: 1.4;
    pointer-events: none;
    white-space: nowrap;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    box-shadow: 0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06);
    backdrop-filter: blur(16px);
    animation: tooltip-in 120ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .var-tooltip::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border-default);
    border-bottom: 1px solid var(--border-default);
    transform: translateX(-50%) rotate(45deg);
  }

  .var-tooltip-name {
    font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
    font-size: 11px;
    color: #34d399;
    font-weight: 600;
  }

  .var-tooltip-arrow {
    color: var(--text-muted);
    font-size: 10px;
  }

  .var-tooltip-value {
    color: var(--text-primary);
    font-family: var(--vscode-editor-font-family, 'Consolas', monospace);
    font-size: 11px;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .var-tooltip-value.var-tooltip-unset {
    color: #fbbf24;
    font-style: italic;
  }

  @keyframes tooltip-in {
    from { opacity: 0; transform: translate(-50%, calc(-100% + 6px)); }
    to   { opacity: 1; transform: translate(-50%, -100%); }
  }
</style>